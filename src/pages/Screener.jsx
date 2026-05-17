import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Zap, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { STOCKS } from '../services/stockData';
import { formatMarketCap, formatVolume } from '../services/yahooApi';
import { useQuotes } from '../hooks/useYahoo';

const META = Object.fromEntries(
  Object.values(STOCKS).map(s => [s.symbol, { sector: s.sector, beta: s.beta ?? null }])
);
const SYMBOLS = Object.keys(META);

// ── Preset scanners ────────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: 'breakout',
    label: 'Momentum Breakout',
    emoji: '🚀',
    desc: 'Near 52W high + vol surge',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.25)',
    filter: s => s.rangePct >= 80 && s.volRatio >= 1.3 && s.pct > 0,
    tip: 'Momentum Breakout\n\nTrigger: 52W range position ≥ 80% + volume ≥ 1.3× avg + price up today.\n\nStocks near their yearly high with above-average volume suggest institutional accumulation and trend continuation. Classic setup for swing or momentum entries.\n\nOptions play: Bull Put Spread or Bull Call Spread.',
  },
  {
    id: 'oversold',
    label: 'Oversold Bounce',
    emoji: '📉',
    desc: 'Near 52W low + selling pressure',
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.25)',
    filter: s => s.rangePct <= 25 && s.pct < -1,
    tip: 'Oversold Bounce\n\nTrigger: 52W range position ≤ 25% + down >1% today.\n\nProxy for RSI < 30: stock is near yearly lows under continued selling pressure. Watch for a volume-confirmed reversal candle before entering.\n\nRisk: falling knives can keep falling — wait for confirmation.\nOptions play: Bull Call Spread on bounce signal.',
  },
  {
    id: 'volsurge',
    label: 'Volume Surge',
    emoji: '⚡',
    desc: 'Volume 2× or more above average',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.25)',
    filter: s => s.volRatio >= 2.0,
    tip: 'Volume Surge\n\nTrigger: Today\'s volume ≥ 2× the 10-day average.\n\nAbnormal volume almost always means smart money is active — earnings surprise, news catalyst, institutional buy/sell program, or technical breakout.\n\nDirection matters: combine with price action.\n• Up + vol surge → accumulation / breakout\n• Down + vol surge → distribution / breakdown',
  },
  {
    id: 'near52high',
    label: 'Near 52W High',
    emoji: '🏔️',
    desc: 'Within 3% of yearly high',
    color: '#818cf8',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.25)',
    filter: s => s.week52High > 0 && ((s.week52High - s.price) / s.week52High) <= 0.03,
    tip: 'Near 52-Week High\n\nTrigger: Price within 3% of the 52-week high.\n\nStocks at or near all-time/yearly highs are in strong uptrends. Many breakouts to new highs lead to continuation moves — resistance becomes support.\n\nLook for: high relative volume + tight consolidation near the high.\nAvoid: if overall market is in a downtrend.',
  },
  {
    id: 'value',
    label: 'Value Plays',
    emoji: '💎',
    desc: 'P/E < 20 with upward momentum',
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.25)',
    filter: s => s.pe != null && s.pe > 0 && s.pe < 20 && s.aboveMid,
    tip: 'Value Plays\n\nTrigger: P/E ratio between 1–20 + price above 52W midpoint.\n\nCombines fundamental cheapness with positive price momentum. These are undervalued stocks that the market is starting to re-rate upward.\n\nP/E < 12 = deep value territory\nP/E 12–20 = value zone\n\nBest for: swing trades, covered calls, or long-term position building.',
  },
  {
    id: 'highbeta',
    label: 'High Beta Movers',
    emoji: '🔥',
    desc: 'Beta > 1.5 with strong daily move',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.25)',
    filter: s => (s.beta ?? 0) > 1.5 && Math.abs(s.pct) >= 1.5,
    tip: 'High Beta Movers\n\nTrigger: Beta > 1.5 + absolute daily move ≥ 1.5%.\n\nHigh-beta stocks amplify market moves. When they also have a large day, it signals a short-term momentum opportunity.\n\n• Beta 1.5–2.0 → Aggressive, follows market closely\n• Beta > 2.0 → Very volatile, large directional swings\n\nBest for: day trades and short-duration options.\nOptions play: Long Call/Put or Straddle on high-IV days.',
  },
];

