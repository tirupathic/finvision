import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Star, Share2, Bell, ArrowLeft,
  ExternalLink, Loader2, AlertCircle,
} from 'lucide-react';
import { useChart, useSummary, useEarnings, useNews, useInstitutional } from '../hooks/useYahoo';
import { usePersistedRange } from '../hooks/usePersistedRange';
import { formatMarketCap, formatVolume, fmt$, colorClass, signStr } from '../services/yahooApi';
import { generateOptionsChain } from '../services/stockData';
import { ETF_SET, ETF_INFO } from '../services/etfData';
import NewsCard from '../components/NewsCard';
import PerformanceTab from '../components/PerformanceTab';
import StrategiesTab from '../components/StrategiesTab';
import AdvancedChart from '../components/AdvancedChart';

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
  const [tab, setTab]       = useState('overview');
  const [starred, setStarred] = useState(false);

  // Reset to overview when navigating to a different symbol
  useEffect(() => { setTab('overview'); }, [SYM]);

  const { interval, range: yfRange } = RANGE_MAP[range];

  // ── Real data hooks ──────────────────────────────────────────────────────────
  const { data: chartData, loading: chartLoading, error: chartError } =
    useChart(SYM, interval, yfRange, { refreshMs: 15_000 });

  const { data: summary, loading: summaryLoading } =
    useSummary(SYM);

  const { data: earnings, loading: earningsLoading } =
    useEarnings(SYM);

  const { data: news, loading: newsLoading } =
    useNews(SYM, 10);

  const { data: institutional } =
    useInstitutional(SYM);

  const options = useMemo(
    () => chartData ? generateOptionsChain(chartData.price) : [],
    [chartData?.price]
  );

  // ── Derived values ───────────────────────────────────────────────────────────
  const q = chartData;
  const s = summary;
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
    ? ['overview', 'chart', 'etf', 'holders', 'options', 'performance', 'strategies', 'news']
    : ['overview', 'chart', 'financials', 'earnings', 'holders', 'options', 'performance', 'strategies', 'news'];

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
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
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {t === 'etf' ? 'ETF' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Overview ───────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Chart */}
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Price Chart</h2>
                <div className="flex items-center gap-2">
                  {chartLoading && <Loader2 size={13} className="text-indigo-400 animate-spin" />}
                  <RangeSelector range={range} onChange={setRange} />
                </div>
              </div>
              {chartLoading && !q?.ohlcv?.length ? (
                <Skeleton className="w-full h-60" />
              ) : q?.ohlcv?.length ? (
                <PriceChart ohlcv={q.ohlcv} symbol={SYM} color={color} />
              ) : null}
            </div>

            {/* Volume */}
            {q?.ohlcv?.length > 0 && (
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
                <h2 className="text-white font-semibold mb-4">Volume</h2>
                <ResponsiveContainer width="100%" height={90}>
                  <BarChart data={q.ohlcv.slice(-40)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="volume" fill="#6366f1" opacity={0.6} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                  </BarChart>
                </ResponsiveContainer>
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
                    value={(s?.week52Low && s?.week52High) || (q?.week52Low && q?.week52High)
                      ? `${fmt$(s?.week52Low ?? q?.week52Low)} – ${fmt$(s?.week52High ?? q?.week52High)}`
                      : '—'} />
                  <StatRow label="Volume"      value={formatVolume(q?.volume)} />
                  <StatRow label="Avg. Volume" value={formatVolume(s?.avgVolume)} />
                  <StatRow label="Market Cap"  value={formatMarketCap(s?.marketCap)} />
                  <StatRow label="P/E (TTM)"   value={s?.pe?.toFixed(2) ?? '—'} />
                  <StatRow label="Forward P/E" value={s?.forwardPE?.toFixed(2) ?? '—'} />
                  <StatRow label="EPS (TTM)"   value={s?.eps ? fmt$(s.eps) : '—'} />
                  <StatRow label="Beta"        value={s?.beta?.toFixed(2) ?? '—'} />
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
      )}

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
          {!institutional ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="text-indigo-400 animate-spin" />
            </div>
          ) : (institutional.summary?.instPct || institutional.holders?.length > 0) ? (
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
                {institutional.activity && Object.keys(institutional.activity).length > 0 && (
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

                {institutional.holders?.length > 0 && (
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
      {tab === 'options' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-white font-semibold">Options Chain — {SYM}</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Current Price: {q ? fmt$(q.price) : '…'} · Simulated strikes
              </p>
            </div>
            <div className="flex gap-2">
              {['Weekly','Monthly','Quarterly'].map(e => (
                <button key={e}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${e==='Monthly' ? 'bg-indigo-600 text-white' : 'text-gray-500 border border-[#2a2a2a] hover:text-white'}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          {options.length ? <OptionsTable data={options} /> : <Skeleton className="w-full h-60" />}
        </div>
      )}

      {/* ── Performance ────────────────────────────────────────────────────── */}
      {tab === 'performance' && <PerformanceTab symbol={SYM} />}

      {/* ── Strategies ─────────────────────────────────────────────────────── */}
      {tab === 'strategies' && <StrategiesTab symbol={SYM} />}

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
