import React, { useMemo, useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import { useChart } from '../hooks/useYahoo';

// ── Window configs ────────────────────────────────────────────────────────────

const WINDOWS = [
  { label: '1D',  days: 1,  range: '1y',  desc: '1-Day Return' },
  { label: '5D',  days: 5,  range: '2y',  desc: '5-Day (Week) Return' },
  { label: '10D', days: 10, range: '2y',  desc: '10-Day (2-Week) Return' },
  { label: '15D', days: 15, range: '2y',  desc: '15-Day (3-Week) Return' },
  { label: '21D', days: 21, range: '2y',  desc: '21-Day (1-Month) Return' },
  { label: '30D', days: 30, range: '5y',  desc: '30-Day Return' },
  { label: '45D', days: 45, range: '5y',  desc: '45-Day (6-Week) Return' },
  { label: '63D', days: 63, range: '5y',  desc: '63-Day (Quarter) Return' },
  { label: '90D', days: 90, range: '5y',  desc: '90-Day (3-Month) Return' },
];

// Bucket edges per window (in %)
const BUCKET_EDGES = {
  1:  [-Infinity, -5, -3, -2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3, 5, Infinity],
  5:  [-Infinity, -10, -7, -5, -3, -1.5, 0, 1.5, 3, 5, 7, 10, Infinity],
  10: [-Infinity, -15, -10, -7, -5, -3, 0, 3, 5, 7, 10, 15, Infinity],
  15: [-Infinity, -15, -10, -7, -5, -3, 0, 3, 5, 7, 10, 15, Infinity],
  21: [-Infinity, -20, -15, -10, -7, -5, 0, 5, 7, 10, 15, 20, Infinity],
  30: [-Infinity, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, Infinity],
  45: [-Infinity, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, Infinity],
  63: [-Infinity, -30, -20, -15, -10, -5, 0, 5, 10, 15, 20, 30, Infinity],
  90: [-Infinity, -35, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 35, Infinity],
};

function bucketLabel(lo, hi) {
  if (lo === -Infinity) return `<${hi}%`;
  if (hi === Infinity)  return `>${lo}%`;
  return `${lo}%`;
}

// ── Math helpers ──────────────────────────────────────────────────────────────

function computeReturns(closes, n) {
  const out = [];
  for (let i = n; i < closes.length; i++) {
    const base = closes[i - n];
    if (base > 0) out.push(((closes[i] - base) / base) * 100);
  }
  return out;
}

function buildHistogram(returns, edges) {
  const buckets = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i], hi = edges[i + 1];
    const count = returns.filter(r => r >= lo && r < hi).length;
    buckets.push({ lo, hi, label: bucketLabel(lo, hi), count });
  }
  const total = returns.length;
  return buckets.map(b => ({ ...b, probability: total > 0 ? (b.count / total) * 100 : 0 }));
}

function computeStats(returns) {
  if (!returns.length) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = returns.reduce((s, v) => s + v, 0) / n;
  const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const pct = p => sorted[Math.max(0, Math.floor(n * p / 100))];
  return {
    n,
    mean,
    median: pct(50),
    std,
    p10:     pct(10),
    p25:     pct(25),
    p75:     pct(75),
    p90:     pct(90),
    winRate: returns.filter(r => r > 0).length / n * 100,
    maxGain: sorted[n - 1],
    maxLoss: sorted[0],
  };
}

// ── Help bubble ──────────────────────────────────────────────────────────────

function HelpTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 4 }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: '50%',
          background: '#374151', color: '#9ca3af',
          fontSize: 9, fontWeight: 700, cursor: 'help',
          border: '1px solid #4b5563', lineHeight: 1,
          userSelect: 'none',
        }}
      >?</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
          background: '#1f2937', border: '1px solid #374151', borderRadius: 8,
          padding: '8px 12px', fontSize: 11, color: '#d1d5db',
          whiteSpace: 'pre-line', lineHeight: 1.5,
          width: 220, zIndex: 50,
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            border: '5px solid transparent', borderTopColor: '#374151',
          }} />
        </span>
      )}
    </span>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function HistoTooltip({ active, payload, currentReturn }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const rangeLabel = d.lo === -Infinity
    ? `below ${d.hi}%`
    : d.hi === Infinity
    ? `above ${d.lo}%`
    : `${d.lo}% to ${d.hi}%`;
  const isCurrent = currentReturn !== null &&
    currentReturn >= d.lo && currentReturn < d.hi;
  return (
    <div style={{
      background: '#1a1a2e', border: '1px solid #374151',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: '#9ca3af', marginBottom: 4 }}>Return range: {rangeLabel}</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
        {d.probability.toFixed(1)}% probability
      </div>
      <div style={{ color: '#6b7280', marginTop: 2 }}>
        {d.count} occurrences out of {d.count > 0 ? Math.round(d.count / (d.probability / 100)) : '—'} periods
      </div>
      {isCurrent && (
        <div style={{ color: '#fbbf24', marginTop: 6, fontWeight: 600 }}>
          ← current period falls here
        </div>
      )}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────

function Stat({ label, value, color = '#e5e7eb', help }) {
  return (
    <div style={{
      background: '#111827', borderRadius: 8, padding: '10px 14px',
      border: '1px solid #1f2937', textAlign: 'center',
    }}>
      <div style={{ color: '#6b7280', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        {label}{help && <HelpTip text={help} />}
      </div>
      <div style={{ color, fontWeight: 700, fontSize: 15 }}>{value}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RollingReturnProbability({ symbol }) {
  const [winIdx, setWinIdx] = useState(1); // default 5D
  const win = WINDOWS[winIdx];

  const { data: chartData, loading } = useChart(symbol, '1d', win.range, { ttl: 300_000 });

  const { returns, histogram, stats, currentReturn } = useMemo(() => {
    const closes = chartData?.ohlcv?.map(d => d.close) ?? [];
    if (closes.length < win.days + 10) return { returns: [], histogram: [], stats: null, currentReturn: null };

    const rets = computeReturns(closes, win.days);
    const edges = BUCKET_EDGES[win.days];
    const hist = buildHistogram(rets, edges);
    const st = computeStats(rets);

    // Current period return: last close vs close win.days ago
    const last = closes[closes.length - 1];
    const base = closes[closes.length - 1 - win.days];
    const cur = base > 0 ? ((last - base) / base) * 100 : null;

    return { returns: rets, histogram: hist, stats: st, currentReturn: cur };
  }, [chartData, win.days]);

  const fmt = (v, d = 2) => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(d)}%`;
  const fmtAbs = (v, d = 2) => v == null ? '—' : `${v.toFixed(d)}%`;

  // Find which bucket the current return falls in
  const currentBucketIdx = currentReturn === null ? -1 : histogram.findIndex(
    b => currentReturn >= b.lo && currentReturn < b.hi
  );

  return (
    <div style={{ padding: '24px 0' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 4px' }}>
          Rolling Return Range Probability
        </h3>
        <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
          Historical frequency distribution of {win.desc.toLowerCase()}s for {symbol} — how often each return range has occurred.
        </p>
      </div>

      {/* ── Window selector ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, alignItems: 'center' }}>
        {WINDOWS.map((w, i) => (
          <button
            key={w.label}
            onClick={() => setWinIdx(i)}
            style={{
              padding: '5px 14px', borderRadius: 6,
              border: `1px solid ${i === winIdx ? '#6366f1' : '#374151'}`,
              background: i === winIdx ? '#6366f1' : 'transparent',
              color: i === winIdx ? '#fff' : '#9ca3af',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {w.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />
        <span style={{ color: '#9ca3af', fontSize: 12 }}>Negative</span>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e', display: 'inline-block', marginLeft: 6 }} />
        <span style={{ color: '#9ca3af', fontSize: 12 }}>Positive</span>
        {currentReturn !== null && (
          <>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: '#fbbf24', display: 'inline-block', marginLeft: 6 }} />
            <span style={{ color: '#9ca3af', fontSize: 12 }}>Current</span>
          </>
        )}
      </div>

      {/* ── Current period callout ── */}
      {currentReturn !== null && (
        <div style={{
          background: '#1c1917', border: `1px solid ${currentReturn >= 0 ? '#166534' : '#7f1d1d'}`,
          borderRadius: 10, padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ color: '#9ca3af', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 3 }}>
              Current {win.label} Return
              <HelpTip text={`The most recent ${win.label} return — how much this stock has moved from ${win.days} trading days ago to today.\n\nCalculated as: (today's close − close ${win.days} days ago) ÷ close ${win.days} days ago × 100.\n\nThe yellow bar on the histogram shows where this return falls in the historical distribution.`} />
            </div>
            <div style={{
              fontSize: 22, fontWeight: 800,
              color: currentReturn >= 0 ? '#22c55e' : '#ef4444',
            }}>
              {fmt(currentReturn)}
            </div>
          </div>
          {stats && (
            <>
              <div style={{ width: 1, height: 36, background: '#374151' }} />
              <div>
                <div style={{ color: '#9ca3af', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                  Percentile rank
                  <HelpTip text={`Percentile rank within historical ${win.label} returns.\n\nIf the rank is 97th, it means 97% of all past ${win.label} periods returned less than today's ${fmt(currentReturn)}. Only 3% returned more.\n\n• Above 90th → unusually strong move\n• 10th–90th → within normal range\n• Below 10th → unusually weak move`} />
                </div>
                <div style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 15 }}>
                  {(() => {
                    const rank = returns.filter(r => r <= currentReturn).length / returns.length * 100;
                    return `${rank.toFixed(0)}th`;
                  })()}
                </div>
              </div>
              <div style={{ width: 1, height: 36, background: '#374151' }} />
              <div>
                <div style={{ color: '#9ca3af', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                  vs Median
                  <HelpTip text={`How the current ${win.label} return compares to the historical median.\n\nFormat: [difference] vs [median]\n\nThe first number is how far above or below the median you currently are. The second number is the median itself — the "typical" ${win.label} result over this stock's history.\n\nA large positive gap means this period is well above average; a large negative gap means it's unusually weak.`} />
                </div>
                <div style={{
                  color: currentReturn >= stats.median ? '#22c55e' : '#ef4444',
                  fontWeight: 700, fontSize: 15,
                }}>
                  {fmt(currentReturn - stats.median)} vs {fmt(stats.median)}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Histogram ── */}
      {loading ? (
        <div style={{ height: 280, background: '#111827', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#4b5563', fontSize: 14 }}>Loading historical data…</div>
        </div>
      ) : histogram.length === 0 ? (
        <div style={{ height: 280, background: '#111827', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: '#4b5563', fontSize: 14 }}>Not enough data for this window</div>
        </div>
      ) : (
        <div style={{ background: '#0f172a', borderRadius: 10, padding: '20px 8px 8px', border: '1px solid #1e293b', marginBottom: 20 }}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogram} margin={{ top: 0, right: 16, left: 0, bottom: 40 }} barCategoryGap="4%">
              <CartesianGrid vertical={false} stroke="#1e293b" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 10.5 }}
                axisLine={{ stroke: '#374151' }}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                interval={0}
                height={52}
              />
              <YAxis
                tickFormatter={v => `${v.toFixed(0)}%`}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={42}
                domain={[0, dataMax => Math.ceil(dataMax * 1.15)]}
              />
              <Tooltip content={<HistoTooltip currentReturn={currentReturn} />} />
              {/* Zero-line divider */}
              <ReferenceLine x="0%" stroke="#4b5563" strokeDasharray="4 2" strokeWidth={1} />
              {/* Current return marker */}
              {currentBucketIdx >= 0 && (
                <ReferenceLine
                  x={histogram[currentBucketIdx]?.label}
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{ value: 'Now', position: 'top', fill: '#fbbf24', fontSize: 11 }}
                />
              )}
              <Bar dataKey="probability" radius={[3, 3, 0, 0]} maxBarSize={52}>
                {histogram.map((entry, i) => {
                  const isCur = i === currentBucketIdx;
                  const isPos = entry.lo >= 0 || (entry.lo === -Infinity ? false : entry.hi > 0);
                  // Use midpoint to decide color
                  const mid = entry.lo === -Infinity ? entry.hi - 1 : entry.hi === Infinity ? entry.lo + 1 : (entry.lo + entry.hi) / 2;
                  const base = mid >= 0 ? '#22c55e' : '#ef4444';
                  const fill = isCur ? '#fbbf24' : base;
                  return <Cell key={`cell-${i}`} fill={fill} fillOpacity={isCur ? 1 : 0.75} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Stats grid ── */}
      {stats && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 8, marginBottom: 16,
          }}>
            <Stat label="Observations" value={stats.n.toLocaleString()}
              help={`Number of ${win.label} return periods sampled from the historical data.\n\nMore observations = more statistically reliable probabilities. At least 50–100 is generally needed for meaningful results.`} />
            <Stat label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate >= 50 ? '#22c55e' : '#ef4444'}
              help={`Win Rate — % of ${win.label} periods with a positive return.\n\n${stats.winRate.toFixed(1)}% of past ${win.label} windows ended in the green.\n\nAbove 50% = the stock has risen more often than fallen over this horizon. Does not account for the size of gains vs losses.`} />
            <Stat label="Mean Return" value={fmt(stats.mean)} color={stats.mean >= 0 ? '#22c55e' : '#ef4444'}
              help={`Average (arithmetic mean) of all ${win.label} returns.\n\nAdd up every period's return and divide by the count. Sensitive to extreme outliers — a single crash or spike can pull this away from the typical result.\n\nCompare to Median: if Mean >> Median, big gains are skewing the average upward (and vice versa).`} />
            <Stat label="Median" value={fmt(stats.median)} color={stats.median >= 0 ? '#22c55e' : '#ef4444'}
              help={`Median — the middle value of all ${win.label} returns.\n\nHalf of all periods returned more than this, half returned less. Unlike the Mean, the Median ignores extreme outliers and gives a truer picture of the "typical" result.`} />
            <Stat label="Std Dev" value={fmtAbs(stats.std)} color="#a78bfa"
              help={`Standard Deviation of ${win.label} returns — a measure of volatility.\n\nTells you how much returns typically scatter around the mean.\n\nA low Std Dev = consistent, predictable returns.\nA high Std Dev = wide swings, more uncertainty.\n\nRule of thumb: ~68% of future ${win.label} returns are likely to fall within ±1 Std Dev of the mean.`} />
            <Stat label="Best Period" value={fmt(stats.maxGain)} color="#22c55e"
              help={`Best single ${win.label} period in the entire history sampled.\n\nThis is the maximum return achieved — the absolute peak. Treat it as a tail-event ceiling, not a realistic target. It likely occurred during an unusual rally or short squeeze.`} />
            <Stat label="Worst Period" value={fmt(stats.maxLoss)} color="#ef4444"
              help={`Worst single ${win.label} period in the entire history sampled.\n\nThis is the maximum drawdown over one rolling window — the worst-case scenario that actually happened. Use it to stress-test your risk tolerance: could you hold through a loss of this size?`} />
          </div>

          {/* Percentile band */}
          <div style={{
            background: '#0f172a', borderRadius: 10, padding: '16px 20px',
            border: '1px solid #1e293b',
          }}>
            <div style={{ color: '#9ca3af', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Return Percentile Bands
            </div>
            <div style={{ position: 'relative', height: 36 }}>
              {/* Full bar background */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 6, background: '#1e293b' }} />

              {/* IQR band (P25–P75) */}
              {(() => {
                const allEdges = BUCKET_EDGES[win.days].filter(e => e !== -Infinity && e !== Infinity);
                const minVal = allEdges[0];
                const maxVal = allEdges[allEdges.length - 1];
                const span = maxVal - minVal;
                const toPos = v => Math.max(0, Math.min(100, ((v - minVal) / span) * 100));

                const p10x  = toPos(stats.p10);
                const p25x  = toPos(stats.p25);
                const p75x  = toPos(stats.p75);
                const p90x  = toPos(stats.p90);
                const medx  = toPos(stats.median);
                const meanx = toPos(stats.mean);
                const curx  = currentReturn !== null ? toPos(currentReturn) : null;

                return (
                  <>
                    {/* P10–P90 wide band */}
                    <div style={{
                      position: 'absolute', top: 8, bottom: 8, borderRadius: 4,
                      background: '#1d2d50',
                      left: `${p10x}%`, width: `${p90x - p10x}%`,
                    }} />
                    {/* P25–P75 IQR band */}
                    <div style={{
                      position: 'absolute', top: 4, bottom: 4, borderRadius: 4,
                      background: '#2d3f6b',
                      left: `${p25x}%`, width: `${p75x - p25x}%`,
                    }} />
                    {/* Median line */}
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 2,
                      background: '#818cf8', left: `${medx}%`, transform: 'translateX(-50%)',
                    }} />
                    {/* Mean line */}
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, width: 2, borderRadius: 2,
                      background: '#fbbf24', opacity: 0.7, left: `${meanx}%`, transform: 'translateX(-50%)',
                    }} />
                    {/* Current return dot */}
                    {curx !== null && (
                      <div style={{
                        position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
                        width: 12, height: 12, borderRadius: '50%',
                        background: currentReturn >= 0 ? '#22c55e' : '#ef4444',
                        border: '2px solid #0f172a',
                        left: `${curx}%`,
                        zIndex: 2,
                      }} />
                    )}
                    {/* Zero line */}
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, width: 1,
                      background: '#4b5563', left: `${toPos(0)}%`,
                    }} />
                  </>
                );
              })()}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                {
                  color: '#818cf8', label: `Median: ${fmt(stats.median)}`,
                  help: `Median return\n\nThe middle value — half of all ${win.label} periods returned more than this, half returned less. More robust than the mean because it ignores extreme outliers.`,
                },
                {
                  color: '#fbbf24', label: `Mean: ${fmt(stats.mean)}`, opacity: 0.7,
                  help: `Average (mean) return\n\nThe arithmetic average of all ${win.label} returns. Can be skewed by very large gains or crashes. Compare to the Median to spot skew.`,
                },
                {
                  color: '#2d3f6b', label: `IQR (P25–P75): ${fmt(stats.p25)} to ${fmt(stats.p75)}`, border: '#374151',
                  help: `Interquartile Range (middle 50%)\n\nThe return range covering the middle 50% of all ${win.label} periods — from the 25th percentile to the 75th. A narrow IQR = consistent returns; wide IQR = volatile.`,
                },
                {
                  color: '#1d2d50', label: `90% range (P10–P90): ${fmt(stats.p10)} to ${fmt(stats.p90)}`, border: '#374151',
                  help: `90% confidence range (P10–P90)\n\n90% of all ${win.label} periods historically landed inside this range. Only 5% were below ${fmt(stats.p10)} and 5% were above ${fmt(stats.p90)}. Useful as a realistic best/worst case.`,
                },
                ...(currentReturn !== null ? [{
                  color: currentReturn >= 0 ? '#22c55e' : '#ef4444',
                  label: `Current: ${fmt(currentReturn)}`, dot: true,
                  help: `Current ${win.label} return\n\nWhere the most recent ${win.label} return (${fmt(currentReturn)}) falls on the historical distribution.\n\nPercentile: ${(returns.filter(r => r <= currentReturn).length / returns.length * 100).toFixed(0)}th — meaning ${(returns.filter(r => r <= currentReturn).length / returns.length * 100).toFixed(0)}% of past ${win.label} periods were at or below this return.`,
                }] : []),
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9ca3af' }}>
                  {item.dot
                    ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, display: 'inline-block', flexShrink: 0 }} />
                    : <span style={{ width: 14, height: 8, borderRadius: 2, background: item.color, display: 'inline-block', border: item.border ? `1px solid ${item.border}` : 'none', opacity: item.opacity ?? 1, flexShrink: 0 }} />
                  }
                  {item.label}
                  <HelpTip text={item.help} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
