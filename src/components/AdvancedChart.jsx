import { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart, Area, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { Maximize2, Minimize2, Activity } from 'lucide-react';
import { fmt$ } from '../services/yahooApi';
import { useCompareCharts, CMP_COLORS } from '../hooks/useCompareCharts';
import CompareBar from './CompareBar';

// ── Indicator math ────────────────────────────────────────────────────────────

function calcEMA(arr, period) {
  const k = 2 / (period + 1);
  const out = new Array(arr.length).fill(null);
  let count = 0, sum = 0, prev = null;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] == null) continue;
    sum += arr[i];
    count++;
    if (count < period) continue;
    if (count === period) { prev = sum / period; out[i] = +prev.toFixed(4); continue; }
    prev = arr[i] * k + prev * (1 - k);
    out[i] = +prev.toFixed(4);
  }
  return out;
}

function calcRSI(prices, period = 14) {
  const out = new Array(prices.length).fill(null);
  if (prices.length <= period) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d >= 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  out[period] = al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2);
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = al === 0 ? 100 : +(100 - 100 / (1 + ag / al)).toFixed(2);
  }
  return out;
}

function calcBB(prices, period = 20, mult = 2) {
  const upper = new Array(prices.length).fill(null);
  const mid   = new Array(prices.length).fill(null);
  const lower = new Array(prices.length).fill(null);
  for (let i = period - 1; i < prices.length; i++) {
    const sl   = prices.slice(i - period + 1, i + 1);
    const mean = sl.reduce((a, b) => a + b, 0) / period;
    const sd   = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    mid[i]   = +mean.toFixed(4);
    upper[i] = +(mean + mult * sd).toFixed(4);
    lower[i] = +(mean - mult * sd).toFixed(4);
  }
  return { upper, mid, lower };
}

function calcMACD(prices) {
  const e12  = calcEMA(prices, 12);
  const e26  = calcEMA(prices, 26);
  const macd = e12.map((v, i) => v != null && e26[i] != null ? +(v - e26[i]).toFixed(4) : null);
  const sig  = calcEMA(macd, 9);
  const hist = macd.map((v, i) => v != null && sig[i] != null ? +(v - sig[i]).toFixed(4) : null);
  return { macd, sig, hist };
}

