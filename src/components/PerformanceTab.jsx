import { useState, useMemo, useEffect, useRef } from 'react';
import {
  ComposedChart, Area, BarChart, Bar, Line, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Info, Zap, Maximize2, Minimize2, Plus, X } from 'lucide-react';
import { useChart } from '../hooks/useYahoo';
import { usePersistedRange } from '../hooks/usePersistedRange';

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATIONS    = ['1M', '3M', '6M', 'YTD', '1Y', '2Y', '3Y', '5Y', '10Y', '15Y', '20Y'];
const WINDOWS      = ['7D', '14D', '30D', '90D'];
const RANGE_MAP    = { '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', 'YTD': 'ytd', '2Y': '2y', '3Y': '3y', '5Y': '5y', '10Y': '10y', '15Y': 'max', '20Y': 'max' };
const INTERVAL_MAP = { '1M': '1d', '3M': '1d', '6M': '1d', '1Y': '1d', 'YTD': '1d', '2Y': '1d', '3Y': '1d', '5Y': '1d', '10Y': '1d', '15Y': '1wk', '20Y': '1wk' };
const YEAR_FILTER  = { '15Y': 15, '20Y': 20 };
const WINDOW_DAYS  = { '7D': 7, '14D': 14, '30D': 30, '90D': 90 };
const CMP_COLORS   = ['#f59e0b', '#818cf8', '#34d399', '#f87171', '#fb923c', '#a3e635', '#22d3ee', '#e879f9', '#94a3b8', '#fbbf24'];

// ─── Stats & metrics ─────────────────────────────────────────────────────────

const METRIC_HINTS = {
  'Total Return': { formula: '(End − Start) / Start × 100',              detail: 'Percentage gain or loss over the selected period using closing prices.' },
  'Sharpe Ratio': { formula: '(Mean Return / Std Dev) × √(252 or 52)',   detail: '>1 is good, >2 is great, <0 means cash beat it. Auto-detects daily vs weekly data.' },
  'Max Drawdown': { formula: '(Trough − Peak) / Peak × 100',             detail: 'Largest peak-to-trough decline — worst-case loss a buy-and-hold investor faced.' },
  'Max Profit':   { formula: '(Period High − Period Low) / Low × 100',   detail: 'Best return if you bought at the period low and sold at the subsequent high.' },
};

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

function computeMetrics(ohlcv) {
  const nil = { totalReturn: 0, annReturn: 0, sharpe: 0, maxDD: 0, maxDDStart: null, maxDDEnd: null, maxDDPeakPrice: null, maxDDTroughPrice: null, startDate: null, startPrice: null, endDate: null, endPrice: null, maxProfit: 0, maxProfitLowDate: null, maxProfitLowPrice: null, maxProfitHighDate: null, maxProfitHighPrice: null };
  if (!ohlcv || ohlcv.length < 2) return nil;
  const days = ohlcv.length - 1, first = ohlcv[0].close, last = ohlcv.at(-1).close;
  const totalReturn = (last - first) / first * 100;
  const annReturn   = (Math.pow(last / first, 365 / Math.max(days, 1)) - 1) * 100;
  const rets   = ohlcv.slice(1).map((pt, i) => (pt.close - ohlcv[i].close) / ohlcv[i].close);
  const mean   = rets.reduce((s, r) => s + r, 0) / rets.length;
  const sd     = stdDev(rets);
  const dayGap = (new Date(ohlcv[1].date) - new Date(ohlcv[0].date)) / 86400000;
  const sharpe = sd === 0 ? 0 : +((mean / sd) * Math.sqrt(dayGap > 4 ? 52 : 252)).toFixed(2);
  let peak = -Infinity, peakIdx = 0, maxDD = 0, maxDDStart = null, maxDDEnd = null, maxDDPeakPrice = null, maxDDTroughPrice = null;
  let runMin = Infinity, runMinDate = null, maxProfit = 0, maxProfitLowDate = null, maxProfitLowPrice = null, maxProfitHighDate = null, maxProfitHighPrice = null;
  for (let i = 0; i < ohlcv.length; i++) {
    const { close, date } = ohlcv[i];
    if (close > peak) { peak = close; peakIdx = i; }
    const dd = (close - peak) / peak;
    if (dd < maxDD) { maxDD = dd; maxDDStart = ohlcv[peakIdx].date; maxDDEnd = date; maxDDPeakPrice = peak; maxDDTroughPrice = close; }
    if (close < runMin) { runMin = close; runMinDate = date; }
    const profit = (close - runMin) / runMin * 100;
    if (profit > maxProfit) { maxProfit = profit; maxProfitLowDate = runMinDate; maxProfitLowPrice = runMin; maxProfitHighDate = date; maxProfitHighPrice = close; }
  }
  return { totalReturn, annReturn, sharpe, maxDD: maxDD * 100, maxDDStart, maxDDEnd, maxDDPeakPrice, maxDDTroughPrice, startDate: ohlcv[0].date, startPrice: first, endDate: ohlcv.at(-1).date, endPrice: last, maxProfit, maxProfitLowDate, maxProfitLowPrice, maxProfitHighDate, maxProfitHighPrice };
}