// ── Options strategy inference ─────────────────────────────────────────────────
function deriveOptStrategy(pct, beta, rangePct) {
  const trend = pct > 1 ? 'bull' : pct < -1 ? 'bear' : 'neutral';
  const vol   = beta != null ? (beta > 1.5 ? 'high' : beta < 0.8 ? 'low' : 'med') : 'med';
  const nearHigh = rangePct >= 75;
  const nearLow  = rangePct <= 25;
  if (trend === 'bull' && vol === 'high' && nearHigh) return 'Bull Put Spread';
  if (trend === 'bull' && vol !== 'high')              return 'Bull Call Spread';
  if (trend === 'bull')                                return 'Bull Put Spread';
  if (trend === 'bear' && vol === 'high' && nearLow)  return 'Bear Call Spread';
  if (trend === 'bear' && vol !== 'high')              return 'Bear Put Spread';
  if (trend === 'bear')                                return 'Bear Call Spread';
  if (vol === 'high')                                  return 'Iron Condor';
  return 'Long Straddle';
}

const OPT_COLORS = {
  'Bull Call Spread': '#22c55e',
  'Bull Put Spread':  '#4ade80',
  'Bear Put Spread':  '#f87171',
  'Bear Call Spread': '#ef4444',
  'Iron Condor':      '#818cf8',
  'Long Straddle':    '#fbbf24',
};

const SECTORS = ['All','Technology','Financials','Healthcare','Consumer Cyclical',
  'Consumer Defensive','Communication Services','Industrials','Energy','Materials',
  'Real Estate','Utilities'];

const CAP_TIERS = [
  { label: 'Any Cap',    min: 0,     max: Infinity },
  { label: 'Mega (>$200B)', min: 200e9, max: Infinity },
  { label: 'Large ($10–200B)', min: 10e9, max: 200e9 },
  { label: 'Mid ($2–10B)',  min: 2e9, max: 10e9 },
  { label: 'Small (<$2B)',  min: 0,   max: 2e9 },
];

const DEFAULT_FILTERS = {
  sector: 'All', capTier: 0,
  minPct: '', maxPct: '',
  minPrice: '', maxPrice: '',
  minPE: '', maxPE: '',
  minBeta: '', maxBeta: '',
  volSpike: 'Any',   // Any / 1.5x / 2x / 3x
  rangeBand: 'Any',  // Any / Top25 / Mid / Low25
  trend: 'Any',      // Any / Up / Down
};

// ── Help bubble ───────────────────────────────────────────────────────────────
function HelpBubble({ text, wide }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 3 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 13, height: 13, borderRadius: '50%',
          background: '#1f2937', color: '#6b7280',
          fontSize: 9, fontWeight: 700, cursor: 'default',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #374151', flexShrink: 0,
        }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', top: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: '#111827', border: '1px solid #374151',
          borderRadius: 8, color: '#d1d5db', fontSize: 11,
          lineHeight: 1.6, padding: '8px 12px',
          width: wide ? 300 : 240, zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          whiteSpace: 'pre-line', pointerEvents: 'none',
        }}>{text}</span>
      )}
    </span>
  );
}

function Badge({ color, bg, tip, children }) {
  const [show, setShow] = useState(false);
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center',
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
        color, background: bg, cursor: 'default', whiteSpace: 'nowrap',
      }}>
      {children}
      {show && (
        <span style={{
          position: 'absolute', top: '130%', left: '50%',
          transform: 'translateX(-50%)',
          background: '#111827', border: '1px solid #374151',
          borderRadius: 8, color: '#d1d5db', fontSize: 11,
          lineHeight: 1.6, padding: '10px 13px', width: 270,
          zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          whiteSpace: 'pre-line', pointerEvents: 'none', fontWeight: 400,
        }}>{tip}</span>
      )}
    </span>
  );
}

function Skeleton() {
  return (
    <tr className="border-b border-[#2a2a2a]">
      {Array(11).fill(0).map((_, i) => (
        <td key={i} className="py-3 px-3">
          <div className="h-3 bg-[#2a2a2a] rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}px` }} />
        </td>
      ))}
    </tr>
  );
}