function useIndicators(ohlcv) {
  return useMemo(() => {
    if (!ohlcv?.length) return [];
    const prices = ohlcv.map(d => d.price);
    const e9   = calcEMA(prices, 9);
    const e21  = calcEMA(prices, 21);
    const bb   = calcBB(prices);
    const rsi  = calcRSI(prices);
    const macd = calcMACD(prices);
    return ohlcv.map((d, i) => ({
      ...d,
      ema9:   e9[i],
      ema21:  e21[i],
      bbU:    bb.upper[i],
      bbM:    bb.mid[i],
      bbL:    bb.lower[i],
      rsi:    rsi[i],
      macd:   macd.macd[i],
      signal: macd.sig[i],
      hist:   macd.hist[i],
    }));
  }, [ohlcv]);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const RANGES = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y'];
const RANGE_MAP = {
  '1D':  { interval: '5m',  range: '1d'  },
  '5D':  { interval: '30m', range: '5d'  },
  '1M':  { interval: '1d',  range: '1mo' },
  '3M':  { interval: '1d',  range: '3mo' },
  '6M':  { interval: '1d',  range: '6mo' },
  'YTD': { interval: '1d',  range: 'ytd' },
  '1Y':  { interval: '1d',  range: '1y'  },
  '2Y':  { interval: '1wk', range: '2y'  },
  '3Y':  { interval: '1wk', range: '3y'  },
  '5Y':  { interval: '1wk', range: '5y'  },
};
const TT = { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 11 };

const IND_META = [
  { key: 'ema9',  label: 'EMA 9',         color: '#f59e0b', desc: 'Fast exponential moving average — signals short-term momentum.' },
  { key: 'ema21', label: 'EMA 21',        color: '#818cf8', desc: 'Medium-term EMA — crossover with EMA 9 signals trend changes.' },
  { key: 'bb',    label: 'Bollinger Bands', color: '#67e8f9', desc: '20-period bands (±2σ) — shows volatility and overbought/oversold zones.' },
  { key: 'rsi',   label: 'RSI (14)',      color: '#a78bfa', desc: 'Relative Strength Index — below 30 oversold, above 70 overbought.' },
  { key: 'macd',  label: 'MACD',          color: '#34d399', desc: '12/26 EMA difference with 9-period signal — shows momentum shifts.' },
];

function IndBtn({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={active ? { borderColor: color, color } : {}}
      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
        active ? 'bg-white/5' : 'border-[#2a2a2a] text-gray-500 hover:text-gray-300 hover:border-gray-600'
      }`}
    >
      {label}
    </button>
  );
}

function PriceTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={TT} className="p-2.5 min-w-[150px]">
      <p className="text-gray-400 text-[10px] mb-1.5">{label}</p>
      {payload.map(p => p.value != null && (
        <div key={p.dataKey} className="flex justify-between gap-3 leading-5">
          <span style={{ color: p.color ?? '#9ca3af' }} className="text-[10px]">{p.name}</span>
          <span className="text-white font-mono text-[10px]">
            {p.dataKey === 'volume' ? p.value.toLocaleString() : fmt$(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdvancedChart({ ohlcv, color, symbol, range, onRangeChange }) {
  const [ind, setInd]           = useState({ ema9: false, ema21: false, bb: false, rsi: false, macd: false });
  const [fullscreen, setFs]     = useState(false);
  const [compareSyms, setCmpSyms] = useState([]);

  const { interval: cmpInterval, range: cmpRange } = RANGE_MAP[range] ?? RANGE_MAP['3M'];
  const cmpCharts = useCompareCharts(compareSyms, cmpInterval, cmpRange);

  const data = useIndicators(ohlcv);

  // Normalised compare data — % return from first point
  const compareData = useMemo(() => {
    if (!compareSyms.length || !ohlcv?.length) return [];
    return compareSyms.map((sym, i) => {
      const raw = cmpCharts[i]?.ohlcv;
      if (!raw?.length) return null;
      const base = raw[0].price ?? raw[0].close;
      return { sym, color: CMP_COLORS[i], points: raw.map(d => ({ date: d.date, pct: +((((d.price ?? d.close) - base) / base) * 100).toFixed(2) })) };
    }).filter(Boolean);
  }, [compareSyms, cmpCharts, ohlcv]);

  const isComparing = compareSyms.length > 0;

  // Primary series as % return when comparing
  const primaryPct = useMemo(() => {
    if (!isComparing || !ohlcv?.length) return null;
    const base = ohlcv[0].price ?? ohlcv[0].close;
    return ohlcv.map(d => ({ date: d.date, pct: +((((d.price ?? d.close) - base) / base) * 100).toFixed(2) }));
  }, [isComparing, ohlcv]);

  function addSymbols(syms) { setCmpSyms(p => [...p, ...syms.filter(s => s !== symbol && !p.includes(s))].slice(0, 10)); }
  function removeCompare(sym) { setCmpSyms(p => p.filter(s => s !== sym)); }

  // Escape → exit fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const h = e => { if (e.key === 'Escape') setFs(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fullscreen]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [fullscreen]);

  const toggle = key => setInd(p => ({ ...p, [key]: !p[key] }));

  const xInterval  = Math.max(1, Math.floor(data.length / 8));
  const xFmt       = d => (d ?? '').slice(5);

  const priceMin = useMemo(() => {
    let mn = Infinity;
    for (const d of data) {
      const v = ind.bb && d.bbL != null ? d.bbL : d.price;
      if (v < mn) mn = v;
    }
    return mn === Infinity ? 'auto' : mn * 0.998;
  }, [data, ind.bb]);

  const priceMax = useMemo(() => {
    let mx = -Infinity;
    for (const d of data) {
      const v = ind.bb && d.bbU != null ? d.bbU : d.price;
      if (v > mx) mx = v;
    }
    return mx === -Infinity ? 'auto' : mx * 1.002;
  }, [data, ind.bb]);

  // ── Toolbar (range + fullscreen only) ───────────────────────────────────────
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {RANGES.map(r => (
          <button key={r} onClick={() => onRangeChange(r)}
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              r === range ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white hover:bg-white/5'
            }`}>
            {r}
          </button>
        ))}
      </div>
      <button onClick={() => setFs(f => !f)}
        title={fullscreen ? 'Exit fullscreen (Esc)' : 'Expand to fullscreen'}
        className="ml-auto p-1.5 rounded-lg border border-[#2a2a2a] text-gray-500 hover:text-white hover:border-gray-500 transition-colors">
        {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );

  // ── Technical Indicators section ─────────────────────────────────────────────
  const last = data[data.length - 1];
  const indicatorsPanel = (
    <div className="border border-[#2a2a2a] rounded-xl p-4 bg-[#111]">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={13} className="text-indigo-400" />
        <span className="text-white text-xs font-semibold">Technical Indicators</span>
        <span className="text-gray-600 text-[10px]">click to toggle overlay / sub-chart</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {IND_META.map(({ key, label, color, desc }) => {
          const active = ind[key];
          const curVal = last ? (
            key === 'ema9'  ? last.ema9  :
            key === 'ema21' ? last.ema21 :
            key === 'bb'    ? last.bbM   :
            key === 'rsi'   ? last.rsi   :
            key === 'macd'  ? last.macd  : null
          ) : null;
          return (
            <button key={key} onClick={() => toggle(key)}
              style={active ? { borderColor: color + '60' } : {}}
              className={`text-left p-3 rounded-lg border transition-all ${
                active ? 'bg-white/5' : 'border-[#2a2a2a] hover:border-gray-600'
              }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? color : '#4b5563' }} />
                  <span className="text-xs font-semibold" style={{ color: active ? color : '#9ca3af' }}>{label}</span>
                </div>
                {active && curVal != null && (
                  <span className="text-[10px] font-mono text-white">
                    {key === 'rsi' ? curVal.toFixed(1) : fmt$(curVal)}
                  </span>
                )}
                {!active && (
                  <span className="text-[10px] text-gray-600">off</span>
                )}
              </div>
              <p className="text-[10px] text-gray-600 leading-relaxed">{desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Chart panels ─────────────────────────────────────────────────────────────
  const panels = (
    <div className={`flex flex-col gap-2 ${fullscreen ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>

      {/* Price / Compare */}
      <div className={fullscreen ? 'flex-1 min-h-0' : 'h-[340px]'}>
        {isComparing ? (
          /* ── Compare mode: normalised % return multi-line chart ── */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false}
                axisLine={false} tickFormatter={xFmt} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={48}
                tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`} />
              <ReferenceLine y={0} stroke="#374151" strokeDasharray="4 2" />
              <Tooltip contentStyle={TT} labelStyle={{ color: '#9ca3af', fontSize: 10 }}
                formatter={(v, name) => [`${v >= 0 ? '+' : ''}${v?.toFixed(2)}%`, name]} />
              {/* Primary symbol */}
              {primaryPct && (
                <Line data={primaryPct} type="monotone" dataKey="pct" stroke={color} strokeWidth={2}
                  dot={false} name={symbol} isAnimationActive={false} connectNulls />
              )}
              {/* Compare symbols */}
              {compareData.map(({ sym, color: c, points }) => (
                <Line key={sym} data={points} type="monotone" dataKey="pct" stroke={c} strokeWidth={1.5}
                  dot={false} name={sym} isAnimationActive={false} connectNulls />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          /* ── Normal mode: price area + indicators ── */
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="acg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={color} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false}
                axisLine={false} tickFormatter={xFmt} interval={xInterval} />
              <YAxis domain={[priceMin, priceMax]} tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false} axisLine={false} width={64}
                tickFormatter={v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`} />
              <Tooltip content={<PriceTip />} />
              {ind.bb && <>
                <Line dataKey="bbU" stroke="#67e8f9" strokeWidth={1} dot={false} name="BB Upper"
                  strokeDasharray="5 3" isAnimationActive={false} connectNulls={false} />
                <Line dataKey="bbM" stroke="#67e8f9" strokeWidth={0.8} dot={false} name="BB Mid"
                  strokeOpacity={0.5} isAnimationActive={false} connectNulls={false} />
                <Line dataKey="bbL" stroke="#67e8f9" strokeWidth={1} dot={false} name="BB Lower"
                  strokeDasharray="5 3" isAnimationActive={false} connectNulls={false} />
              </>}
              <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2}
                fill="url(#acg)" dot={false} isAnimationActive={false} name={symbol} />
              {ind.ema9  && <Line dataKey="ema9"  stroke="#f59e0b" strokeWidth={1.5} dot={false}
                name="EMA 9"  isAnimationActive={false} connectNulls={false} />}
              {ind.ema21 && <Line dataKey="ema21" stroke="#818cf8" strokeWidth={1.5} dot={false}
                name="EMA 21" isAnimationActive={false} connectNulls={false} />}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* RSI */}
      {ind.rsi && (
        <div className={fullscreen ? 'h-[110px] shrink-0' : 'h-[100px]'}>
          <p className="text-[10px] text-gray-500 mb-0.5 pl-1">RSI (14)</p>
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart data={data} margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="date" hide />
              <YAxis domain={[0, 100]} ticks={[30, 50, 70]} width={28}
                tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TT} labelStyle={{ color: '#9ca3af', fontSize: 10 }}
                formatter={v => v != null ? [v.toFixed(2), 'RSI'] : ['—', 'RSI']} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeOpacity={0.5} />
              <ReferenceLine y={50} stroke="#374151" strokeDasharray="4 2" />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.5} />
              <Line dataKey="rsi" stroke="#a78bfa" strokeWidth={1.5} dot={false}
                name="RSI" isAnimationActive={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* MACD */}
      {ind.macd && (
        <div className={fullscreen ? 'h-[110px] shrink-0' : 'h-[100px]'}>
          <p className="text-[10px] text-gray-500 mb-0.5 pl-1">MACD (12, 26, 9)</p>
          <ResponsiveContainer width="100%" height="85%">
            <ComposedChart data={data} margin={{ top: 2, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="date" hide />
              <YAxis width={40} tick={{ fontSize: 9, fill: '#6b7280' }} tickLine={false} axisLine={false}
                tickFormatter={v => v.toFixed(1)} />
              <Tooltip contentStyle={TT} labelStyle={{ color: '#9ca3af', fontSize: 10 }}
                formatter={(v, name) => v != null ? [v.toFixed(4), name] : ['—', name]} />
              <ReferenceLine y={0} stroke="#374151" />
              <Bar dataKey="hist" isAnimationActive={false} name="Histogram" radius={[1, 1, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={(d.hist ?? 0) >= 0 ? '#34d399' : '#f87171'} fillOpacity={0.65} />
                ))}
              </Bar>
              <Line dataKey="macd"   stroke="#34d399" strokeWidth={1.5} dot={false}
                name="MACD"   isAnimationActive={false} connectNulls={false} />
              <Line dataKey="signal" stroke="#f59e0b" strokeWidth={1.5} dot={false}
                name="Signal" isAnimationActive={false} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Volume */}
      <div className={fullscreen ? 'h-[70px] shrink-0' : 'h-[65px]'}>
        <p className="text-[10px] text-gray-500 mb-0.5 pl-1">Volume</p>
        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart data={data} margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" hide />
            <YAxis hide />
            <Tooltip contentStyle={TT} labelStyle={{ color: '#9ca3af', fontSize: 10 }}
              formatter={v => [v?.toLocaleString(), 'Volume']} />
            <Bar dataKey="volume" fill="#6366f1" opacity={0.5} radius={[1, 1, 0, 0]}
              isAnimationActive={false} name="Volume" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const compareBar = (
    <CompareBar
      compareSyms={compareSyms}
      onAdd={addSymbols}
      onRemove={removeCompare}
      onClear={() => setCmpSyms([])}
      primarySymbol={symbol}
    />
  );

  // ── Fullscreen ───────────────────────────────────────────────────────────────
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0a0a0a] flex flex-col p-5 gap-3 overflow-y-auto">
        <div className="shrink-0">
          <div className="flex items-baseline gap-3 mb-3">
            <h2 className="text-white font-bold text-xl">{symbol}</h2>
            <span className="text-gray-500 text-sm">Advanced Chart · Press Esc to exit</span>
          </div>
          {toolbar}
          {compareBar}
        </div>
        {panels}
        <div className="shrink-0">{indicatorsPanel}</div>
      </div>
    );
  }

  // ── Normal ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {toolbar}
      {compareBar}
      {panels}
      {indicatorsPanel}
    </div>
  );
}
