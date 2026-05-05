import { useState, useMemo, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, BarChart2, Info, Zap } from 'lucide-react';
import { useChart } from '../hooks/useYahoo';

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATIONS = ['1M', '3M', '6M', '1Y', 'YTD', '2Y', '3Y', '5Y', '10Y', '15Y', '20Y'];
const WINDOWS   = ['7D', '14D', '30D', '90D'];
const POPULAR   = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'META', 'AMZN', 'GOOGL', 'SPY', 'QQQ', 'GLD', 'BTC-USD'];

const DURATION_TO_RANGE = { '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', 'YTD': 'ytd', '2Y': '2y', '3Y': '3y', '5Y': '5y', '10Y': '10y', '15Y': 'max', '20Y': 'max' };
const INTERVAL_MAP      = { '1M': '1d', '3M': '1d', '6M': '1d', '1Y': '1d', 'YTD': '1d', '2Y': '1d', '3Y': '1d', '5Y': '1d', '10Y': '1d', '15Y': '1wk', '20Y': '1wk' };
const YEAR_FILTER       = { '15Y': 15, '20Y': 20 };
const WINDOW_DAYS       = { '7D': 7, '14D': 14, '30D': 30, '90D': 90 };

// ─── Stats helpers ────────────────────────────────────────────────────────────

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

function computeMetrics(ohlcv) {
  if (!ohlcv || ohlcv.length < 2) return {
    totalReturn: 0, annReturn: 0, sharpe: 0,
    maxDD: 0, maxDDStart: null, maxDDEnd: null, maxDDPeakPrice: null, maxDDTroughPrice: null,
    startDate: null, startPrice: null, endDate: null, endPrice: null,
    maxProfit: 0, maxProfitLowDate: null, maxProfitLowPrice: null, maxProfitHighDate: null, maxProfitHighPrice: null,
  };
  const days  = ohlcv.length - 1;
  const first = ohlcv[0].close;
  const last  = ohlcv[ohlcv.length - 1].close;

  const totalReturn = ((last - first) / first) * 100;
  const annReturn   = (Math.pow(last / first, 365 / Math.max(days, 1)) - 1) * 100;

  const dailyRets = ohlcv.slice(1).map((pt, i) => (pt.close - ohlcv[i].close) / ohlcv[i].close);
  const meanRet   = dailyRets.reduce((s, r) => s + r, 0) / dailyRets.length;
  const sd        = stdDev(dailyRets);
  const dayGap    = ohlcv.length > 1 ? (new Date(ohlcv[1].date) - new Date(ohlcv[0].date)) / (24 * 60 * 60 * 1000) : 1;
  const annFactor = dayGap > 4 ? 52 : 252;
  const sharpe    = sd === 0 ? 0 : +((meanRet / sd) * Math.sqrt(annFactor)).toFixed(2);

  let peak = -Infinity, peakIdx = 0, maxDD = 0, maxDDStart = null, maxDDEnd = null, maxDDPeakPrice = null, maxDDTroughPrice = null;
  let runMin = Infinity, runMinDate = null, maxProfit = 0;
  let maxProfitLowDate = null, maxProfitLowPrice = null, maxProfitHighDate = null, maxProfitHighPrice = null;
  for (let i = 0; i < ohlcv.length; i++) {
    const { close, date } = ohlcv[i];
    if (close > peak) { peak = close; peakIdx = i; }
    const dd = (close - peak) / peak;
    if (dd < maxDD) { maxDD = dd; maxDDStart = ohlcv[peakIdx].date; maxDDEnd = date; maxDDPeakPrice = peak; maxDDTroughPrice = close; }
    if (close < runMin) { runMin = close; runMinDate = date; }
    const profit = (close - runMin) / runMin * 100;
    if (profit > maxProfit) {
      maxProfit = profit;
      maxProfitLowDate = runMinDate; maxProfitLowPrice = runMin;
      maxProfitHighDate = date;      maxProfitHighPrice = close;
    }
  }

  return {
    totalReturn, annReturn, sharpe,
    maxDD: maxDD * 100, maxDDStart, maxDDEnd, maxDDPeakPrice, maxDDTroughPrice,
    startDate: ohlcv[0].date, startPrice: first,
    endDate: ohlcv.at(-1).date, endPrice: last,
    maxProfit, maxProfitLowDate, maxProfitLowPrice, maxProfitHighDate, maxProfitHighPrice,
  };
}