function computeRolling(ohlcv, window) {
  if (!ohlcv || ohlcv.length <= window) return [];
  return ohlcv.slice(window).map((pt, i) => ({ date: pt.date, ret: +((pt.close - ohlcv[i].close) / ohlcv[i].close * 100).toFixed(2) }));
}

function toReturnSeries(ohlcv) {
  if (!ohlcv?.length) return [];
  const base = ohlcv[0].close;
  return ohlcv.map(pt => ({ date: pt.date, ret: +((pt.close - base) / base * 100).toFixed(3), price: pt.close }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, icon: Icon }) {
  const [hovered, setHovered] = useState(false);
  const hint = METRIC_HINTS[label];
  return (
    <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-gray-500 text-xs">{label}</span>
        {hint && (
          <button className="ml-auto text-gray-600 hover:text-gray-400 transition-colors"
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
            <Info size={12} />
          </button>
        )}
      </div>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-gray-600 text-[10px] mt-0.5 truncate">{sub}</p>}
      {hovered && hint && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#111] border border-[#3a3a3a] rounded-xl p-3 z-50 shadow-2xl pointer-events-none">
          <p className="text-gray-300 text-xs font-semibold mb-1">{label}</p>
          <p className="text-indigo-300 font-mono text-[10px] bg-indigo-500/10 rounded px-2 py-1 mb-2 break-all">{hint.formula}</p>
          <p className="text-gray-400 text-xs leading-relaxed">{hint.detail}</p>
          <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-[#111] border-r border-b border-[#3a3a3a] rotate-45" />
        </div>
      )}
    </div>
  );
}

const RollingTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value ?? 0;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-mono space-y-0.5">
      <p className="text-gray-400">{payload[0].payload.date}</p>
      <p className={v >= 0 ? 'text-green-400' : 'text-red-400'}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</p>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PerformanceTab({ symbol }) {
  const [duration,   setDuration]   = usePersistedRange(DURATIONS, '3M');
  const [rollingWin, setRollingWin] = useState('30D');
  const [chartMode,  setChartMode]  = useState('pct');
  const [pinA, setPinA] = useState(null);
  const [pinB, setPinB] = useState(null);
  const [isFull, setIsFull] = useState(false);
  const chartAreaRef = useRef();

  // Compare symbols (max 10, fixed hooks — Rules of Hooks)
  const [compareSyms, setCompareSyms] = useState([]);
  const [cmpInput, setCmpInput]       = useState('');

  const { data: cmpChart0 } = useChart(compareSyms[0] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart1 } = useChart(compareSyms[1] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart2 } = useChart(compareSyms[2] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart3 } = useChart(compareSyms[3] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart4 } = useChart(compareSyms[4] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart5 } = useChart(compareSyms[5] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart6 } = useChart(compareSyms[6] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart7 } = useChart(compareSyms[7] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart8 } = useChart(compareSyms[8] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const { data: cmpChart9 } = useChart(compareSyms[9] ?? null, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const cmpRawCharts = [cmpChart0, cmpChart1, cmpChart2, cmpChart3, cmpChart4,
                        cmpChart5, cmpChart6, cmpChart7, cmpChart8, cmpChart9];

  useEffect(() => {
    const handler = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  function toggleFull() {
    if (!document.fullscreenElement) chartAreaRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  const { data: maxChart } = useChart(symbol, '1mo', 'max');
  const availableYears = useMemo(() => {
    const raw = maxChart?.ohlcv;
    if (!raw?.length) return 100;
    return (Date.now() - new Date(raw[0].date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }, [maxChart]);

  const visibleDurations = useMemo(() =>
    DURATIONS.filter(d => {
      if (d === '10Y') return availableYears >= 10;
      if (d === '15Y') return availableYears >= 15;
      if (d === '20Y') return availableYears >= 20;
      return true;
    }),
    [availableYears],
  );

  useEffect(() => {
    if (!visibleDurations.includes(duration)) setDuration(visibleDurations.at(-1));
  }, [visibleDurations]);

  const { data: chart, loading } = useChart(symbol, INTERVAL_MAP[duration], RANGE_MAP[duration]);
  const ohlcv = useMemo(() => {
    const raw = chart?.ohlcv ?? [];
    const years = YEAR_FILTER[duration];
    if (!years || !raw.length) return raw;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    return raw.filter(pt => pt.date >= cutoff.toISOString().slice(0, 10));
  }, [chart, duration]);

  useEffect(() => { setPinA(null); setPinB(null); }, [symbol, duration]);
  useEffect(() => { setCompareSyms([]); setCmpInput(''); }, [symbol]);

  function handleChartClick(e) {
    const idx = e?.activeTooltipIndex;
    if (idx == null) return;
    if (pinA === null) { setPinA(idx); return; }
    if (pinB === null) { if (idx !== pinA) { setPinB(idx); return; } }
    setPinA(idx); setPinB(null);
  }

  function addCompare() {
    const syms = cmpInput.toUpperCase().split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    const toAdd = syms.filter(s => s !== symbol && !compareSyms.includes(s));
    if (!toAdd.length) return;
    setCompareSyms(prev => [...prev, ...toAdd].slice(0, 10));
    setCmpInput('');
  }

  function removeCompare(sym) {
    setCompareSyms(prev => prev.filter(s => s !== sym));
  }

  const isComparing = compareSyms.length > 0;
  const effectiveMode = isComparing ? 'pct' : chartMode;

  const selA = pinA !== null && pinB !== null ? Math.min(pinA, pinB) : null;
  const selB = pinA !== null && pinB !== null ? Math.max(pinA, pinB) : null;
  const isFullRange = selA === null;

  const selectedOhlcv = useMemo(() => selA !== null ? ohlcv.slice(selA, selB + 1) : ohlcv, [ohlcv, selA, selB]);
  const returnSeries  = useMemo(() => toReturnSeries(ohlcv), [ohlcv]);
  const metrics       = useMemo(() => computeMetrics(selectedOhlcv), [selectedOhlcv]);
  const rollingData   = useMemo(() => computeRolling(selectedOhlcv, WINDOW_DAYS[rollingWin]), [selectedOhlcv, rollingWin]);

  // ── Single-symbol chart data ────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!returnSeries.length) return [];
    const base = ohlcv[0]?.close || 1;
    return returnSeries.map(pt => ({
      ...pt,
      display: effectiveMode === 'price' ? pt.price : pt.ret,
    }));
  }, [returnSeries, effectiveMode, ohlcv]);

  // ── Multi-symbol compare data ───────────────────────────────────────────────
  const compareData = useMemo(() => {
    if (!isComparing || !ohlcv.length) return null;
    const base1 = ohlcv[0].close;
    const active = compareSyms.map((sym, i) => {
      const ch = cmpRawCharts[i];
      if (!ch?.ohlcv?.length) return null;
      const base = ch.ohlcv[0].close;
      return { sym, color: CMP_COLORS[i], map: new Map(ch.ohlcv.map(d => [d.date, +((d.close / base - 1) * 100).toFixed(3)])) };
    }).filter(Boolean);

    return ohlcv.map(d => {
      const row = { date: d.date, [symbol]: +((d.close / base1 - 1) * 100).toFixed(3) };
      active.forEach(({ sym, map }) => { row[sym] = map.get(d.date) ?? null; });
      return row;
    });
  }, [isComparing, ohlcv, symbol, compareSyms, cmpChart0, cmpChart1, cmpChart2, cmpChart3]);

  const xTicks = useMemo(() => {
    const src = isComparing ? compareData : chartData;
    if (!src?.length || src.length <= 6) return src?.map(p => p.date) ?? [];
    const step = Math.floor(src.length / 5);
    return src.filter((_, i) => i % step === 0 || i === src.length - 1).map(p => p.date);
  }, [chartData, compareData, isComparing]);

  const up      = metrics.totalReturn >= 0;
  const stroke  = up ? '#22c55e' : '#ef4444';
  const gradId  = up ? 'ptGG' : 'ptRG';
  const fmtPct  = (n, d = 2) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;
  const mainH   = isFull ? 440 : 240;
  const subH    = isFull ? 160 : 120;

  // ── Tooltip ─────────────────────────────────────────────────────────────────
  const ChartTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-mono space-y-0.5 min-w-[130px]">
        <p className="text-gray-400 mb-1">{d?.date}</p>
        {isComparing ? (
          payload.map(p => p.value != null && (
            <div key={p.dataKey} className="flex justify-between gap-3">
              <span style={{ color: p.stroke ?? p.color }} className="font-bold">{p.dataKey}</span>
              <span className={p.value >= 0 ? 'text-green-400' : 'text-red-400'}>
                {p.value >= 0 ? '+' : ''}{p.value.toFixed(2)}%
              </span>
            </div>
          ))
        ) : (
          <>
            <p className="text-white">${d?.price?.toFixed(2)}</p>
            <p className={d?.ret >= 0 ? 'text-green-400' : 'text-red-400'}>{d?.ret >= 0 ? '+' : ''}{d?.ret?.toFixed(2)}%</p>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* Duration + period dates */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-gray-500 text-xs uppercase tracking-wider">Duration</span>
          <div className="flex flex-wrap gap-1.5">
            {visibleDurations.map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  duration === d ? 'bg-indigo-600 text-white' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>{d}
              </button>
            ))}
          </div>
        </div>
        {ohlcv.length > 0 && (
          <p className="text-gray-600 text-xs mt-1.5 font-mono">
            {ohlcv[0].date} → {ohlcv.at(-1).date}
            <span className="ml-2 text-gray-700">({ohlcv.length} {INTERVAL_MAP[duration] === '1wk' ? 'weeks' : 'days'})</span>
          </p>
        )}
      </div>

      {/* Compare bar */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-gray-400 text-sm font-medium shrink-0">Compare with <span className="text-gray-600 text-xs font-normal">({compareSyms.length}/10)</span></span>
          {/* Added symbols */}
          {compareSyms.map((sym, i) => (
            <span key={sym} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: `${CMP_COLORS[i]}20`, color: CMP_COLORS[i], border: `1px solid ${CMP_COLORS[i]}40` }}>
              {sym}
              <button onClick={() => removeCompare(sym)} className="hover:opacity-70 transition-opacity">
                <X size={11} />
              </button>
            </span>
          ))}
          {/* Input */}
          {compareSyms.length < 10 && (
            <form onSubmit={e => { e.preventDefault(); addCompare(); }} className="flex items-center gap-2">
              <input
                value={cmpInput}
                onChange={e => setCmpInput(e.target.value.toUpperCase())}
                placeholder="AAPL, MSFT…"
                maxLength={60}
                className="w-40 bg-[#111] border border-[#3a3a3a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 font-mono uppercase focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button type="submit"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors">
                <Plus size={12} /> Add
              </button>
            </form>
          )}
          {isComparing && (
            <button onClick={() => setCompareSyms([])}
              className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors">
              Clear all
            </button>
          )}
        </div>
        {isComparing && (
          <p className="text-gray-600 text-[10px] mt-2">
            Showing normalized % return from period start · Price mode locked to % change when comparing
          </p>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Total Return" value={fmtPct(metrics.totalReturn)}
          sub={metrics.startDate ? `$${metrics.startPrice?.toFixed(2)} (${metrics.startDate}) → $${metrics.endPrice?.toFixed(2)} (${metrics.endDate})` : '—'}
          color={up ? 'text-green-400' : 'text-red-400'} icon={up ? TrendingUp : TrendingDown} />
        <MetricCard label="Max Profit" value={fmtPct(metrics.maxProfit)}
          sub={metrics.maxProfitLowDate ? `$${metrics.maxProfitLowPrice?.toFixed(2)} (${metrics.maxProfitLowDate}) → $${metrics.maxProfitHighPrice?.toFixed(2)} (${metrics.maxProfitHighDate})` : 'Buy low → sell high'}
          color="text-emerald-400" icon={Zap} />
        <MetricCard label="Sharpe Ratio" value={metrics.sharpe.toFixed(2)} sub="Risk-adjusted return"
          color={metrics.sharpe >= 1 ? 'text-indigo-400' : metrics.sharpe >= 0 ? 'text-gray-300' : 'text-red-400'} icon={Activity} />
        <MetricCard label="Max Drawdown" value={`${metrics.maxDD.toFixed(2)}%`}
          sub={metrics.maxDDStart ? `$${metrics.maxDDPeakPrice?.toFixed(2)} (${metrics.maxDDStart}) → $${metrics.maxDDTroughPrice?.toFixed(2)} (${metrics.maxDDEnd})` : 'Peak-to-trough'}
          color="text-red-400" icon={TrendingDown} />
      </div>

      {/* Chart area */}
      <div ref={chartAreaRef} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 space-y-3"
        style={isFull ? { backgroundColor: '#0a0a0a', overflow: 'auto' } : {}}>

        {/* Chart header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-white font-semibold">
              {isComparing
                ? `${[symbol, ...compareSyms].join(' vs ')} — % Return`
                : `${symbol} — ${duration} ${effectiveMode === 'pct' ? '% Return' : 'Price'}`}
            </h2>
            {pinA !== null && pinB === null && (
              <p className="text-yellow-500 text-xs font-mono mt-0.5 animate-pulse">Click a second point to set the end</p>
            )}
            {!isFullRange && selectedOhlcv.length > 0 && (
              <p className="text-indigo-400 text-xs font-mono mt-0.5">
                ${ohlcv[selA]?.close?.toFixed(2)} → ${ohlcv[selB]?.close?.toFixed(2)}
                <span className="text-gray-600 mx-1">·</span>
                {selectedOhlcv[0].date} → {selectedOhlcv.at(-1).date}
                <button onClick={() => { setPinA(null); setPinB(null); }} className="ml-2 text-gray-500 hover:text-gray-300 underline">clear</button>
              </p>
            )}
            {isFullRange && pinA === null && !isComparing && (
              <p className="text-gray-600 text-xs mt-0.5">Click two points to measure a range</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {returnSeries.length > 0 && (
              <span className={`text-sm font-mono font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(metrics.totalReturn)}</span>
            )}
            {!isComparing && (
              <div className="flex rounded-lg overflow-hidden border border-[#2a2a2a]">
                {[['pct', '% Change'], ['price', 'Price']].map(([mode, lbl]) => (
                  <button key={mode} onClick={() => setChartMode(mode)}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${chartMode === mode ? 'bg-indigo-600 text-white' : 'bg-[#111] text-gray-400 hover:text-white'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            )}
            <button onClick={toggleFull} title={isFull ? 'Exit fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-lg bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40 transition-colors">
              {isFull ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>

        {/* Legend when comparing */}
        {isComparing && (
          <div className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1.5 text-[11px]" style={{ color: stroke }}>
              <span className="w-4 h-0.5 bg-current inline-block rounded" /> {symbol}
            </span>
            {compareSyms.map((sym, i) => (
              <span key={sym} className="flex items-center gap-1.5 text-[11px]" style={{ color: CMP_COLORS[i] }}>
                <span className="w-4 h-0.5 bg-current inline-block rounded" /> {sym}
              </span>
            ))}
          </div>
        )}

        {/* Main chart */}
        {loading ? (
          <div className="bg-[#111] rounded-lg animate-pulse" style={{ height: mainH }} />
        ) : (isComparing ? compareData : chartData)?.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-16">No data available</p>
        ) : isComparing ? (
          // ── Compare mode ──────────────────────────────────────────────────
          <div style={{ height: mainH }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={compareData} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="ptGG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="ptRG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" ticks={xTicks} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={45}
                  tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                <ReferenceLine y={0} stroke="#2a2a2a" strokeDasharray="3 3" />
                <Tooltip content={<ChartTooltip />} />
                {/* Primary symbol as area */}
                <Area type="monotone" dataKey={symbol} stroke={stroke} strokeWidth={2}
                  fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
                {/* Compare symbols as lines */}
                {compareSyms.map((sym, i) => (
                  <Line key={sym} type="monotone" dataKey={sym} stroke={CMP_COLORS[i]}
                    strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          // ── Single-symbol mode ────────────────────────────────────────────
          <div style={{ height: mainH }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 16, right: 0, bottom: 0, left: 0 }}
                onClick={handleChartClick} style={{ cursor: 'crosshair' }}>
                <defs>
                  <linearGradient id="ptGG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="ptRG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" ticks={xTicks} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false}
                  width={effectiveMode === 'price' ? 60 : 45}
                  tickFormatter={effectiveMode === 'price'
                    ? v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`
                    : v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                {effectiveMode === 'pct' && <ReferenceLine y={0} stroke="#2a2a2a" strokeDasharray="3 3" />}
                <Tooltip content={<ChartTooltip />} />
                {selA !== null && <ReferenceArea x1={chartData[selA]?.date} x2={chartData[selB]?.date} fill="#6366f1" fillOpacity={0.1} strokeOpacity={0} />}
                {pinA !== null && chartData[pinA] && (
                  <ReferenceLine x={chartData[pinA].date} stroke="#6366f1" strokeWidth={2}
                    label={{ value: `$${ohlcv[pinA]?.close?.toFixed(2)}`, position: 'top', fill: '#818cf8', fontSize: 10, fontFamily: 'monospace' }} />
                )}
                {pinB !== null && chartData[pinB] && (
                  <ReferenceLine x={chartData[pinB].date} stroke="#22c55e" strokeWidth={2}
                    label={{ value: `$${ohlcv[pinB]?.close?.toFixed(2)}`, position: 'top', fill: '#4ade80', fontSize: 10, fontFamily: 'monospace' }} />
                )}
                <Area type="monotone" dataKey={effectiveMode === 'pct' ? 'ret' : 'price'}
                  stroke={stroke} strokeWidth={2} fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Rolling returns */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-white font-semibold">Rolling {rollingWin} Returns — {symbol}</h2>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Window</span>
            <div className="flex gap-1.5">
              {WINDOWS.map(w => (
                <button key={w} onClick={() => setRollingWin(w)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    rollingWin === w ? 'bg-indigo-600 text-white' : 'bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white'
                  }`}>{w}
                </button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="h-[180px] bg-[#111] rounded-lg animate-pulse" />
        ) : rollingData.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">
            {ohlcv.length === 0 ? 'No data available' : 'Not enough data — try a shorter window or longer duration.'}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rollingData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <ReferenceLine y={0} stroke="#3a3a3a" />
              <Tooltip content={<RollingTooltip />} />
              <Bar dataKey="ret" isAnimationActive={false} radius={[2, 2, 0, 0]}>
                {rollingData.map((e, i) => <Cell key={i} fill={e.ret >= 0 ? '#22c55e' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
