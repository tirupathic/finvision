import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTabs } from '../context/TabsContext';
import SymbolTabBar from '../components/SymbolTabBar';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, Cell,
  PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Star, Share2, Bell, ArrowLeft,
  ExternalLink, Loader2, AlertCircle,
} from 'lucide-react';
import { useChart, useQuote, useSummary, useEarnings, useNews, useInstitutional } from '../hooks/useYahoo';
import { usePersistedRange } from '../hooks/usePersistedRange';
import { formatMarketCap, formatVolume, fmt$, colorClass, signStr } from '../services/yahooApi';
import { generateOptionsChain } from '../services/stockData';
import { ETF_SET, ETF_INFO } from '../services/etfData';
import { getSegments } from '../services/revenueSegments';
import NewsCard from '../components/NewsCard';
import PerformanceTab from '../components/PerformanceTab';
import StrategiesTab from '../components/StrategiesTab';
import AdvancedChart from '../components/AdvancedChart';
import RollingReturnProbability from '../components/RollingReturnProbability';

const RANGES = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y'];
const RANGE_MAP = {
  '1D': { interval: '5m',  range: '1d'  },
  '5D': { interval: '30m', range: '5d'  },
  '1M': { interval: '1d',  range: '1mo' },
  '3M': { interval: '1d',  range: '3mo' },
  '6M': { interval: '1d',  range: '6mo' },
  '1Y': { interval: '1d',  range: '1y'  },
  '2Y': { interval: '1wk', range: '2y'  },
  '3Y': { interval: '1wk', range: '3y'  },
  'YTD':{ interval: '1d',  range: 'ytd' },
  '5Y': { interval: '1wk', range: '5y'  },
};

function Skeleton({ className = '' }) {
  return <div className={`bg-[#2a2a2a] rounded-md animate-pulse ${className}`} />;
}

// ── Technical indicator helpers ───────────────────────────────────────────────

function computeRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  const avgG = gains / period, avgL = losses / period;
  if (avgL === 0) return 100;
  return 100 - (100 / (1 + avgG / avgL));
}

function computeMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((s, v) => s + v, 0) / period;
}

function computeATR(ohlcv, period = 14) {
  if (ohlcv.length < period + 1) return null;
  const trs = ohlcv.slice(1).map((d, i) => {
    const pc = ohlcv[i].close;
    return Math.max(d.high - d.low, Math.abs(d.high - pc), Math.abs(d.low - pc));
  });
  return trs.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function pctFrom(closes, lookback) {
  if (closes.length <= lookback) return null;
  const base = closes[closes.length - 1 - lookback];
  const cur  = closes[closes.length - 1];
  return base > 0 ? ((cur - base) / base) * 100 : null;
}

function HelpBubble({ tip }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 3 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          width: 13, height: 13, borderRadius: '50%',
          background: '#374151', color: '#9ca3af',
          fontSize: 9, fontWeight: 700, cursor: 'default',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid #4b5563', flexShrink: 0,
        }}>?</span>
      {show && (
        <span style={{
          position: 'absolute', top: '120%', left: '50%', transform: 'translateX(-50%)',
          background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
          color: '#d1d5db', fontSize: 11, lineHeight: 1.6,
          padding: '10px 13px', width: 280, zIndex: 50,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          whiteSpace: 'pre-line', pointerEvents: 'none',
        }}>{tip}</span>
      )}
    </span>
  );
}