function computeRolling(ohlcv, windowDays) {
  if (!ohlcv || ohlcv.length <= windowDays) return [];
  return ohlcv.slice(windowDays).map((pt, i) => ({
    date: pt.date,
    ret:  +((pt.close - ohlcv[i].close) / ohlcv[i].close * 100).toFixed(2),
  }));
}

// Normalize close prices to % return from period start
function toReturnSeries(ohlcv) {
  if (!ohlcv?.length) return [];
  const base = ohlcv[0].close;
  return ohlcv.map(pt => ({
    date: pt.date,
    ret:  +((pt.close - base) / base * 100).toFixed(3),
    price: pt.close,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const METRIC_HINTS = {
  'Total Return': {
    formula: '(End Price − Start Price) / Start Price × 100',
    detail:  'Measures the simple percentage gain or loss over the selected period, using closing prices.',
  },
'Sharpe Ratio': {
    formula: '(Mean Daily Return / Std Dev) × √252',
    detail:  'Risk-adjusted return per unit of volatility. >1 is good, >2 is great, <0 means risk-free cash was better.',
  },
  'Max Drawdown': {
    formula: '(Trough Price − Peak Price) / Peak Price × 100',
    detail:  'Largest peak-to-trough decline in the period. Shows worst-case loss a buy-and-hold investor would have faced.',
  },
  'Max Profit': {
    formula: '(Period High − Period Low) / Period Low × 100',
    detail:  'Best possible return if you bought at the period low and sold at the subsequent period high. Represents the maximum theoretical upside available in the period.',
  },
};

function MetricCard({ label, value, sub, color, icon: Icon }) {
  const [hovered, setHovered] = useState(false);
  const hint = METRIC_HINTS[label];

  return (
    <div className="relative bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={color} />
        <span className="text-gray-500 text-xs">{label}</span>
        {hint && (
          <button
            className="ml-auto text-gray-600 hover:text-gray-400 transition-colors"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            aria-label={`How ${label} is calculated`}
          >
            <Info size={12} />
          </button>
        )}
      </div>
      <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
      {sub && <p className="text-gray-600 text-xs mt-0.5">{sub}</p>}

      {hovered && hint && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#111] border border-[#3a3a3a] rounded-xl p-3 z-50 shadow-2xl pointer-events-none">
          <p className="text-gray-300 text-xs font-semibold mb-1">{label}</p>
          <p className="text-indigo-300 font-mono text-[10px] bg-indigo-500/10 rounded px-2 py-1 mb-2 break-all">
            {hint.formula}
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">{hint.detail}</p>
          <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-[#111] border-r border-b border-[#3a3a3a] rotate-45" />
        </div>
      )}
    </div>
  );
}

const PriceTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { date, ret, price } = payload[0].payload;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-mono space-y-0.5">
      <p className="text-gray-400">{date}</p>
      <p className="text-white">${price?.toFixed(2)}</p>
      <p className={ret >= 0 ? 'text-green-400' : 'text-red-400'}>{ret >= 0 ? '+' : ''}{ret?.toFixed(2)}%</p>
    </div>
  );
};

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

function ChartSkeleton({ height }) {
  return <div className={`h-[${height}px] bg-[#111] rounded-lg animate-pulse`} style={{ height }} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Performance() {
  const [symbol, setSymbol]       = useState('AAPL');
  const [input, setInput]         = useState('');
  const [duration, setDuration]   = useState('3M');
  const [rollingWin, setRollingWin] = useState('30D');
  const [chartMode, setChartMode]   = useState('pct');

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

  const range    = DURATION_TO_RANGE[duration];
  const interval = INTERVAL_MAP[duration];
  const { data: chart, loading } = useChart(symbol, interval, range);

  const ohlcv = useMemo(() => {
    const raw = chart?.ohlcv ?? [];
    const years = YEAR_FILTER[duration];
    if (!years || !raw.length) return raw;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - years);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return raw.filter(pt => pt.date >= cutoffStr);
  }, [chart, duration]);

  // Click-to-pin: first click = start point, second click = end point, third = reset
  const [pinA, setPinA] = useState(null);
  const [pinB, setPinB] = useState(null);

  // Clear pins whenever the data set changes
  useEffect(() => { setPinA(null); setPinB(null); }, [symbol, duration]);

  function handleChartClick(e) {
    const idx = e?.activeTooltipIndex;
    if (idx == null) return;
    if (pinA === null) { setPinA(idx); return; }
    if (pinB === null) { if (idx !== pinA) setPinB(idx); return; }
    // Both set — start fresh
    setPinA(idx); setPinB(null);
  }

  const selA = pinA !== null && pinB !== null ? Math.min(pinA, pinB) : null;
  const selB = pinA !== null && pinB !== null ? Math.max(pinA, pinB) : null;
  const isFullRange = selA === null;

  const selectedOhlcv = useMemo(
    () => selA !== null ? ohlcv.slice(selA, selB + 1) : ohlcv,
    [ohlcv, selA, selB],
  );

  const returnSeries = useMemo(() => toReturnSeries(ohlcv), [ohlcv]);
  const metrics      = useMemo(() => computeMetrics(selectedOhlcv), [selectedOhlcv]);
  const rollingData  = useMemo(() => computeRolling(selectedOhlcv, WINDOW_DAYS[rollingWin]), [selectedOhlcv, rollingWin]);

  const xTicks = useMemo(() => {
    if (returnSeries.length <= 6) return returnSeries.map(p => p.date);
    const step = Math.floor(returnSeries.length / 5);
    return returnSeries.filter((_, i) => i % step === 0 || i === returnSeries.length - 1).map(p => p.date);
  }, [returnSeries]);

  const up = metrics.totalReturn >= 0;
  const strokeColor = up ? '#22c55e' : '#ef4444';
  const gradId = up ? 'perfGreenGrad' : 'perfRedGrad';

  const fmtPct = (n, d = 2) => n == null ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(d)}%`;

  function commit(sym) {
    const s = sym.trim().toUpperCase();
    if (s) { setSymbol(s); setInput(''); }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">

      {/* ── Header + symbol input ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Performance</h1>
          <p className="text-gray-500 text-sm mt-0.5">Historical price performance for any symbol</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && commit(input)}
            placeholder="Enter symbol…"
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 w-36 focus:outline-none focus:border-indigo-500 placeholder-gray-600 uppercase"
          />
          <button
            onClick={() => commit(input)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Go
          </button>
        </div>
      </div>

      {/* ── Popular symbol chips ── */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {POPULAR.map(s => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
              symbol === s
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Active symbol + duration selector ── */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-white font-bold text-lg">{chart?.name || symbol}</span>
          {chart?.price != null && (
            <span className="text-gray-300 font-mono">${chart.price.toFixed(2)}</span>
          )}
          {chart?.pct != null && (
            <span className={`text-sm font-mono ${chart.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtPct(chart.pct)} today
            </span>
          )}
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {visibleDurations.map(d => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  duration === d
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        {ohlcv.length > 0 && (
          <p className="text-gray-600 text-xs mt-1.5 font-mono text-right">
            {ohlcv[0].date} → {ohlcv.at(-1).date}
            <span className="ml-2 text-gray-700">({ohlcv.length} {INTERVAL_MAP[duration] === '1wk' ? 'weeks' : 'days'})</span>
          </p>
        )}
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Return"
          value={fmtPct(metrics.totalReturn)}
          sub={metrics.startDate ? `$${metrics.startPrice?.toFixed(2)} (${metrics.startDate}) → $${metrics.endPrice?.toFixed(2)} (${metrics.endDate})` : '—'}
          color={up ? 'text-green-400' : 'text-red-400'}
          icon={up ? TrendingUp : TrendingDown}
        />
        <MetricCard
          label="Max Profit"
          value={fmtPct(metrics.maxProfit)}
          sub={metrics.maxProfitLowDate ? `$${metrics.maxProfitLowPrice?.toFixed(2)} (${metrics.maxProfitLowDate}) → $${metrics.maxProfitHighPrice?.toFixed(2)} (${metrics.maxProfitHighDate})` : 'Buy low → sell high'}
          color="text-emerald-400"
          icon={Zap}
        />
        <MetricCard
          label="Sharpe Ratio"
          value={metrics.sharpe.toFixed(2)}
          sub="Risk-adjusted return"
          color={metrics.sharpe >= 1 ? 'text-indigo-400' : metrics.sharpe >= 0 ? 'text-gray-300' : 'text-red-400'}
          icon={Activity}
        />
        <MetricCard
          label="Max Drawdown"
          value={`${metrics.maxDD.toFixed(2)}%`}
          sub={metrics.maxDDStart ? `$${metrics.maxDDPeakPrice?.toFixed(2)} (${metrics.maxDDStart}) → $${metrics.maxDDTroughPrice?.toFixed(2)} (${metrics.maxDDEnd})` : 'Peak-to-trough'}
          color="text-red-400"
          icon={TrendingDown}
        />
      </div>

      {/* ── Price return area chart ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
          <div>
            <h2 className="text-white font-semibold">
              {symbol} — {duration} {chartMode === 'pct' ? '% Return' : 'Price'}
            </h2>
            {pinA !== null && pinB === null && (
              <p className="text-yellow-500 text-xs font-mono mt-0.5 animate-pulse">
                Click a second point to set the end
              </p>
            )}
            {!isFullRange && selectedOhlcv.length > 0 && (
              <p className="text-indigo-400 text-xs font-mono mt-0.5">
                ${ohlcv[selA]?.close?.toFixed(2)} → ${ohlcv[selB]?.close?.toFixed(2)}
                <span className="text-gray-600 mx-1">·</span>
                {selectedOhlcv[0].date} → {selectedOhlcv.at(-1).date}
                <button onClick={() => { setPinA(null); setPinB(null); }}
                  className="ml-2 text-gray-500 hover:text-gray-300 underline">clear</button>
              </p>
            )}
            {isFullRange && pinA === null && (
              <p className="text-gray-600 text-xs mt-0.5">Click two points on the chart to measure a range</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {returnSeries.length > 0 && (
              <span className={`text-sm font-mono font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
                {fmtPct(metrics.totalReturn)}
              </span>
            )}
            <div className="flex rounded-lg overflow-hidden border border-[#2a2a2a]">
              {[['pct', '% Change'], ['price', 'Price']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setChartMode(mode)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    chartMode === mode
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#111] text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <ChartSkeleton height={220} />
        ) : returnSeries.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-16">No data available for {symbol}</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={returnSeries}
              margin={{ top: 16, right: 0, bottom: 0, left: 0 }}
              onClick={handleChartClick}
              style={{ cursor: pinA === null || pinB !== null ? 'crosshair' : 'crosshair' }}
            >
              <defs>
                <linearGradient id="perfGreenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="perfRedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                ticks={xTicks}
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={chartMode === 'price' ? 60 : 45}
                tickFormatter={chartMode === 'price'
                  ? v => `$${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0)}`
                  : v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
              />
              {chartMode === 'pct' && <ReferenceLine y={0} stroke="#2a2a2a" strokeDasharray="3 3" />}
              <Tooltip content={<PriceTooltip />} />

              {/* Highlighted region between the two pins */}
              {selA !== null && (
                <ReferenceArea
                  x1={returnSeries[selA]?.date}
                  x2={returnSeries[selB]?.date}
                  fill="#6366f1"
                  fillOpacity={0.1}
                  strokeOpacity={0}
                />
              )}

              {/* Start pin */}
              {pinA !== null && returnSeries[pinA] && (
                <ReferenceLine
                  x={returnSeries[pinA].date}
                  stroke="#6366f1"
                  strokeWidth={2}
                  label={{
                    value: `$${ohlcv[pinA]?.close?.toFixed(2)}`,
                    position: 'top',
                    fill: '#818cf8',
                    fontSize: 10,
                    fontFamily: 'monospace',
                  }}
                />
              )}

              {/* End pin */}
              {pinB !== null && returnSeries[pinB] && (
                <ReferenceLine
                  x={returnSeries[pinB].date}
                  stroke="#22c55e"
                  strokeWidth={2}
                  label={{
                    value: `$${ohlcv[pinB]?.close?.toFixed(2)}`,
                    position: 'top',
                    fill: '#4ade80',
                    fontSize: 10,
                    fontFamily: 'monospace',
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey={chartMode === 'pct' ? 'ret' : 'price'}
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Rolling returns bar chart ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-white font-semibold">Rolling {rollingWin} Returns</h2>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Window</span>
            <div className="flex gap-1.5">
              {WINDOWS.map(w => (
                <button
                  key={w}
                  onClick={() => setRollingWin(w)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    rollingWin === w
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <ChartSkeleton height={180} />
        ) : rollingData.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">
            {ohlcv.length === 0
              ? `No data for ${symbol}`
              : 'Not enough data — select a shorter rolling window or longer duration.'}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={rollingData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <ReferenceLine y={0} stroke="#3a3a3a" />
              <Tooltip content={<RollingTooltip />} />
              <Bar dataKey="ret" isAnimationActive={false} radius={[2, 2, 0, 0]}>
                {rollingData.map((entry, i) => (
                  <Cell key={i} fill={entry.ret >= 0 ? '#22c55e' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