function RangeBar({ pct, color = '#6366f1' }) {
  const clamped = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden relative">
        <div className="h-full rounded-full" style={{ width: `${clamped}%`, background: color }} />
      </div>
      <span className="text-[10px] text-gray-500 font-mono w-7">{clamped.toFixed(0)}%</span>
    </div>
  );
}

export default function Screener() {
  const [activePreset, setActivePreset] = useState(null);
  const [filters, setFilters]           = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy]             = useState('marketCap');
  const [sortDir, setSortDir]           = useState('desc');

  const { data: quotes = [], loading } = useQuotes(SYMBOLS, { refreshMs: 60_000 });

  const allStocks = useMemo(() =>
    quotes.map(q => {
      const beta      = META[q.symbol]?.beta ?? q.beta ?? null;
      const sector    = META[q.symbol]?.sector ?? '—';
      const volRatio  = q.avgVolume > 0 ? q.volume / q.avgVolume : 0;
      const range     = (q.week52High ?? 0) - (q.week52Low ?? 0);
      const rangePct  = range > 0 ? ((q.price - (q.week52Low ?? 0)) / range) * 100 : 0;
      const aboveMid  = rangePct > 50;
      const fromHigh  = q.week52High > 0 ? ((q.week52High - q.price) / q.week52High) * 100 : null;
      const fromLow   = q.week52Low > 0 ? ((q.price - q.week52Low) / q.week52Low) * 100 : null;
      const atrPct    = q.high && q.low && q.price ? ((q.high - q.low) / q.price) * 100 : null;
      const optStrategy = deriveOptStrategy(q.pct ?? 0, beta, rangePct);

      // Signals
      const pct = q.pct ?? 0;
      const sigBreakout     = rangePct >= 80 && volRatio >= 1.3 && pct > 0;
      const sigOversold     = rangePct <= 25 && pct < -1;
      const sigVolSurge     = volRatio >= 2.0;
      const sigNear52H      = q.week52High > 0 && ((q.week52High - q.price) / q.week52High) <= 0.03;
      const sigNew52H       = q.week52High > 0 && ((q.week52High - q.price) / q.week52High) <= 0.005;
      const sigValue        = q.pe != null && q.pe > 0 && q.pe < 20;
      const sigDeepValue    = q.pe != null && q.pe > 0 && q.pe < 12;
      const sigMomentum     = aboveMid && pct > 0 && !sigBreakout;
      const sigAccumulation = volRatio >= 1.5 && pct > 0.5;
      const sigDistribution = volRatio >= 1.5 && pct < -0.5;
      const sigReversal     = pct < -3 && rangePct > 50;
      const sigHighATR      = atrPct != null && atrPct > 3;
      const sigDefensive    = (beta ?? 1) < 0.7 && q.pe != null && q.pe > 0;

      return {
        ...q, beta, sector, volRatio, rangePct, aboveMid,
        fromHigh, fromLow, atrPct, optStrategy,
        sigBreakout, sigOversold, sigVolSurge, sigNear52H, sigNew52H,
        sigValue, sigDeepValue, sigMomentum,
        sigAccumulation, sigDistribution, sigReversal, sigHighATR, sigDefensive,
      };
    }),
    [quotes],
  );

  const filtered = useMemo(() => {
    let r = activePreset
      ? allStocks.filter(PRESETS.find(p => p.id === activePreset)?.filter ?? (() => true))
      : allStocks;

    const f = filters;
    if (f.sector !== 'All')  r = r.filter(s => s.sector === f.sector);
    if (f.capTier > 0) {
      const { min, max } = CAP_TIERS[f.capTier];
      r = r.filter(s => s.marketCap >= min && s.marketCap < max);
    }
    if (f.minPct)   r = r.filter(s => (s.pct ?? 0) >= +f.minPct);
    if (f.maxPct)   r = r.filter(s => (s.pct ?? 0) <= +f.maxPct);
    if (f.minPrice) r = r.filter(s => s.price >= +f.minPrice);
    if (f.maxPrice) r = r.filter(s => s.price <= +f.maxPrice);
    if (f.minPE)    r = r.filter(s => s.pe != null && s.pe > 0 && s.pe >= +f.minPE);
    if (f.maxPE)    r = r.filter(s => s.pe != null && s.pe > 0 && s.pe <= +f.maxPE);
    if (f.minBeta)  r = r.filter(s => s.beta != null && s.beta >= +f.minBeta);
    if (f.maxBeta)  r = r.filter(s => s.beta != null && s.beta <= +f.maxBeta);
    if (f.volSpike === '1.5x') r = r.filter(s => s.volRatio >= 1.5);
    if (f.volSpike === '2x')   r = r.filter(s => s.volRatio >= 2.0);
    if (f.volSpike === '3x')   r = r.filter(s => s.volRatio >= 3.0);
    if (f.rangeBand === 'Top25') r = r.filter(s => s.rangePct >= 75);
    if (f.rangeBand === 'Mid')   r = r.filter(s => s.rangePct > 25 && s.rangePct < 75);
    if (f.rangeBand === 'Low25') r = r.filter(s => s.rangePct <= 25);
    if (f.trend === 'Up')   r = r.filter(s => (s.pct ?? 0) > 0);
    if (f.trend === 'Down') r = r.filter(s => (s.pct ?? 0) < 0);

    return [...r].sort((a, b) => {
      const av = a[sortBy] ?? -Infinity;
      const bv = b[sortBy] ?? -Infinity;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [allStocks, activePreset, filters, sortBy, sortDir]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  function setFilter(key, val) { setFilters(p => ({ ...p, [key]: val })); }

  function resetAll() {
    setFilters(DEFAULT_FILTERS);
    setActivePreset(null);
    setSortBy('marketCap');
    setSortDir('desc');
  }

  const hasActiveFilters = activePreset || Object.entries(filters).some(([k, v]) =>
    v !== DEFAULT_FILTERS[k]
  );

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-gray-700 ml-0.5">↕</span>;
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="inline ml-0.5 text-indigo-400" />
      : <ChevronUp   size={12} className="inline ml-0.5 text-indigo-400" />;
  };

  const Th = ({ col, children, right }) => (
    <th onClick={() => toggleSort(col)}
      className={`py-3 px-3 text-xs font-semibold whitespace-nowrap cursor-pointer select-none
        hover:text-white transition-colors ${right ? 'text-right' : 'text-left'}
        ${sortBy === col ? 'text-indigo-400' : 'text-gray-500'}`}>
      {children}<SortIcon col={col} />
    </th>
  );

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Stock Screener</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? 'Loading real-time quotes…' : `${filtered.length} of ${allStocks.length} stocks`}
            {!loading && <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse ml-2 align-middle" />}
          </p>
        </div>
        {hasActiveFilters && (
          <button onClick={resetAll}
            className="flex items-center gap-1.5 text-xs text-gray-400 border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:text-white hover:border-gray-500 transition-colors">
            <RotateCcw size={12} /> Reset all
          </button>
        )}
      </div>

      {/* ── Preset scanners ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-5">
        {PRESETS.map(p => {
          const active = activePreset === p.id;
          const count  = !loading ? allStocks.filter(p.filter).length : null;
          return (
            <button key={p.id}
              onClick={() => setActivePreset(active ? null : p.id)}
              style={{
                background: active ? p.bg : 'rgba(26,26,26,1)',
                border: `1px solid ${active ? p.border : '#2a2a2a'}`,
                boxShadow: active ? `0 0 0 1px ${p.border}` : 'none',
              }}
              className="rounded-xl p-3 text-left transition-all hover:border-opacity-60 group">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-base">{p.emoji}</span>
                <div className="flex items-center gap-1">
                  {count !== null && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ color: p.color, background: `${p.color}18` }}>
                      {count}
                    </span>
                  )}
                  <HelpBubble text={p.tip} />
                </div>
              </div>
              <div className="text-white text-xs font-semibold leading-tight mb-0.5">{p.label}</div>
              <div className="text-gray-600 text-[10px] leading-tight">{p.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">

          {/* Sector */}
          <div className="lg:col-span-2">
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Sector</label>
            <select value={filters.sector} onChange={e => setFilter('sector', e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500">
              {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Market Cap */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Market Cap</label>
            <select value={filters.capTier} onChange={e => setFilter('capTier', +e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500">
              {CAP_TIERS.map((c, i) => <option key={i} value={i}>{c.label}</option>)}
            </select>
          </div>

          {/* % Change */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">% Change</label>
            <div className="flex gap-1">
              <input type="number" placeholder="Min" value={filters.minPct}
                onChange={e => setFilter('minPct', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
              <input type="number" placeholder="Max" value={filters.maxPct}
                onChange={e => setFilter('maxPct', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Price ($)</label>
            <div className="flex gap-1">
              <input type="number" placeholder="Min" value={filters.minPrice}
                onChange={e => setFilter('minPrice', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
              <input type="number" placeholder="Max" value={filters.maxPrice}
                onChange={e => setFilter('maxPrice', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
            </div>
          </div>

          {/* P/E */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">P/E Ratio</label>
            <div className="flex gap-1">
              <input type="number" placeholder="Min" value={filters.minPE}
                onChange={e => setFilter('minPE', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
              <input type="number" placeholder="Max" value={filters.maxPE}
                onChange={e => setFilter('maxPE', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
            </div>
          </div>

          {/* Beta */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Beta</label>
            <div className="flex gap-1">
              <input type="number" step="0.1" placeholder="Min" value={filters.minBeta}
                onChange={e => setFilter('minBeta', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
              <input type="number" step="0.1" placeholder="Max" value={filters.maxBeta}
                onChange={e => setFilter('maxBeta', e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-700" />
            </div>
          </div>
        </div>

        {/* Second row: quick toggles */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[#2a2a2a]">
          {/* Trend */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Trend:</span>
            {['Any','Up','Down'].map(t => (
              <button key={t} onClick={() => setFilter('trend', t)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  filters.trend === t
                    ? t === 'Up' ? 'bg-green-500/15 border-green-500/40 text-green-400'
                      : t === 'Down' ? 'bg-red-500/15 border-red-500/40 text-red-400'
                      : 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>{t === 'Up' ? '▲ Up' : t === 'Down' ? '▼ Down' : t}</button>
            ))}
          </div>

          {/* Vol Spike */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Vol Spike:</span>
            {['Any','1.5x','2x','3x'].map(v => (
              <button key={v} onClick={() => setFilter('volSpike', v)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  filters.volSpike === v
                    ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
                    : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>{v === 'Any' ? 'Any' : `≥${v}`}</button>
            ))}
          </div>

          {/* 52W Range band */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">52W Position:</span>
            {[
              { k: 'Any',   l: 'Any' },
              { k: 'Top25', l: '🔝 Top 25%' },
              { k: 'Mid',   l: 'Mid Range' },
              { k: 'Low25', l: '📉 Low 25%' },
            ].map(({ k, l }) => (
              <button key={k} onClick={() => setFilter('rangeBand', k)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  filters.rangeBand === k
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                    : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results table ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-[#2a2a2a]">
              <th className="text-left py-3 px-3 pl-5 text-xs font-semibold text-gray-500 w-40">Symbol</th>
              <Th col="price" right>Price</Th>
              <Th col="pct">Change</Th>
              <Th col="marketCap">Mkt Cap</Th>
              <th className="py-3 px-3 text-xs font-semibold text-gray-500 text-left cursor-pointer select-none hover:text-white whitespace-nowrap"
                onClick={() => toggleSort('pe')}>
                P/E<SortIcon col="pe" />
                <HelpBubble text={"Price-to-Earnings ratio.\n\n• < 12 → Deep value (undervalued)\n• 12–20 → Value zone\n• 20–40 → Fair / growth\n• > 40 → Expensive / high-growth\n\nNegative or N/A = company not profitable."} />
              </th>
              <th className="py-3 px-3 text-xs font-semibold text-gray-500 text-left cursor-pointer select-none hover:text-white"
                onClick={() => toggleSort('beta')}>
                Beta<SortIcon col="beta" />
                <HelpBubble text={"Measures how volatile a stock is relative to the market.\n\n• Beta < 0.7 → Defensive (moves less than market)\n• Beta 0.7–1.3 → In-line with market\n• Beta 1.3–2 → High momentum / volatility\n• Beta > 2 → Very aggressive, large swings\n\nHigh-beta stocks amplify both gains and losses."} />
              </th>
              <th className="py-3 px-3 text-xs font-semibold text-gray-500 text-left cursor-pointer select-none hover:text-white whitespace-nowrap"
                onClick={() => toggleSort('volRatio')}>
                Vol Ratio<SortIcon col="volRatio" />
                <HelpBubble text={"Today's volume ÷ 10-day average volume.\n\n• < 1× → Below-average activity\n• 1–1.5× → Normal\n• 1.5–2× → Elevated (watch for direction)\n• 2×+ → Surge — institutional activity, news catalyst, or breakout\n• 3×+ → Extreme — major event likely\n\nVol spike + price up = accumulation signal.\nVol spike + price down = distribution / sell-off."} wide />
              </th>
              <th className="py-3 px-3 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">
                52W Position
                <HelpBubble text={"Where the current price sits within the 52-week high/low range.\n\n• Top 25% (75–100%) → Strong trend, near highs\n• Middle (25–75%) → Neutral zone\n• Bottom 25% (0–25%) → Weak trend, near lows\n\nUse with volume to confirm breakouts or spot oversold bounces."} wide />
              </th>
              <th className="py-3 px-3 text-xs font-semibold text-gray-500 text-left cursor-pointer select-none hover:text-white whitespace-nowrap"
                onClick={() => toggleSort('fromHigh')}>
                From High<SortIcon col="fromHigh" />
                <HelpBubble text={"How far the stock is below its 52-week high.\n\n• 0–3% → Testing all-time resistance / breakout zone\n• 3–10% → Still near highs (strong trend)\n• 10–30% → Correction / pullback opportunity\n• > 30% → Significant drawdown\n\nSmall values + vol surge = breakout setup.\nLarge values + low P/E = deep value opportunity."} wide />
              </th>
              <th className="py-3 px-3 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">
                Strategy
                <HelpBubble text={"Suggested options strategy based on trend direction, beta (volatility), and 52W range position.\n\nBull Call Spread → moderately bullish, limited risk\nBull Put Spread → bullish + collect premium\nBear Put Spread → moderately bearish\nBear Call Spread → bearish + collect premium\nIron Condor → neutral, high IV, range-bound\nLong Straddle → expecting big move, direction unknown"} wide />
              </th>
              <th className="py-3 px-3 pr-5 text-xs font-semibold text-gray-500 text-left">
                Signals
                <HelpBubble text={"Automated signals derived from price action, volume, and fundamentals. Multiple signals can appear on one stock."} />
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array(12).fill(0).map((_, i) => <Skeleton key={i} />)
              : filtered.length === 0
              ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-gray-600">
                    No stocks match the current filters.
                  </td>
                </tr>
              )
              : filtered.map(s => {
                  const up = (s.pct ?? 0) >= 0;
                  const volColor = s.volRatio >= 3 ? '#f87171' : s.volRatio >= 2 ? '#fbbf24' : s.volRatio >= 1.5 ? '#a3e635' : '#6b7280';
                  const rangeColor = s.rangePct >= 75 ? '#22c55e' : s.rangePct <= 25 ? '#ef4444' : '#818cf8';
                  return (
                    <tr key={s.symbol}
                      className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/[0.03] transition-colors">

                      {/* Symbol */}
                      <td className="py-3 px-3 pl-5">
                        <Link to={`/stock/${s.symbol}`}
                          className="text-white font-bold text-sm hover:text-indigo-400 transition-colors">
                          {s.symbol}
                        </Link>
                        <div className="text-gray-600 text-[10px] truncate max-w-[120px]">{s.sector}</div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 text-right text-white font-mono text-sm font-semibold">
                        ${s.price?.toFixed(2) ?? '—'}
                      </td>

                      {/* % Change */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${
                          up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                          {up ? '+' : ''}{(s.pct ?? 0).toFixed(2)}%
                        </span>
                      </td>

                      {/* Market Cap */}
                      <td className="py-3 px-3 text-gray-400 text-xs font-mono">{formatMarketCap(s.marketCap)}</td>

                      {/* P/E */}
                      <td className="py-3 px-3 text-xs font-mono">
                        {s.pe != null && s.pe > 0
                          ? <span className={s.pe < 20 ? 'text-green-400' : s.pe > 50 ? 'text-red-400' : 'text-gray-300'}>
                              {s.pe.toFixed(1)}
                            </span>
                          : <span className="text-gray-700">—</span>}
                      </td>

                      {/* Beta */}
                      <td className="py-3 px-3 text-xs font-mono">
                        {s.beta != null
                          ? <span className={s.beta > 1.5 ? 'text-orange-400' : s.beta < 0.5 ? 'text-blue-400' : 'text-gray-300'}>
                              {s.beta.toFixed(2)}
                            </span>
                          : <span className="text-gray-700">—</span>}
                      </td>

                      {/* Vol Ratio */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-semibold" style={{ color: volColor }}>
                            {s.volRatio > 0 ? `${s.volRatio.toFixed(1)}×` : '—'}
                          </span>
                          {s.volRatio >= 1.5 && (
                            <Zap size={10} style={{ color: volColor }} />
                          )}
                        </div>
                        <div className="text-[10px] text-gray-600 font-mono">{formatVolume(s.volume)}</div>
                      </td>

                      {/* 52W Position bar */}
                      <td className="py-3 px-3">
                        <RangeBar pct={s.rangePct} color={rangeColor} />
                        <div className="text-[10px] text-gray-700 mt-0.5">
                          {s.week52Low ? `$${s.week52Low.toFixed(0)}` : ''}
                          {s.week52High && s.week52Low ? ' – ' : ''}
                          {s.week52High ? `$${s.week52High.toFixed(0)}` : ''}
                        </div>
                      </td>

                      {/* From 52W High */}
                      <td className="py-3 px-3 text-xs font-mono">
                        {s.fromHigh != null
                          ? <span className={s.fromHigh <= 3 ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                              -{s.fromHigh.toFixed(1)}%
                            </span>
                          : <span className="text-gray-700">—</span>}
                      </td>

                      {/* Options Strategy */}
                      <td className="py-3 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap font-medium"
                          style={{
                            color: OPT_COLORS[s.optStrategy] ?? '#818cf8',
                            background: `${OPT_COLORS[s.optStrategy] ?? '#818cf8'}18`,
                          }}>
                          {s.optStrategy}
                        </span>
                      </td>

                      {/* Signals */}
                      <td className="py-3 px-3 pr-5">
                        <div className="flex gap-1 flex-wrap max-w-[220px]">
                          {s.sigNew52H && (
                            <Badge color="#a3e635" bg="#a3e63514" tip={"New 52W High\n\nStock is within 0.5% of its 52-week high — effectively at a new yearly high.\n\nStrong bullish signal: buyers are in full control. Watch for continuation or short-term pullback for entry."}>
                              🆕 52W High
                            </Badge>
                          )}
                          {s.sigBreakout && !s.sigNew52H && (
                            <Badge color="#22c55e" bg="#22c55e14" tip={"Momentum Breakout\n\nPrice in top 20% of 52W range + vol ≥ 1.3× avg + positive price action.\n\nIndicates institutional buying with strong trend momentum. Common setup for continuation moves.\n\nOptions: Bull Put Spread or Bull Call Spread."}>
                              🚀 Breakout
                            </Badge>
                          )}
                          {s.sigAccumulation && (
                            <Badge color="#4ade80" bg="#4ade8014" tip={"Accumulation\n\nVol ≥ 1.5× average on a positive day — suggests institutional buying.\n\nWhen large players accumulate quietly, volume spikes on up days and is light on down days. A sustained accumulation pattern often precedes big moves."}>
                              📦 Accum.
                            </Badge>
                          )}
                          {s.sigMomentum && (
                            <Badge color="#818cf8" bg="#818cf814" tip={"Momentum\n\nPrice is above the 52W midpoint and moving up today.\n\nProxy for RSI > 50: stock is in the upper half of its yearly range and has positive near-term price action. Favors long entries on pullbacks."}>
                              📈 Momentum
                            </Badge>
                          )}
                          {s.sigNear52H && !s.sigBreakout && !s.sigNew52H && (
                            <Badge color="#34d399" bg="#34d39914" tip={"Near 52W High\n\nWithin 3% of the 52-week high — approaching key resistance.\n\nIf combined with high volume, it may be a breakout attempt. If volume is low, it may stall. Watch for confirmation before entering."}>
                              🏔 Near High
                            </Badge>
                          )}
                          {s.sigDistribution && (
                            <Badge color="#f87171" bg="#f8717114" tip={"Distribution\n\nVol ≥ 1.5× average on a negative day — suggests institutional selling.\n\nWhen large players exit positions, volume spikes on down days. Often seen at market tops before significant pullbacks. Bearish caution signal."}>
                              📤 Distrib.
                            </Badge>
                          )}
                          {s.sigOversold && (
                            <Badge color="#fb923c" bg="#fb923c14" tip={"Oversold\n\nPrice in the bottom 25% of the 52W range and falling today.\n\nProxy for RSI < 30: stock is deeply discounted vs its yearly range. Potential bounce candidate — but confirm with volume before entering, as falling knives can keep falling."}>
                              📉 Oversold
                            </Badge>
                          )}
                          {s.sigReversal && (
                            <Badge color="#f59e0b" bg="#f59e0b14" tip={"Reversal Setup\n\nStock is down 3%+ today BUT sits in the upper half of its 52W range — suggesting the drop may be temporary rather than a trend break.\n\nLook for high volume + a bullish candle close as confirmation. Often a good risk/reward entry for counter-trend trades."}>
                              🔄 Reversal
                            </Badge>
                          )}
                          {s.sigHighATR && (
                            <Badge color="#e879f9" bg="#e879f914" tip={"High ATR Day\n\nToday's price range (High − Low) is more than 3% of the stock price — indicating elevated intraday volatility.\n\nHigh ATR days are ideal for options sellers (inflated premium) and day traders seeking wide range opportunities. Risky for swing entries due to wider stops needed."}>
                              📊 High ATR
                            </Badge>
                          )}
                          {s.sigVolSurge && (
                            <Badge color="#fbbf24" bg="#fbbf2414" tip={"Volume Surge\n\nToday's volume is 2× or more above the 10-day average.\n\nUnusual volume signals institutional activity: earnings reactions, news catalysts, analyst upgrades, or insider moves. Combine with price direction to determine whether it's accumulation (up) or distribution (down)."}>
                              ⚡ Vol×2
                            </Badge>
                          )}
                          {s.sigDeepValue && (
                            <Badge color="#38bdf8" bg="#38bdf814" tip={"Deep Value\n\nP/E ratio below 12 — the stock is trading at a significant discount to historical market averages.\n\nTypically found in cyclical companies at the bottom of their cycle, out-of-favor sectors, or overlooked small-caps. High reward potential but requires patience and fundamental conviction."}>
                              💎💎 Deep Value
                            </Badge>
                          )}
                          {s.sigValue && !s.sigDeepValue && (
                            <Badge color="#60a5fa" bg="#60a5fa14" tip={"Value Stock\n\nP/E ratio between 12 and 20 — reasonable valuation compared to historical market P/E of ~16–18.\n\nSuggests the stock isn't priced for perfection. Less downside risk from valuation contraction. Often outperforms over long horizons vs high-multiple growth stocks."}>
                              💎 Value
                            </Badge>
                          )}
                          {s.sigDefensive && (
                            <Badge color="#94a3b8" bg="#94a3b814" tip={"Defensive\n\nBeta below 0.7 with positive P/E — stock moves significantly less than the broad market.\n\nTypical of utilities, consumer staples, and healthcare. Ideal during uncertain markets or for risk-averse portfolios. Lower volatility also means smaller options premiums."}>
                              🛡 Defensive
                            </Badge>
                          )}
                          {!s.sigNew52H && !s.sigBreakout && !s.sigAccumulation && !s.sigMomentum &&
                           !s.sigNear52H && !s.sigDistribution && !s.sigOversold && !s.sigReversal &&
                           !s.sigHighATR && !s.sigVolSurge && !s.sigDeepValue && !s.sigValue && !s.sigDefensive && (
                            <span className="text-gray-700 text-[9px]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <div className="text-gray-600 text-xs text-right mt-2">
          Showing {filtered.length} stock{filtered.length !== 1 ? 's' : ''}
          {hasActiveFilters ? ' · filters active' : ''}
        </div>
      )}
    </div>
  );
}