function StatRow({ label, value, valueClass = 'text-white' }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm font-mono ${valueClass}`}>{value ?? '—'}</span>
    </div>
  );
}

function OptionsTable({ data }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-[#2a2a2a]">
            <th className="text-left py-2 px-2 text-green-500" colSpan={5}>CALLS</th>
            <th className="text-center py-2 px-3 text-white bg-[#111] rounded">Strike</th>
            <th className="text-left py-2 px-2 text-red-400" colSpan={5}>PUTS</th>
          </tr>
          <tr className="text-gray-500 text-[10px] border-b border-[#2a2a2a]">
            <th className="text-left py-1.5 px-2">Bid</th>
            <th className="text-left py-1.5 px-2">Ask</th>
            <th className="text-left py-1.5 px-2">IV%</th>
            <th className="text-left py-1.5 px-2">OI</th>
            <th className="text-left py-1.5 px-2">Delta</th>
            <th></th>
            <th className="text-left py-1.5 px-2">Bid</th>
            <th className="text-left py-1.5 px-2">Ask</th>
            <th className="text-left py-1.5 px-2">IV%</th>
            <th className="text-left py-1.5 px-2">OI</th>
            <th className="text-left py-1.5 px-2">Delta</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={row.strike}
              className={`border-b border-[#2a2a2a] last:border-0 hover:bg-white/5 ${row.itm ? 'bg-green-500/5' : ''}`}>
              <td className="py-1.5 px-2 text-green-400 font-mono">{row.callBid}</td>
              <td className="py-1.5 px-2 text-green-300 font-mono">{row.callAsk}</td>
              <td className="py-1.5 px-2 text-gray-400 font-mono">{row.callIV}%</td>
              <td className="py-1.5 px-2 text-gray-400 font-mono">{row.callOI.toLocaleString()}</td>
              <td className="py-1.5 px-2 text-gray-400 font-mono">{row.callDelta}</td>
              <td className="py-1.5 px-3 text-center font-bold text-white bg-[#111] rounded text-sm">{row.strike}</td>
              <td className="py-1.5 px-2 text-red-400 font-mono">{row.putBid}</td>
              <td className="py-1.5 px-2 text-red-300 font-mono">{row.putAsk}</td>
              <td className="py-1.5 px-2 text-gray-400 font-mono">{row.putIV}%</td>
              <td className="py-1.5 px-2 text-gray-400 font-mono">{row.putOI.toLocaleString()}</td>
              <td className="py-1.5 px-2 text-gray-400 font-mono">{row.putDelta}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RangeSelector({ range, onChange }) {
  return (
    <div className="flex gap-1">
      {RANGES.map(r => (
        <button key={r} onClick={() => onChange(r)}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${r === range ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
          {r}
        </button>
      ))}
    </div>
  );
}

function PriceChart({ ohlcv, symbol, color }) {
  const { min, max } = useMemo(() => {
    let mn = Infinity, mx = -Infinity;
    for (const d of ohlcv) {
      if (d.price < mn) mn = d.price;
      if (d.price > mx) mx = d.price;
    }
    return { min: mn * 0.998, max: mx * 1.002 };
  }, [ohlcv]);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={ohlcv} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false}
          tickFormatter={d => d.slice(5)} interval={Math.floor(ohlcv.length / 6)} />
        <YAxis domain={[min, max]} tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false}
          axisLine={false} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(0)}`} width={58} />
        <Tooltip
          contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          formatter={v => [fmt$(v), symbol]}
        />
        <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2}
          fill="url(#cg)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const SYM = symbol?.toUpperCase();
  const navigate = useNavigate();

  const [range, setRange]   = usePersistedRange(RANGES, '3M');
  const [tab, setTab]       = useState(() => sessionStorage.getItem(`fv_tab_${SYM}`) || 'overview');
  const [starred, setStarred] = useState(false);
  const [selExp, setSelExp] = useState(30);

  function changeTab(t) {
    setTab(t);
    sessionStorage.setItem(`fv_tab_${SYM}`, t);
  }

  const { addTab } = useTabs();
  useEffect(() => { if (SYM) addTab(SYM); }, [SYM]);

  const { interval, range: yfRange } = RANGE_MAP[range];

  // ── Real data hooks ──────────────────────────────────────────────────────────
  const { data: chartData, loading: chartLoading, error: chartError } =
    useChart(SYM, interval, yfRange, { refreshMs: 15_000 });

  const { data: summary, loading: summaryLoading } =
    useSummary(SYM);

  const { data: quoteData } =
    useQuote(SYM);

  const { data: earnings, loading: earningsLoading } =
    useEarnings(SYM);

  const { data: news, loading: newsLoading } =
    useNews(SYM, 10);

  const { data: institutional, loading: instLoading } =
    useInstitutional(SYM);

  const options = useMemo(
    () => chartData ? generateOptionsChain(chartData.price) : [],
    [chartData?.price]
  );

  // ── Derived values ───────────────────────────────────────────────────────────
  const q = chartData;
  const s = summary;

  // ── Options analytics (derived from chain) ───────────────────────────────────
  const optAnalytics = useMemo(() => {
    if (!options.length || !q?.price) return null;
    const price = q.price;

    // ATM strike
    const atm = options.reduce((b, o) => Math.abs(o.strike - price) < Math.abs(b.strike - price) ? o : b, options[0]);
    const atmIV = (atm.callIV + atm.putIV) / 2;

    // Expected move per expiry (1σ = IV × sqrt(DTE/365) × price)
    const expectedMove = (dte) => +(price * (atmIV / 100) * Math.sqrt(dte / 365)).toFixed(2);

    // Put/Call OI ratio
    const totalCallOI = options.reduce((s, o) => s + o.callOI, 0);
    const totalPutOI  = options.reduce((s, o) => s + o.putOI,  0);
    const pcRatio = totalCallOI > 0 ? +(totalPutOI / totalCallOI).toFixed(2) : null;

    // IV skew: nearest OTM put IV minus nearest OTM call IV
    const otmPuts  = options.filter(o => o.strike < price);
    const otmCalls = options.filter(o => o.strike > price);
    const nearPut  = otmPuts.length  ? otmPuts[otmPuts.length - 1]  : null;
    const nearCall = otmCalls.length ? otmCalls[0] : null;
    const ivSkew   = nearPut && nearCall ? +(nearPut.putIV - nearCall.callIV).toFixed(1) : null;

    // Max pain: strike where total dollar value paid to buyers is minimized
    const maxPainStrike = options.map(candidate => {
      const payout = options.reduce((sum, o) => {
        return sum
          + o.callOI * Math.max(candidate.strike - o.strike, 0)
          + o.putOI  * Math.max(o.strike - candidate.strike, 0);
      }, 0);
      return { strike: candidate.strike, payout };
    }).reduce((min, x) => x.payout < min.payout ? x : min).strike;

    // ATM straddle cost (call ask + put ask)
    const straddleCost = +(atm.callAsk + atm.putAsk).toFixed(2);

    // Gamma risk: peak gamma ~ ATM (rough proxy: 1 / (price × IV/100 × sqrt(1/252)))
    const gammaRisk = +((1 / (price * (atmIV / 100) * Math.sqrt(1 / 252))) / price * 100).toFixed(4);

    // IV Rank proxy: use ATM IV vs min/max IV in chain
    const ivs = options.flatMap(o => [o.callIV, o.putIV]);
    const ivMin = Math.min(...ivs), ivMax = Math.max(...ivs);
    const ivRank = ivMax > ivMin ? +((atmIV - ivMin) / (ivMax - ivMin) * 100).toFixed(0) : null;

    return {
      price, atm, atmIV, expectedMove,
      totalCallOI, totalPutOI, pcRatio,
      nearPut, nearCall, ivSkew,
      maxPainStrike, straddleCost,
      gammaRisk, ivRank,
    };
  }, [options, q?.price]);

  const up = q ? q.pct >= 0 : true;
  const color = up ? '#22c55e' : '#ef4444';

  if (chartError && !q) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-16 text-center">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <p className="text-gray-400 text-lg mb-2">Could not load <span className="text-white font-bold">{SYM}</span></p>
        <p className="text-gray-600 text-sm mb-6">{chartError}</p>
        <Link to="/" className="text-indigo-400 hover:text-indigo-300">← Back to Home</Link>
      </div>
    );
  }

  const isETF = q?.isETF || ETF_SET.has(SYM);
  const etfInfo = ETF_INFO[SYM] ?? null;

  const tabs = isETF
    ? ['overview', 'chart', 'etf', 'holders', 'options', 'return dist', 'performance', 'trade ideas', 'news']
    : ['overview', 'chart', 'financials', 'earnings', 'holders', 'options', 'return dist', 'performance', 'trade ideas', 'news'];

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <SymbolTabBar activeSymbol={SYM} />

      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-gray-500 hover:text-white text-sm mb-4 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <span className="text-indigo-400 font-bold text-sm">{SYM?.slice(0, 2)}</span>
            </div>
            <div>
              {chartLoading && !q ? (
                <>
                  <Skeleton className="w-24 h-5 mb-1" />
                  <Skeleton className="w-40 h-4" />
                </>
              ) : (
                <>
                  <h1 className="text-white text-2xl font-bold">{SYM}</h1>
                  <p className="text-gray-400 text-sm">
                    {q?.name ?? '—'}
                    {s?.sector ? ` · ${s.sector}` : ''}
                    {q?.exchange ? ` · ${q.exchange}` : ''}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Price */}
          {chartLoading && !q ? (
            <div className="mt-2 space-y-2">
              <Skeleton className="w-40 h-10" />
              <Skeleton className="w-48 h-5" />
            </div>
          ) : q ? (
            <div className="mt-2">
              <div className="flex items-baseline gap-3">
                <span className="text-white text-4xl font-bold font-mono">{fmt$(q.price)}</span>
                <div className={`flex items-center gap-1 text-base font-mono ${colorClass(q.pct)}`}>
                  {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {signStr(q.change)} ({signStr(q.pct)}%)
                </div>
              </div>
              <p className="text-gray-600 text-xs mt-1">
                {q.exchange} · Real-time
                <span className="inline-flex items-center gap-1 ml-2">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  Live
                </span>
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setStarred(!starred)}
            className={`p-2 rounded-lg border transition-colors ${starred ? 'border-yellow-500 text-yellow-400' : 'border-[#2a2a2a] text-gray-500 hover:border-gray-500 hover:text-white'}`}>
            <Star size={16} fill={starred ? 'currentColor' : 'none'} />
          </button>
          <button className="p-2 rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-white transition-colors">
            <Bell size={16} />
          </button>
          <button className="p-2 rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-white transition-colors">
            <Share2 size={16} />
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
            Trade
          </button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[#2a2a2a] mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => changeTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {t === 'etf' ? 'ETF' : t === 'trade ideas' ? 'Trade Ideas' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ───────────────────────────────────────────────────────── */}
      {tab === 'overview' && (() => {
        const closes  = q?.ohlcv?.map(d => d.close) ?? [];
        const price   = q?.price ?? 0;
        const rsi     = computeRSI(closes);
        const ma20    = computeMA(closes, 20);
        const ma50    = computeMA(closes, 50);
        const ma200   = computeMA(closes, 200);
        const atr     = computeATR(q?.ohlcv ?? []);
        const hi52    = s?.week52High ?? quoteData?.week52High ?? q?.week52High;
        const lo52    = s?.week52Low  ?? quoteData?.week52Low  ?? q?.week52Low;
        const rangePct = (hi52 && lo52 && hi52 > lo52)
          ? ((price - lo52) / (hi52 - lo52)) * 100 : null;
        const avgVol   = s?.avgVolume ?? quoteData?.avgVolume;
        const volRatio = (q?.volume && avgVol) ? q.volume / avgVol : null;

        const periodReturns = [
          { label: '1D',  val: q?.pct ?? null },
          { label: '1W',  val: pctFrom(closes, 5) },
          { label: '1M',  val: pctFrom(closes, 21) },
          { label: '3M',  val: pctFrom(closes, 63) },
          { label: '6M',  val: pctFrom(closes, 126) },
          { label: 'YTD', val: (() => {
              const first = q?.ohlcv?.find(d => d.date.startsWith(new Date().getFullYear().toString()));
              return first ? ((price - first.close) / first.close) * 100 : null;
            })() },
        ].filter(p => p.val !== null);

        const maxAbsRet = Math.max(...periodReturns.map(p => Math.abs(p.val ?? 0)), 0.1);

        const rsiLabel = rsi == null ? '—'
          : rsi < 30 ? 'Oversold' : rsi > 70 ? 'Overbought' : 'Neutral';
        const rsiColor = rsi == null ? '#6b7280'
          : rsi < 30 ? '#22c55e' : rsi > 70 ? '#ef4444' : '#fbbf24';

        const maRow = (label, ma) => {
          if (!ma || !price) return null;
          const diff = ((price - ma) / ma) * 100;
          return { label, ma, diff, above: diff >= 0 };
        };

        const maRows = [maRow('20-day MA', ma20), maRow('50-day MA', ma50), maRow('200-day MA', ma200)].filter(Boolean);

        const recentEarnings = earnings?.slice?.(-6) ?? [];

        return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* ── Period Returns ── */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">Period Returns</h2>
              {periodReturns.length === 0 ? (
                <p className="text-gray-600 text-sm">Load a longer range to see period returns.</p>
              ) : (
                <div className="space-y-2.5">
                  {periodReturns.map(({ label, val }) => {
                    const pos = val >= 0;
                    const barW = Math.abs(val) / maxAbsRet * 100;
                    return (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs w-8 shrink-0">{label}</span>
                        <div className="flex-1 flex items-center gap-2">
                          {/* left side (negative) */}
                          <div className="flex-1 flex justify-end">
                            {!pos && (
                              <div className="h-4 rounded-l-sm bg-red-500/70"
                                style={{ width: `${barW}%` }} />
                            )}
                          </div>
                          {/* center zero line */}
                          <div className="w-px h-4 bg-[#3a3a3a] shrink-0" />
                          {/* right side (positive) */}
                          <div className="flex-1">
                            {pos && (
                              <div className="h-4 rounded-r-sm bg-green-500/70"
                                style={{ width: `${barW}%` }} />
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-mono w-16 text-right shrink-0 ${pos ? 'text-green-400' : 'text-red-400'}`}>
                          {pos ? '+' : ''}{val.toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Technical Snapshot ── */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">Technical Snapshot</h2>
              <div className="grid grid-cols-2 gap-4">

                {/* RSI */}
                <div className="bg-[#111] rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-1">RSI (14)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white font-mono font-bold text-lg">
                      {rsi != null ? rsi.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: rsiColor }}>{rsiLabel}</span>
                  </div>
                  {rsi != null && (
                    <div className="mt-2 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden relative">
                      <div className="absolute inset-0 rounded-full"
                        style={{ background: 'linear-gradient(to right, #22c55e, #fbbf24, #ef4444)' }} />
                      <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full border border-black shadow"
                        style={{ left: `calc(${rsi}% - 4px)` }} />
                    </div>
                  )}
                  <div className="flex justify-between text-[9px] text-gray-600 mt-0.5">
                    <span>0</span><span>30</span><span>70</span><span>100</span>
                  </div>
                </div>

                {/* ATR / Volatility */}
                <div className="bg-[#111] rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-1">ATR (14) — Daily Range</div>
                  <div className="text-white font-mono font-bold text-lg">
                    {atr != null ? `$${atr.toFixed(2)}` : '—'}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {atr && price ? `${((atr / price) * 100).toFixed(2)}% of price` : 'Not enough data'}
                  </div>
                </div>

                {/* 52-Week Range */}
                <div className="bg-[#111] rounded-lg p-3 col-span-2">
                  <div className="text-gray-500 text-xs mb-2">52-Week Range</div>
                  {rangePct != null ? (
                    <>
                      <div className="relative h-2 bg-[#2a2a2a] rounded-full">
                        <div className="absolute h-full rounded-full bg-gradient-to-r from-red-500/60 via-yellow-500/60 to-green-500/60"
                          style={{ width: '100%' }} />
                        <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-[#0a0a0a] shadow"
                          style={{ left: `calc(${rangePct}% - 6px)` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1.5">
                        <span className="text-red-400 font-mono">{fmt$(lo52)}</span>
                        <span className="text-white font-mono font-semibold">{fmt$(price)} ({rangePct.toFixed(0)}%)</span>
                        <span className="text-green-400 font-mono">{fmt$(hi52)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                        <span>52W Low</span><span>52W High</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-600 text-xs">52-week data unavailable</p>
                  )}
                </div>

                {/* Volume vs Average */}
                <div className="bg-[#111] rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-1">Volume vs Avg</div>
                  <div className={`font-mono font-bold text-lg ${volRatio == null ? 'text-white' : volRatio >= 1.5 ? 'text-yellow-400' : volRatio >= 1 ? 'text-green-400' : 'text-gray-400'}`}>
                    {volRatio != null ? `${volRatio.toFixed(2)}×` : '—'}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {q?.volume ? formatVolume(q.volume) : '—'} today
                  </div>
                </div>

                {/* Distance from highs */}
                <div className="bg-[#111] rounded-lg p-3">
                  <div className="text-gray-500 text-xs mb-1">From 52W High</div>
                  {hi52 && price ? (
                    <>
                      <div className={`font-mono font-bold text-lg ${price >= hi52 ? 'text-green-400' : 'text-red-400'}`}>
                        {(((price - hi52) / hi52) * 100).toFixed(2)}%
                      </div>
                      <div className="text-gray-500 text-xs mt-1">High: {fmt$(hi52)}</div>
                    </>
                  ) : <div className="text-gray-600 text-xs">—</div>}
                </div>

              </div>

              {/* Moving Averages */}
              {maRows.length > 0 && (
                <div className="mt-4 border-t border-[#2a2a2a] pt-4">
                  <div className="text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wide">Moving Averages</div>
                  <div className="space-y-2">
                    {maRows.map(({ label, ma, diff, above }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs">{label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400 font-mono text-xs">{fmt$(ma)}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${above ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                            {above ? '▲' : '▼'} {above ? '+' : ''}{diff.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Recent Earnings Trend ── */}
            {!isETF && recentEarnings.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">Recent EPS Trend</h2>
                <div className="flex items-end gap-3 h-24">
                  {recentEarnings.map((e, i) => {
                    const maxEps = Math.max(...recentEarnings.map(x => Math.abs(x.actual ?? x.estimate ?? 0)), 0.01);
                    const h = Math.abs((e.actual ?? e.estimate ?? 0)) / maxEps * 100;
                    const beat = e.actual != null && e.estimate != null && e.actual >= e.estimate;
                    const missed = e.actual != null && e.estimate != null && e.actual < e.estimate;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-400 font-mono">
                          {e.actual != null ? `$${e.actual.toFixed(2)}` : `$${e.estimate?.toFixed(2) ?? '—'}e`}
                        </span>
                        <div className="w-full flex items-end justify-center" style={{ height: '64px' }}>
                          <div
                            className={`w-4/5 rounded-t-sm ${beat ? 'bg-green-500/80' : missed ? 'bg-red-500/70' : 'bg-indigo-500/70'}`}
                            style={{ height: `${Math.max(h, 4)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-600">{e.date?.slice(0, 7) ?? `Q${i + 1}`}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2 text-[10px] text-gray-600">
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-green-500/80 mr-1" />Beat</span>
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-red-500/70 mr-1" />Missed</span>
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-indigo-500/70 mr-1" />Estimate</span>
                </div>
              </div>
            )}

          </div>

          {/* Sidebar: Key Stats + About */}
          <div className="space-y-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">Key Statistics</h2>
              {(chartLoading && !q) || (summaryLoading && !s) ? (
                <div className="space-y-3">
                  {Array(10).fill(0).map((_, i) => <Skeleton key={i} className="w-full h-7" />)}
                </div>
              ) : (
                <>
                  <StatRow label="Previous Close" value={fmt$(q?.prevClose)} />
                  <StatRow label="Open"           value={fmt$(q?.open)} />
                  <StatRow label="Day Range"
                    value={q?.low && q?.high ? `${fmt$(q.low)} – ${fmt$(q.high)}` : '—'} />
                  <StatRow label="52-Week Range"
                    value={(() => {
                      const lo = s?.week52Low  ?? quoteData?.week52Low  ?? q?.week52Low;
                      const hi = s?.week52High ?? quoteData?.week52High ?? q?.week52High;
                      return (lo && hi) ? `${fmt$(lo)} – ${fmt$(hi)}` : '—';
                    })()} />
                  <StatRow label="Volume"      value={formatVolume(q?.volume)} />
                  <StatRow label="Avg. Volume" value={formatVolume(s?.avgVolume ?? quoteData?.avgVolume)} />
                  <StatRow label="Market Cap"  value={formatMarketCap(s?.marketCap ?? quoteData?.marketCap)} />
                  <StatRow label="P/E (TTM)"   value={(s?.pe ?? quoteData?.pe)?.toFixed(2) ?? '—'} />
                  <StatRow label="Forward P/E" value={(s?.forwardPE ?? quoteData?.forwardPE)?.toFixed(2) ?? '—'} />
                  <StatRow label="EPS (TTM)"   value={(s?.eps ?? quoteData?.eps) ? fmt$(s?.eps ?? quoteData?.eps) : '—'} />
                  <StatRow label="Beta"        value={(s?.beta ?? quoteData?.beta)?.toFixed(2) ?? '—'} />
                  {s?.dividend > 0 && (
                    <>
                      <StatRow label="Dividend"      value={fmt$(s.dividend)} />
                      <StatRow label="Dividend Yield" value={`${s.dividendYield?.toFixed(2)}%`} />
                    </>
                  )}
                  {s?.grossMargins != null && (
                    <StatRow label="Gross Margin"  value={`${s.grossMargins}%`} />
                  )}
                  {s?.profitMargins != null && (
                    <StatRow label="Profit Margin" value={`${s.profitMargins}%`} />
                  )}
                  {s?.returnOnEquity != null && (
                    <StatRow label="ROE" value={`${s.returnOnEquity}%`} />
                  )}
                  {s?.targetMeanPrice != null && (
                    <StatRow label="Analyst Target" value={fmt$(s.targetMeanPrice)}
                      valueClass={s.targetMeanPrice > (q?.price ?? 0) ? 'text-green-400' : 'text-red-400'} />
                  )}
                  {s?.recommendation && (
                    <StatRow label="Recommendation"
                      value={s.recommendation.charAt(0).toUpperCase() + s.recommendation.slice(1)}
                      valueClass="text-indigo-400" />
                  )}
                </>
              )}
            </div>

            {/* Analyst Recommendations */}
            {(s?.recommendation || s?.targetMeanPrice != null) && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-white font-semibold mb-3">Analyst Ratings</h2>
                {(() => {
                  const rec = s?.recommendation ?? '';
                  const mean = s?.recommendationMean;
                  const recLabel = rec === 'strongBuy' ? 'Strong Buy'
                    : rec === 'buy' ? 'Buy'
                    : rec === 'hold' ? 'Hold'
                    : rec === 'sell' ? 'Sell'
                    : rec === 'strongSell' ? 'Strong Sell'
                    : rec ? rec.charAt(0).toUpperCase() + rec.slice(1) : null;
                  const recColor = rec === 'strongBuy' || rec === 'buy' ? 'text-green-400 bg-green-500/10 border-green-500/20'
                    : rec === 'sell' || rec === 'strongSell' ? 'text-red-400 bg-red-500/10 border-red-500/20'
                    : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
                  const barPct = mean ? Math.max(0, Math.min(100, ((5 - mean) / 4) * 100)) : null;
                  return (
                    <>
                      {recLabel && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-bold mb-3 ${recColor}`}>
                          {recLabel}
                          {s.numAnalysts && <span className="text-xs font-normal opacity-70">· {s.numAnalysts} analysts</span>}
                        </div>
                      )}
                      {barPct != null && (
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>Strong Sell</span><span>Strong Buy</span>
                          </div>
                          <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                              style={{ width: '100%' }} />
                          </div>
                          <div className="relative h-0 mt-0.5">
                            <div className="absolute w-2 h-2 bg-white rounded-full border border-[#0a0a0a] shadow -translate-x-1/2 -top-1.5"
                              style={{ left: `${barPct}%` }} />
                          </div>
                        </div>
                      )}
                      <div className="mt-4 space-y-1.5">
                        {s.targetMeanPrice != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">Mean Target</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-white font-mono text-xs font-semibold">{fmt$(s.targetMeanPrice)}</span>
                              {q?.price && (
                                <span className={`text-[10px] font-mono ${s.targetMeanPrice > q.price ? 'text-green-400' : 'text-red-400'}`}>
                                  ({s.targetMeanPrice > q.price ? '+' : ''}{((s.targetMeanPrice - q.price) / q.price * 100).toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        {s.targetHighPrice != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">High Target</span>
                            <span className="text-green-400 font-mono text-xs">{fmt$(s.targetHighPrice)}</span>
                          </div>
                        )}
                        {s.targetLowPrice != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">Low Target</span>
                            <span className="text-red-400 font-mono text-xs">{fmt$(s.targetLowPrice)}</span>
                          </div>
                        )}
                        {s.targetMedianPrice != null && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">Median Target</span>
                            <span className="text-gray-300 font-mono text-xs">{fmt$(s.targetMedianPrice)}</span>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* About */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-white font-semibold mb-3">About</h2>
              {summaryLoading && !s ? (
                <div className="space-y-2">
                  {Array(4).fill(0).map((_, i) => <Skeleton key={i} className={`w-full h-4 ${i === 3 ? 'w-2/3' : ''}`} />)}
                </div>
              ) : (
                <>
                  {s?.description ? (
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-6">{s.description}</p>
                  ) : (
                    <p className="text-gray-600 text-sm">No description available.</p>
                  )}
                  {s?.industry && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {s.sector && <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/10 text-indigo-400">{s.sector}</span>}
                      {s.industry && <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/10 text-purple-400">{s.industry}</span>}
                      {s.employees && <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/10 text-gray-400">{s.employees.toLocaleString()} employees</span>}
                    </div>
                  )}
                  {s?.website && (
                    <a href={s.website} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
                      {s.website.replace(/^https?:\/\//, '')} <ExternalLink size={11} />
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── Chart tab ──────────────────────────────────────────────────────── */}
      {tab === 'chart' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold">Advanced Chart — {SYM}</h2>
              {q && (
                <p className={`text-sm font-mono mt-0.5 ${colorClass(q.pct)}`}>
                  {fmt$(q.price)} &nbsp; {signStr(q.change)} ({signStr(q.pct)}%)
                </p>
              )}
            </div>
            {chartLoading && <Loader2 size={13} className="text-indigo-400 animate-spin" />}
          </div>
          {q?.ohlcv?.length ? (
            <AdvancedChart
              ohlcv={q.ohlcv}
              color={color}
              symbol={SYM}
              range={range}
              onRangeChange={setRange}
            />
          ) : <Skeleton className="w-full h-96" />}
        </div>
      )}

      {/* ── Financials ─────────────────────────────────────────────────────── */}
      {tab === 'financials' && (
        <div className="space-y-6">
          {earningsLoading && !earnings?.length ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : earnings?.length ? (
            <>
              {/* ── Revenue Streams ── */}
              {(() => {
                const seg = getSegments(SYM);
                const latest = earnings[earnings.length - 1];

                // P&L waterfall from latest quarter
                const waterfallItems = latest ? [
                  { label: 'Revenue',          value: latest.revenue,         pct: 100 },
                  { label: 'Gross Profit',     value: latest.grossProfit,     pct: latest.revenue ? +((latest.grossProfit / latest.revenue) * 100).toFixed(1) : null },
                  { label: 'Operating Income', value: latest.operatingIncome, pct: latest.revenue ? +((latest.operatingIncome / latest.revenue) * 100).toFixed(1) : null },
                  { label: 'Net Income',       value: latest.netIncome,       pct: latest.revenue ? +((latest.netIncome / latest.revenue) * 100).toFixed(1) : null },
                ].filter(i => i.value != null) : [];

                return (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <h2 className="text-white font-semibold">Revenue Segments</h2>
                      {seg && <span className="text-gray-600 text-xs ml-1">{seg.period}</span>}
                    </div>

                    <div className={`grid gap-6 ${seg ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>

                      {/* Segment donut + legend */}
                      {seg && (
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                          {/* Donut */}
                          <div className="shrink-0">
                            <PieChart width={160} height={160}>
                              <Pie
                                data={seg.segments}
                                dataKey="pct"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={75}
                                paddingAngle={2}
                                isAnimationActive={false}
                              >
                                {seg.segments.map((s, i) => (
                                  <Cell key={i} fill={s.color} stroke="transparent" />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                                formatter={(v, name) => [`${v.toFixed(1)}%`, name]}
                              />
                            </PieChart>
                          </div>

                          {/* Legend */}
                          <div className="flex-1 space-y-2 min-w-0">
                            {seg.segments.map((s, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                                <span className="text-gray-300 text-xs flex-1 truncate">{s.name}</span>
                                <div className="w-20 bg-[#252525] rounded-full h-1 shrink-0">
                                  <div className="h-1 rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                                </div>
                                <span className="text-gray-400 text-xs font-mono w-10 text-right shrink-0">
                                  {s.pct.toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* P&L Waterfall — latest quarter */}
                      {waterfallItems.length > 0 && (
                        <div>
                          <p className="text-gray-500 text-xs mb-3 font-medium uppercase tracking-wider">
                            P&amp;L Flow · {latest.period}
                          </p>
                          <div className="space-y-2.5">
                            {waterfallItems.map((item, i) => {
                              const isNeg  = item.value < 0;
                              const barPct = item.pct != null ? Math.abs(item.pct) : 0;
                              const color  = i === 0 ? '#6366f1'
                                : item.value < 0 ? '#ef4444'
                                : i === waterfallItems.length - 1 ? '#22c55e'
                                : '#f59e0b';
                              return (
                                <div key={item.label}>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-gray-400 text-xs">{item.label}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-white text-xs font-mono">${Math.abs(item.value).toFixed(2)}B</span>
                                      {item.pct != null && (
                                        <span className="text-[10px] font-mono w-12 text-right" style={{ color }}>
                                          {isNeg ? '-' : ''}{barPct}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-[#252525] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all"
                                      style={{ width: `${Math.min(barPct, 100)}%`, background: color }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {!seg && (
                            <p className="text-gray-700 text-[10px] mt-4">
                              Detailed segment breakdown not available for {SYM}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">Revenue ($B)</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={earnings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                        formatter={v => v != null ? [`$${v}B`, 'Revenue'] : ['—', 'Revenue']} />
                      <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">Net Income ($B)</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={earnings}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                        formatter={v => v != null ? [`$${v}B`, 'Net Income'] : ['—', 'Net Income']} />
                      <Bar dataKey="netIncome" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-x-auto">
                <div className="px-5 py-3 border-b border-[#2a2a2a]">
                  <h2 className="text-white font-semibold">Quarterly Income Statement</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
                      <th className="text-left py-3 px-5">Period</th>
                      <th className="text-right py-3 px-4">Revenue ($B)</th>
                      <th className="text-right py-3 px-4">Rev. Growth</th>
                      <th className="text-right py-3 px-4">Gross Profit ($B)</th>
                      <th className="text-right py-3 px-4">Gross Margin</th>
                      <th className="text-right py-3 px-4">Operating Inc. ($B)</th>
                      <th className="text-right py-3 px-4">Net Income ($B)</th>
                      <th className="text-right py-3 px-4">Net Margin</th>
                      <th className="text-right py-3 px-4 pr-5">EPS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map(q => {
                      const growthColor = q.revenueGrowthYoY == null ? 'text-gray-500'
                        : q.revenueGrowthYoY >= 0 ? 'text-green-400' : 'text-red-400';
                      const niColor = q.netIncome == null ? 'text-gray-500'
                        : q.netIncome >= 0 ? 'text-green-400' : 'text-red-400';
                      return (
                        <tr key={q.period} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5">
                          <td className="py-3 px-5 text-gray-300 whitespace-nowrap">{q.period}</td>
                          <td className="py-3 px-4 text-right text-white font-mono">{q.revenue ?? '—'}</td>
                          <td className={`py-3 px-4 text-right font-mono text-xs ${growthColor}`}>
                            {q.revenueGrowthYoY != null ? `${q.revenueGrowthYoY >= 0 ? '+' : ''}${q.revenueGrowthYoY}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-white font-mono">{q.grossProfit ?? '—'}</td>
                          <td className="py-3 px-4 text-right text-indigo-400 font-mono text-xs">
                            {q.grossMargin != null ? `${q.grossMargin}%` : '—'}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300 font-mono">{q.operatingIncome ?? '—'}</td>
                          <td className={`py-3 px-4 text-right font-mono ${niColor}`}>{q.netIncome ?? '—'}</td>
                          <td className="py-3 px-4 text-right text-indigo-400 font-mono text-xs">
                            {q.netMargin != null ? `${q.netMargin}%` : '—'}
                          </td>
                          <td className="py-3 px-4 pr-5 text-right text-yellow-400 font-mono text-xs">
                            {q.eps != null ? `$${q.eps.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Financial ratios from summary */}
              {s && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">Financial Health</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Gross Margin',   value: s.grossMargins  != null ? `${s.grossMargins}%`  : null },
                      { label: 'Profit Margin',  value: s.profitMargins != null ? `${s.profitMargins}%` : null },
                      { label: 'ROE',            value: s.returnOnEquity != null ? `${s.returnOnEquity}%` : null },
                      { label: 'Revenue Growth', value: s.revenueGrowth != null ? `${s.revenueGrowth}%` : null },
                      { label: 'Free Cash Flow', value: formatMarketCap(s.freeCashflow) },
                      { label: 'Total Cash',     value: formatMarketCap(s.totalCash) },
                      { label: 'Total Debt',     value: formatMarketCap(s.totalDebt) },
                      { label: 'Rev/Share',      value: s.revenuePerShare ? fmt$(s.revenuePerShare) : null },
                    ].map(item => (
                      <div key={item.label} className="bg-[#111] rounded-lg p-3">
                        <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                        <p className="text-white font-mono font-semibold text-sm">{item.value ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p>No financial data available for {SYM}.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Earnings ───────────────────────────────────────────────────────── */}
      {tab === 'earnings' && (
        <div className="space-y-6">
          {earningsLoading && !earnings?.length ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : earnings?.length ? (() => {
            const latest = earnings[earnings.length - 1];
            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Latest EPS', value: latest?.eps != null ? `$${latest.eps.toFixed(2)}` : '—', color: latest?.eps >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Revenue YoY', value: latest?.revenueGrowthYoY != null ? `${latest.revenueGrowthYoY >= 0 ? '+' : ''}${latest.revenueGrowthYoY}%` : '—', color: latest?.revenueGrowthYoY == null ? 'text-gray-400' : latest.revenueGrowthYoY >= 0 ? 'text-green-400' : 'text-red-400' },
                    { label: 'Net Margin', value: latest?.netMargin != null ? `${latest.netMargin}%` : '—', color: 'text-indigo-400' },
                    { label: 'Gross Margin', value: latest?.grossMargin != null ? `${latest.grossMargin}%` : '—', color: 'text-purple-400' },
                  ].map(m => (
                    <div key={m.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                      <p className="text-gray-500 text-xs mb-1">{m.label}</p>
                      <p className={`text-xl font-bold font-mono ${m.color}`}>{m.value}</p>
                      <p className="text-gray-600 text-xs mt-0.5">Latest Quarter</p>
                    </div>
                  ))}
                </div>

                {/* ── Quarterly Metrics Table ── */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">Quarterly Financials</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[600px]">
                      <thead>
                        <tr className="text-left border-b border-[#2a2a2a]">
                          {['Period', 'Revenue ($B)', 'Rev. Growth', 'Gross Profit ($B)', 'Gross Margin', 'Operating Inc. ($B)', 'Net Income ($B)', 'Net Margin', 'EPS'].map(h => (
                            <th key={h} className="pb-2 pr-4 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f1f1f]">
                        {[...earnings].reverse().map((e, i) => {
                          const fmt  = v => v != null ? `$${(v / 1e9).toFixed(2)}` : '—';
                          const pct  = v => v != null ? `${v >= 0 ? '+' : ''}${v}%` : '—';
                          const pctCls = v => v == null ? 'text-gray-600' : v >= 0 ? 'text-green-400' : 'text-red-400';
                          const marCls = v => v == null ? 'text-gray-600' : v >= 30 ? 'text-green-400' : v >= 10 ? 'text-yellow-400' : 'text-red-400';
                          return (
                            <tr key={i} className={`transition-colors ${i === 0 ? 'bg-indigo-500/5' : 'hover:bg-[#1f1f1f]'}`}>
                              <td className="py-2 pr-4 font-mono text-white font-semibold whitespace-nowrap">
                                {e.period}
                                {i === 0 && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Latest</span>}
                              </td>
                              <td className="py-2 pr-4 font-mono text-gray-300">{fmt(e.revenue)}</td>
                              <td className={`py-2 pr-4 font-mono font-semibold ${pctCls(e.revenueGrowthYoY)}`}>{pct(e.revenueGrowthYoY)}</td>
                              <td className="py-2 pr-4 font-mono text-gray-300">{fmt(e.grossProfit)}</td>
                              <td className={`py-2 pr-4 font-mono font-semibold ${marCls(e.grossMargin)}`}>{e.grossMargin != null ? `${e.grossMargin}%` : '—'}</td>
                              <td className={`py-2 pr-4 font-mono ${e.operatingIncome >= 0 ? 'text-gray-300' : 'text-red-400'}`}>{fmt(e.operatingIncome)}</td>
                              <td className={`py-2 pr-4 font-mono ${e.netIncome >= 0 ? 'text-gray-300' : 'text-red-400'}`}>{fmt(e.netIncome)}</td>
                              <td className={`py-2 pr-4 font-mono font-semibold ${marCls(e.netMargin)}`}>{e.netMargin != null ? `${e.netMargin}%` : '—'}</td>
                              <td className={`py-2 font-mono font-semibold ${e.eps >= 0 ? 'text-indigo-300' : 'text-red-400'}`}>{e.eps != null ? `$${e.eps.toFixed(2)}` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* EPS chart */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">EPS (Diluted) per Quarter</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={earnings} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(1)}`} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                        formatter={v => v != null ? [`$${v.toFixed(2)}`, 'EPS'] : ['—', 'EPS']} />
                      <ReferenceLine y={0} stroke="#3a3a3a" />
                      <Bar dataKey="eps" radius={[3, 3, 0, 0]}>
                        {earnings.map((e, i) => (
                          <Cell key={i} fill={e.eps >= 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Revenue Growth YoY */}
                {earnings.some(e => e.revenueGrowthYoY != null) && (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                    <h2 className="text-white font-semibold mb-4">Revenue Growth (YoY %)</h2>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={earnings.filter(e => e.revenueGrowthYoY != null)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                          formatter={v => [`${v >= 0 ? '+' : ''}${v}%`, 'YoY Growth']} />
                        <ReferenceLine y={0} stroke="#3a3a3a" />
                        <Bar dataKey="revenueGrowthYoY" radius={[3, 3, 0, 0]}>
                          {earnings.filter(e => e.revenueGrowthYoY != null).map((e, i) => (
                            <Cell key={i} fill={e.revenueGrowthYoY >= 0 ? '#6366f1' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Margin trends */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">Margin Trends (%)</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={earnings} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                        formatter={(v, name) => v != null ? [`${v}%`, name] : ['—', name]} />
                      <Line type="monotone" dataKey="grossMargin" stroke="#a78bfa" strokeWidth={2} dot={false} name="Gross Margin" />
                      <Line type="monotone" dataKey="netMargin" stroke="#22c55e" strokeWidth={2} dot={false} name="Net Margin" />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-2 justify-end">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="w-4 h-0.5 bg-purple-400 inline-block rounded" /> Gross Margin
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span className="w-4 h-0.5 bg-green-400 inline-block rounded" /> Net Margin
                    </span>
                  </div>
                </div>

              </>
            );
          })() : (
            <div className="text-center py-16 text-gray-500">
              <p>No earnings data available for {SYM}.</p>
            </div>
          )}

        </div>
      )}

      {/* ── ETF ────────────────────────────────────────────────────────────── */}
      {tab === 'etf' && (() => {
        const info = etfInfo;
        const ohlcv = q?.ohlcv || [];

        function periodReturn(daysBack) {
          if (ohlcv.length < 2) return null;
          const now = ohlcv[ohlcv.length - 1].close;
          const from = ohlcv[Math.max(0, ohlcv.length - 1 - daysBack)].close;
          return from ? +((now / from - 1) * 100).toFixed(2) : null;
        }
        const ytdReturn = (() => {
          const yearStart = ohlcv.find(d => d.date >= `${new Date().getFullYear()}-01-01`);
          const last = ohlcv[ohlcv.length - 1];
          return yearStart && last ? +((last.close / yearStart.close - 1) * 100).toFixed(2) : null;
        })();

        const returns = [
          { label: '1 Month',  value: periodReturn(21) },
          { label: '3 Months', value: periodReturn(63) },
          { label: 'YTD',      value: ytdReturn },
          { label: '1 Year',   value: periodReturn(252) },
        ];

        return (
          <div className="space-y-6">
            {/* ETF info header */}
            {info && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-white font-bold text-lg">{info.fullName}</h2>
                    <p className="text-gray-400 text-sm mt-0.5">{info.issuer} · {info.category}</p>
                    <p className="text-indigo-400 text-sm mt-0.5">Tracks: {info.index}</p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <div className="bg-[#111] rounded-lg px-3 py-2 text-center min-w-[80px]">
                      <p className="text-gray-500 text-[10px]">Expense Ratio</p>
                      <p className="text-yellow-400 font-mono font-bold text-sm">{info.expenseRatio}%</p>
                    </div>
                    <div className="bg-[#111] rounded-lg px-3 py-2 text-center min-w-[80px]">
                      <p className="text-gray-500 text-[10px]">AUM</p>
                      <p className="text-white font-mono font-bold text-sm">{info.aum}</p>
                    </div>
                    <div className="bg-[#111] rounded-lg px-3 py-2 text-center min-w-[80px]">
                      <p className="text-gray-500 text-[10px]">Inception</p>
                      <p className="text-white font-mono font-bold text-sm">{info.inception.slice(0,7)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance returns */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-white font-semibold mb-4">Performance Returns</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {returns.map(r => (
                  <div key={r.label} className="bg-[#111] rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-xs mb-1">{r.label}</p>
                    {r.value != null ? (
                      <p className={`text-xl font-bold font-mono ${r.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {r.value >= 0 ? '+' : ''}{r.value}%
                      </p>
                    ) : (
                      <p className="text-gray-600 text-xl font-bold">—</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {info && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sector allocation */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">Sector Allocation</h2>
                  <div className="space-y-2.5">
                    {info.sectors.map(sec => (
                      <div key={sec.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">{sec.name}</span>
                          <span className="text-white font-mono font-medium">{sec.weight}%</span>
                        </div>
                        <div className="h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${sec.weight}%`, backgroundColor: sec.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top holdings */}
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                  <h2 className="text-white font-semibold mb-4">Top Holdings</h2>
                  <div className="space-y-0">
                    {info.holdings.map((h, i) => (
                      <div key={h.symbol} className="flex items-center justify-between py-2 border-b border-[#2a2a2a] last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                          <div className="w-7 h-7 rounded-md bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center">
                            <span className="text-indigo-400 font-bold text-[9px]">{h.symbol.slice(0,2)}</span>
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{h.symbol}</p>
                            <p className="text-gray-500 text-xs truncate max-w-[140px]">{h.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-mono text-sm font-semibold">{h.weight}%</p>
                          <div className="w-16 h-1 bg-[#2a2a2a] rounded-full mt-1">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(h.weight / info.holdings[0].weight) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {!info && (
              <div className="text-center py-12 text-gray-500">
                <p>Detailed ETF data not available for {SYM}.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Holders ────────────────────────────────────────────────────────── */}
      {tab === 'holders' && (
        <div className="space-y-6">
          {instLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : (institutional?.summary?.instPct || institutional?.holders?.length > 0) ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Inst. Ownership', value: institutional.summary.instPct },
                  { label: 'Holdings Value',  value: institutional.summary.holdingsValue },
                  { label: 'Shares Out. (M)', value: institutional.summary.sharesOut },
                  { label: 'Total Holders',   value: institutional.totalHolders?.split(' ')?.[0] },
                ].filter(i => i.value).map(item => (
                  <div key={item.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                    <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                    <p className="text-white font-mono font-bold text-lg truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {institutional?.activity && Object.keys(institutional.activity).length > 0 && (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                    <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
                    <div className="space-y-2">
                      {[
                        { label: 'Increased Positions', data: institutional.activity.increased, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                        { label: 'New Positions',       data: institutional.activity.newPos,    color: 'text-green-300', bg: 'bg-green-500/5',  border: 'border-green-500/10' },
                        { label: 'Decreased Positions', data: institutional.activity.decreased, color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/20'   },
                        { label: 'Sold Out Positions',  data: institutional.activity.soldOut,   color: 'text-red-300',   bg: 'bg-red-500/5',    border: 'border-red-500/10'   },
                      ].filter(r => r.data).map(row => (
                        <div key={row.label} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${row.bg} ${row.border}`}>
                          <span className={`text-sm font-semibold ${row.color}`}>{row.label}</span>
                          <div className="text-right">
                            <p className="text-white text-sm font-mono font-semibold">{row.data.holders} <span className="text-gray-500 font-normal text-xs">holders</span></p>
                            {row.data.shares && (
                              <p className="text-gray-500 text-xs font-mono">
                                {Number(row.data.shares.replace(/,/g, '')).toLocaleString()} shares
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {institutional?.holders?.length > 0 && (
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                    <h2 className="text-white font-semibold mb-4">Top Institutional Holders</h2>
                    <div className="space-y-0">
                      {institutional.holders.map((h, i) => {
                        const pct  = parseFloat((h.changePct || '0').replace(/[+%,]/g, ''));
                        const chg  = parseFloat((h.change || '0').replace(/[^0-9.-]/g, ''));
                        const isUp   = chg > 0;
                        const isDown = chg < 0;
                        return (
                          <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#2a2a2a] last:border-0">
                            <div className="flex-1 min-w-0 pr-3">
                              <p className="text-white text-sm font-medium truncate">{h.name}</p>
                              <p className="text-gray-500 text-xs font-mono">{h.shares} shares · {h.date}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-mono font-semibold ${isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-gray-500'}`}>
                                {isUp ? '+' : ''}{pct.toFixed(2)}%
                              </p>
                              <p className="text-gray-600 text-xs">{h.value}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-gray-500">
              <p>No institutional ownership data available for {SYM}.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Options ────────────────────────────────────────────────────────── */}
      {tab === 'options' && (() => {
        const oa = optAnalytics;
        const price = q?.price ?? 0;
        const dteDays = selExp;
        const em = oa ? oa.expectedMove(dteDays) : null;

        const DTE_OPTIONS = [
          { label: '1W',  days: 7   },
          { label: '2W',  days: 14  },
          { label: '3W',  days: 21  },
          { label: '1M',  days: 30  },
          { label: '45D', days: 45  },
          { label: '2M',  days: 60  },
          { label: '3M',  days: 90  },
          { label: '4M',  days: 120 },
          { label: '6M',  days: 180 },
          { label: '9M',  days: 270 },
          { label: '1Y',  days: 365 },
        ];

        return (
        <div className="space-y-5">

          {/* ── Header ── */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-0">
              <div>
                <h2 className="text-white font-semibold text-base">Options Analytics — {SYM}</h2>
                <p className="text-gray-500 text-xs mt-0.5">
                  Current Price: {q ? fmt$(price) : '…'} · Simulated chain
                </p>
              </div>
            </div>
            {/* DTE scroll bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-semibold">Days to Expiry</span>
                <span className="text-indigo-400 font-mono text-xs font-bold">{dteDays} days</span>
              </div>
              <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-1.5" style={{ width: 'max-content' }}>
                  {DTE_OPTIONS.map(opt => (
                    <button
                      key={opt.days}
                      onClick={() => setSelExp(opt.days)}
                      className={`text-xs px-3 py-1.5 rounded-md transition-all whitespace-nowrap font-medium ${
                        opt.days === selExp
                          ? 'bg-indigo-600 text-white shadow shadow-indigo-500/30'
                          : 'text-gray-500 border border-[#2a2a2a] hover:text-white hover:border-indigo-500/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Expected move preview strip */}
              {oa && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden relative">
                    <div
                      className="absolute inset-y-0 left-1/2 -translate-x-1/2 bg-indigo-500/40 rounded-full"
                      style={{ width: `${Math.min((oa.expectedMove(dteDays) / price) * 200, 100)}%` }}
                    />
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/40" />
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0">
                    ±{((oa.expectedMove(dteDays) / price) * 100).toFixed(1)}% expected in {dteDays}d
                  </span>
                </div>
              )}
            </div>
          </div>

          {oa && (
          <>
          {/* ── Key Metrics Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              {
                label: 'ATM IV',
                value: `${oa.atmIV.toFixed(1)}%`,
                sub: oa.ivRank != null ? `IV Rank ${oa.ivRank}` : '',
                color: oa.atmIV > 40 ? '#ef4444' : oa.atmIV > 25 ? '#fbbf24' : '#22c55e',
                tip: `Implied Volatility at the money (strike closest to ${fmt$(price)}).\n\nIV reflects the market's expectation of future price swings — higher IV means options are more expensive.\n\n• IV < 20% → cheap options (low fear)\n• IV 20–40% → normal\n• IV > 40% → expensive options (high uncertainty)\n\nIV Rank shows where current IV sits vs the chain range (0 = lowest, 100 = highest).`,
              },
              {
                label: `Expected Move (${dteDays}d)`,
                value: em ? `±${fmt$(em)}` : '—',
                sub: em ? `${((em / price) * 100).toFixed(1)}% of price` : '',
                color: '#818cf8',
                tip: `Expected Move — the ±1σ range the market is pricing in for this expiry.\n\nFormula: Stock Price × (ATM IV / 100) × √(DTE / 365)\n\nMeaning: there is a ~68% probability the stock stays within ${em ? `${fmt$(price - em)} – ${fmt$(price + em)}` : 'this range'} by expiry.\n\nA wider expected move = higher IV = more expensive options.`,
              },
              {
                label: 'Put/Call OI Ratio',
                value: oa.pcRatio != null ? oa.pcRatio.toFixed(2) : '—',
                sub: oa.pcRatio != null
                  ? oa.pcRatio > 1.3 ? 'Bearish skew' : oa.pcRatio < 0.7 ? 'Bullish skew' : 'Neutral'
                  : '',
                color: oa.pcRatio != null
                  ? oa.pcRatio > 1.3 ? '#ef4444' : oa.pcRatio < 0.7 ? '#22c55e' : '#9ca3af'
                  : '#9ca3af',
                tip: `Put/Call Open Interest Ratio = Total Put OI ÷ Total Call OI.\n\nMeasures where traders have positioned their bets:\n\n• > 1.3 → more puts than calls = bearish hedging or speculation\n• 0.7–1.3 → balanced / neutral\n• < 0.7 → more calls than puts = bullish positioning\n\nHigh P/C ratio can also mean hedgers are protecting long positions — not always directionally bearish.`,
              },
              {
                label: 'IV Skew',
                value: oa.ivSkew != null ? `${oa.ivSkew > 0 ? '+' : ''}${oa.ivSkew}%` : '—',
                sub: oa.ivSkew != null
                  ? oa.ivSkew > 2 ? 'Downside fear' : oa.ivSkew < -2 ? 'Upside fear' : 'Flat skew'
                  : '',
                color: oa.ivSkew != null
                  ? oa.ivSkew > 2 ? '#ef4444' : oa.ivSkew < -2 ? '#22c55e' : '#9ca3af'
                  : '#9ca3af',
                tip: `IV Skew = nearest OTM Put IV minus nearest OTM Call IV.\n\nPositive skew (puts > calls) = market is paying more to protect against downside — common when traders expect a drop.\n\nNegative skew (calls > puts) = demand for upside calls, often seen before expected positive catalysts (earnings, FDA, etc.).\n\nFlat skew = roughly equal pricing of upside and downside risk.`,
              },
              {
                label: 'Max Pain',
                value: fmt$(oa.maxPainStrike),
                sub: `${((oa.maxPainStrike - price) / price * 100).toFixed(1)}% from price`,
                color: oa.maxPainStrike >= price ? '#22c55e' : '#ef4444',
                tip: `Max Pain — the strike price where option sellers (usually market makers) lose the least money at expiry.\n\nCalc: for each possible expiry price, sum total dollar payout to all call + put buyers. The strike with the lowest total payout = max pain.\n\nTheory: stocks tend to drift toward max pain near expiry as market makers delta-hedge. Not reliable for individual trades but useful for context.\n\nMax Pain at ${fmt$(oa.maxPainStrike)} means option sellers benefit most if the stock expires right there.`,
              },
            ].map(m => (
              <div key={m.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center gap-1 text-gray-500 text-[10px] uppercase tracking-wider mb-1">
                  {m.label}
                  <HelpBubble tip={m.tip} />
                </div>
                <div className="font-mono font-bold text-lg" style={{ color: m.color }}>{m.value}</div>
                {m.sub && <div className="text-gray-600 text-[10px] mt-0.5">{m.sub}</div>}
              </div>
            ))}
          </div>

          {/* ── Expected Move + OI Distribution ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Expected Move Visual */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-white font-semibold text-sm">Expected Move by Expiry</h3>
                <HelpBubble tip="Shows the ±1σ (68% probability) and ±2σ (95% probability) price range the market is pricing in for each expiry, based on ATM implied volatility." />
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Weekly',    dte: 7  },
                  { label: 'Monthly',   dte: 30 },
                  { label: 'Quarterly', dte: 90 },
                ].map(({ label, dte }) => {
                  const move = oa.expectedMove(dte);
                  const move2 = move * 2;
                  const lo1 = price - move, hi1 = price + move;
                  const lo2 = price - move2, hi2 = price + move2;
                  const pct1 = (move / price * 100).toFixed(1);
                  const pct2 = (move2 / price * 100).toFixed(1);
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                        <span className="font-medium">{label}</span>
                        <span className="text-gray-600">±{pct1}% (1σ) · ±{pct2}% (2σ)</span>
                      </div>
                      {/* 2σ range */}
                      <div className="relative h-7 bg-[#111] rounded-md overflow-hidden">
                        <div className="absolute inset-y-0 rounded-md bg-indigo-500/10"
                          style={{ left: `${Math.max(0,(1-move2/price)*50)}%`, right: `${Math.max(0,(1-move2/price)*50)}%` }} />
                        <div className="absolute inset-y-1 rounded-md bg-indigo-500/20"
                          style={{ left: `${Math.max(0,(1-move/price)*50)}%`, right: `${Math.max(0,(1-move/price)*50)}%` }} />
                        {/* current price pin */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white/60" style={{ left: '50%' }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                        <span className="text-red-400 font-mono">{fmt$(lo2)}</span>
                        <span className="text-red-300 font-mono">{fmt$(lo1)}</span>
                        <span className="text-white font-mono font-semibold">{fmt$(price)}</span>
                        <span className="text-green-300 font-mono">{fmt$(hi1)}</span>
                        <span className="text-green-400 font-mono">{fmt$(hi2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 mt-4 text-[10px] text-gray-600">
                <span><span className="inline-block w-3 h-2 rounded-sm bg-indigo-500/20 mr-1" />1σ (68%)</span>
                <span><span className="inline-block w-3 h-2 rounded-sm bg-indigo-500/10 mr-1" />2σ (95%)</span>
              </div>
            </div>

            {/* OI Distribution */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center gap-1.5 mb-4">
                <h3 className="text-white font-semibold text-sm">Open Interest by Strike</h3>
                <HelpBubble tip="Shows where traders have positioned their bets.\n\nGreen bars = Call OI (bullish bets)\nRed bars = Put OI (bearish bets / hedges)\n\nHigh Call OI at a strike → resistance / call wall\nHigh Put OI at a strike → support / put wall\n\nThe white line marks the current stock price." />
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={options} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#1f2f1f" />
                  <XAxis dataKey="strike" tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false}
                    tickFormatter={v => `$${v}`} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, fontSize: 11 }}
                    formatter={(v, name) => [v.toLocaleString(), name === 'callOI' ? 'Call OI' : 'Put OI']}
                    labelFormatter={v => `Strike $${v}`}
                  />
                  <ReferenceLine x={options.reduce((b, o) => Math.abs(o.strike - price) < Math.abs(b.strike - price) ? o : b, options[0]).strike}
                    stroke="#fff" strokeWidth={1} strokeDasharray="4 2" label={{ value: 'ATM', position: 'top', fill: '#9ca3af', fontSize: 9 }} />
                  <Bar dataKey="callOI" fill="#22c55e" opacity={0.7} radius={[2,2,0,0]} isAnimationActive={false} />
                  <Bar dataKey="putOI"  fill="#ef4444" opacity={0.7} radius={[2,2,0,0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 text-[10px] text-gray-600 mt-1">
                <span><span className="inline-block w-2 h-2 rounded-sm bg-green-500/70 mr-1" />Call OI: {oa.totalCallOI.toLocaleString()}</span>
                <span><span className="inline-block w-2 h-2 rounded-sm bg-red-500/70 mr-1" />Put OI: {oa.totalPutOI.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ── Strategy Breakevens ── */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-white font-semibold text-sm">ATM Strategy Breakevens ({dteDays}d)</h3>
              <HelpBubble tip="Quick-reference breakeven prices for the three most common single-expiry option strategies at the at-the-money strike.\n\nPrices use ask-side premiums (what you'd actually pay). These are estimates — use for planning, not execution." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  name: 'Long Call', emoji: '📈',
                  cost: fmt$(oa.atm.callAsk),
                  be: fmt$(oa.atm.strike + oa.atm.callAsk),
                  bePct: `+${((oa.atm.callAsk / price) * 100).toFixed(1)}% move needed`,
                  maxLoss: fmt$(oa.atm.callAsk) + ' / share',
                  maxGain: 'Unlimited',
                  color: '#22c55e',
                  tip: `Long Call — buy the right to purchase ${SYM} at ${fmt$(oa.atm.strike)} by expiry.\n\nBreakeven: Strike + Premium = ${fmt$(oa.atm.strike + oa.atm.callAsk)}\nMax Loss: ${fmt$(oa.atm.callAsk)} (premium paid)\nMax Gain: Unlimited (stock keeps rising)\n\nBest when: strongly bullish, expecting a big move up.`,
                },
                {
                  name: 'Long Put', emoji: '📉',
                  cost: fmt$(oa.atm.putAsk),
                  be: fmt$(oa.atm.strike - oa.atm.putAsk),
                  bePct: `-${((oa.atm.putAsk / price) * 100).toFixed(1)}% move needed`,
                  maxLoss: fmt$(oa.atm.putAsk) + ' / share',
                  maxGain: fmt$(oa.atm.strike - oa.atm.putAsk) + ' max',
                  color: '#ef4444',
                  tip: `Long Put — buy the right to sell ${SYM} at ${fmt$(oa.atm.strike)} by expiry.\n\nBreakeven: Strike − Premium = ${fmt$(oa.atm.strike - oa.atm.putAsk)}\nMax Loss: ${fmt$(oa.atm.putAsk)} (premium paid)\nMax Gain: ${fmt$(oa.atm.strike - oa.atm.putAsk)} (stock → $0)\n\nBest when: strongly bearish or hedging a long stock position.`,
                },
                {
                  name: 'Long Straddle', emoji: '↕️',
                  cost: fmt$(oa.straddleCost),
                  be: `${fmt$(oa.atm.strike - oa.straddleCost)} / ${fmt$(oa.atm.strike + oa.straddleCost)}`,
                  bePct: `±${((oa.straddleCost / price) * 100).toFixed(1)}% move needed`,
                  maxLoss: fmt$(oa.straddleCost) + ' / share',
                  maxGain: 'Unlimited',
                  color: '#818cf8',
                  tip: `Long Straddle — buy both the ATM Call and ATM Put at ${fmt$(oa.atm.strike)}.\n\nBreakeven: Stock below ${fmt$(oa.atm.strike - oa.straddleCost)} OR above ${fmt$(oa.atm.strike + oa.straddleCost)}\nCost: ${fmt$(oa.straddleCost)} (call + put premium)\nMax Loss: ${fmt$(oa.straddleCost)} (stock stays at ${fmt$(oa.atm.strike)})\nMax Gain: Unlimited\n\nBest when: expecting a big move in either direction (earnings, news). Profits if IV expands.`,
                },
              ].map(s => (
                <div key={s.name} className="bg-[#111] rounded-xl p-4 border border-[#1f1f1f]">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{s.emoji}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-white font-semibold text-sm">{s.name}</span>
                      <HelpBubble tip={s.tip} />
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cost</span>
                      <span className="text-white font-mono">{s.cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Breakeven</span>
                      <span className="font-mono font-semibold" style={{ color: s.color }}>{s.be}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Move needed</span>
                      <span className="text-yellow-400 font-mono">{s.bePct}</span>
                    </div>
                    <div className="border-t border-[#2a2a2a] pt-2 flex justify-between">
                      <span className="text-gray-500">Max loss</span>
                      <span className="text-red-400 font-mono">{s.maxLoss}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Max gain</span>
                      <span className="text-green-400 font-mono">{s.maxGain}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Greeks Snapshot ── */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-1.5 mb-4">
              <h3 className="text-white font-semibold text-sm">ATM Greeks Snapshot</h3>
              <HelpBubble tip="Greeks measure how an option's price changes relative to various market factors. These are ATM estimates for the selected expiry." />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  name: 'Delta', value: '≈ 0.50', color: '#818cf8',
                  bar: 50, barColor: '#818cf8',
                  tip: `Delta (Δ) — how much the option price moves per $1 move in the stock.\n\nATM options have Delta ≈ 0.50:\n• If the stock rises $1, the call gains ~$0.50\n• If the stock falls $1, the call loses ~$0.50\n\nDelta also approximates the probability the option expires in-the-money (50% for ATM).`,
                },
                {
                  name: 'Gamma', value: `≈ ${oa.gammaRisk.toFixed(2)}`, color: '#fbbf24',
                  bar: Math.min(oa.gammaRisk * 2000, 100), barColor: '#fbbf24',
                  tip: `Gamma (Γ) — the rate of change of Delta per $1 move in the stock.\n\nHigh Gamma (ATM, near expiry) = Delta changes quickly — your position becomes very sensitive to price moves.\n\nGamma risk is highest when options are ATM and expiry is close. Market makers with short gamma must rapidly hedge as the stock moves.`,
                },
                {
                  name: 'Theta', value: `−${fmt$(+(oa.atm.callAsk / dteDays * 1.3).toFixed(2))}/day`, color: '#ef4444',
                  bar: Math.min((oa.atm.callAsk / dteDays / oa.atm.callAsk) * 500, 100), barColor: '#ef4444',
                  tip: `Theta (Θ) — daily time decay. How much the option loses in value every day, all else equal.\n\nAs an option buyer, Theta works against you — your option loses value every day that passes without a move.\n\nTheta accelerates as expiry approaches (steepest in the last 2–3 weeks). Option sellers profit from Theta.`,
                },
                {
                  name: 'Vega', value: `${fmt$(+(oa.atm.callAsk / (oa.atmIV / 100) * 0.01).toFixed(2))}/1% IV`, color: '#22c55e',
                  bar: 55, barColor: '#22c55e',
                  tip: `Vega (ν) — how much the option price changes per 1% change in Implied Volatility.\n\nIf IV rises 1%, a long option gains Vega dollars. If IV falls 1%, it loses Vega dollars.\n\nOption buyers are long Vega (want IV to rise). Sellers are short Vega. Vega is highest for ATM options and decreases near expiry.`,
                },
              ].map(g => (
                <div key={g.name} className="bg-[#111] rounded-lg p-3">
                  <div className="flex items-center gap-1 text-gray-500 text-xs mb-1">
                    {g.name} <HelpBubble tip={g.tip} />
                  </div>
                  <div className="font-mono font-bold text-sm mb-2" style={{ color: g.color }}>{g.value}</div>
                  <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${g.bar}%`, background: g.barColor, opacity: 0.7 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </>
          )}

          {/* ── Options Chain Table ── */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Options Chain</h3>
            {options.length ? <OptionsTable data={options} /> : <Skeleton className="w-full h-60" />}
          </div>

        </div>
        );
      })()}

      {/* ── Return Distribution ────────────────────────────────────────────── */}
      <div className={tab !== 'return dist' ? 'hidden' : ''}>
        <RollingReturnProbability symbol={SYM} />
      </div>

      {/* ── Performance ────────────────────────────────────────────────────── */}
      <div className={tab !== 'performance' ? 'hidden' : ''}>
        <PerformanceTab symbol={SYM} />
      </div>

      {/* ── Trade Ideas ────────────────────────────────────────────────────── */}
      <div className={tab !== 'trade ideas' ? 'hidden' : ''}>
        <StrategiesTab symbol={SYM} />
      </div>

      {/* ── News ───────────────────────────────────────────────────────────── */}
      {tab === 'news' && (
        <div className="space-y-6">
          {/* Social Sentiment */}
          {(() => {
            if (!news?.length) return null;
            const BULL_RE = /\b(beat|beats|surges?|records?|upgrades?|growth|strong|rally|rallies|higher|profits?|gains?|exceeds?|outperforms?|bullish|breakout|launches?|positive|upside|soars?|jumps?|rises?|boosts?|rebounds?|record-high|all-time)\b/gi;
            const BEAR_RE = /\b(miss|misses|drops?|declines?|falls?|downgrades?|losses?|weak|lower|negative|concerns?|risks?|bearish|warns?|warnings?|cuts?|layoffs?|lawsuit|investigation|downside|pressure|recession|plunges?|slides?|tumbles?|crash|crashing|disappoints?|shortfall|fears?|sell-off)\b/gi;
            const scored = news.map(n => {
              const bull = (n.title.match(BULL_RE) || []).length;
              const bear = (n.title.match(BEAR_RE) || []).length;
              return { ...n, bull, bear, net: bull - bear };
            });
            const totalNet = scored.reduce((s, v) => s + v.net, 0);
            const score = Math.min(100, Math.max(0, Math.round(50 + (totalNet / Math.max(scored.length * 2, 1)) * 50)));
            const label = score >= 62 ? 'Bullish' : score <= 38 ? 'Bearish' : 'Neutral';
            const strength = score >= 75 || score <= 25 ? 'Strong' : 'Moderate';
            const labelColor = label === 'Bullish' ? 'text-green-400' : label === 'Bearish' ? 'text-red-400' : 'text-gray-300';
            return (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  Social Sentiment
                  <span className={`text-sm font-medium ${labelColor}`}>· {strength} {label}</span>
                  <span className="text-gray-600 text-xs ml-auto">{news.length} articles</span>
                </h2>
                <div className="relative h-3 bg-[#2a2a2a] rounded-full overflow-hidden mb-4">
                  <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-500/40 to-transparent" />
                  <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-green-500/40 to-transparent" />
                  <div className="absolute top-0 h-full w-1 bg-white rounded-full shadow-lg"
                    style={{ left: `calc(${score}% - 2px)` }} />
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">{scored.filter(s => s.net > 0).length} Bullish</span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">{scored.filter(s => s.net < 0).length} Bearish</span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400">{scored.filter(s => s.net === 0).length} Neutral</span>
                  <span className="text-white font-mono font-bold text-sm ml-auto">{score}/100</span>
                </div>
                <div className="space-y-2">
                  {scored.map((a, i) => {
                    const sentColor = a.net > 0 ? 'text-green-400' : a.net < 0 ? 'text-red-400' : 'text-gray-500';
                    const sentIcon  = a.net > 0 ? '▲' : a.net < 0 ? '▼' : '●';
                    return (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg bg-[#111] border border-[#2a2a2a] hover:border-indigo-500/40 hover:bg-[#161616] transition-all group">
                        <span className={`text-[11px] mt-0.5 shrink-0 font-bold ${sentColor}`}>{sentIcon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-xs leading-snug group-hover:text-white transition-colors line-clamp-2">{a.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-gray-600 text-[10px]">{a.source}</span>
                            <span className="text-gray-700 text-[10px]">·</span>
                            <span className="text-gray-600 text-[10px]">{a.time}</span>
                            {a.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">{a.category}</span>}
                          </div>
                        </div>
                        <ExternalLink size={11} className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5" />
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* News cards */}
          <div>
            <h2 className="text-white font-semibold mb-4">{SYM} News</h2>
            {newsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : news?.length ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {news.map(a => <NewsCard key={a.id} article={a} />)}
              </div>
            ) : (
              <p className="text-gray-500">No recent news for {SYM}.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
