import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Filter, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { STOCKS } from '../services/stockData';
import { formatMarketCap, formatVolume } from '../services/yahooApi';
import { useQuotes } from '../hooks/useYahoo';

const META = Object.fromEntries(
  Object.values(STOCKS).map(s => [s.symbol, { sector: s.sector, beta: s.beta ?? null }])
);
const SYMBOLS = Object.keys(META);

const PERF_PERIODS = ['1D', '1W', '2W', '30D', '45D', '90D'];

const OPT_STRATEGIES = [
  'All',
  'Iron Condor',
  'Bull Call Spread',
  'Bear Put Spread',
  'Long Straddle',
  'Bull Put Spread',
  'Bear Call Spread',
  'Long Call',
  'Long Put',
];

function deriveOptStrategy(pct, beta) {
  const trend = pct > 1 ? 'bullish' : pct < -1 ? 'bearish' : 'neutral';
  const vol   = beta != null ? (beta > 1.5 ? 'high' : beta < 0.8 ? 'low' : 'medium') : 'medium';
  if (trend === 'bullish' && vol === 'high') return 'Bull Put Spread';
  if (trend === 'bullish' && vol !== 'high') return 'Bull Call Spread';
  if (trend === 'bearish' && vol === 'high') return 'Bear Call Spread';
  if (trend === 'bearish' && vol !== 'high') return 'Bear Put Spread';
  if (vol === 'high') return 'Iron Condor';
  return 'Long Straddle';
}

function perfScore(s, period) {
  if (period === '1D') return s.pct ?? 0;
  const range = (s.week52High ?? 0) - (s.week52Low ?? 0);
  if (range <= 0) return 0;
  return ((s.price - (s.week52Low ?? 0)) / range) * 100;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#2a2a2a]">
      {[...Array(11)].map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-16" />
        </td>
      ))}
    </tr>
  );
}

export default function Screener() {
  const [filters, setFilters] = useState({
    sector: 'All', minPE: '', maxPE: '', minPrice: '', maxPrice: '',
    trend: 'All', optStrategy: 'All',
  });
  const [sortBy, setSortBy]         = useState('marketCap');
  const [sortDir, setSortDir]       = useState('desc');
  const [perfPeriod, setPerfPeriod] = useState('');

  const { data: quotes = [], loading } = useQuotes(SYMBOLS, { refreshMs: 60_000 });

  const allStocks = useMemo(() =>
    quotes.map(q => ({
      ...q,
      sector:      META[q.symbol]?.sector ?? '—',
      beta:        META[q.symbol]?.beta   ?? q.beta ?? null,
      optStrategy: deriveOptStrategy(q.pct ?? 0, META[q.symbol]?.beta ?? q.beta ?? null),
    })),
    [quotes],
  );

  const sectors = useMemo(
    () => ['All', ...new Set(allStocks.map(s => s.sector).filter(s => s && s !== '—'))],
    [allStocks],
  );

  const filtered = useMemo(() => {
    let r = allStocks;
    if (filters.sector !== 'All')          r = r.filter(s => s.sector === filters.sector);
    if (filters.minPE)                     r = r.filter(s => s.pe != null && s.pe >= +filters.minPE);
    if (filters.maxPE)                     r = r.filter(s => s.pe != null && s.pe <= +filters.maxPE);
    if (filters.minPrice)                  r = r.filter(s => s.price >= +filters.minPrice);
    if (filters.maxPrice)                  r = r.filter(s => s.price <= +filters.maxPrice);
    if (filters.trend === 'Bullish')       r = r.filter(s => s.pct >= 0);
    if (filters.trend === 'Bearish')       r = r.filter(s => s.pct < 0);
    if (filters.optStrategy !== 'All')     r = r.filter(s => s.optStrategy === filters.optStrategy);

    if (perfPeriod) {
      return [...r].sort((a, b) => perfScore(b, perfPeriod) - perfScore(a, perfPeriod));
    }
    return [...r].sort((a, b) => {
      const av = a[sortBy] ?? 0;
      const bv = b[sortBy] ?? 0;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [allStocks, filters, sortBy, sortDir, perfPeriod]);

  function toggleSort(col) {
    setPerfPeriod('');
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const SortArrow = ({ col }) => sortBy === col && !perfPeriod ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  function resetAll() {
    setFilters({ sector: 'All', minPE: '', maxPE: '', minPrice: '', maxPrice: '', trend: 'All', optStrategy: 'All' });
    setPerfPeriod('');
    setSortBy('marketCap');
    setSortDir('desc');
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Filter size={18} className="text-indigo-400" />
        <h1 className="text-white text-2xl font-bold">Stock Screener</h1>
        <span className="text-gray-500 text-sm">{loading ? 'Loading…' : `${filtered.length} results`}</span>
        {!loading && <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />}
      </div>

      {/* Filters */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Sector</label>
            <select value={filters.sector} onChange={e => setFilters(p => ({ ...p, sector: e.target.value }))}
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500">
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Options Strategy</label>
            <select value={filters.optStrategy} onChange={e => setFilters(p => ({ ...p, optStrategy: e.target.value }))}
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500">
              {OPT_STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {[
            ['minPE','Min P/E'],['maxPE','Max P/E'],
            ['minPrice','Min $'],['maxPrice','Max $'],
          ].map(([field, label]) => (
            <div key={field}>
              <label className="text-xs text-gray-500 mb-1 block">{label}</label>
              <input type="number" value={filters[field]} placeholder="Any"
                onChange={e => setFilters(p => ({ ...p, [field]: e.target.value }))}
                className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500 placeholder-gray-600" />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Trend</label>
            <select value={filters.trend} onChange={e => setFilters(p => ({ ...p, trend: e.target.value }))}
              className="w-full bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-500">
              {['All','Bullish','Bearish'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={resetAll}
              className="w-full py-2 text-sm text-gray-400 border border-[#2a2a2a] rounded-lg hover:text-white hover:border-gray-500 transition-colors">
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Best Performer sort */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-5 py-3 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Zap size={14} className="text-yellow-400" />
          <span className="text-white text-sm font-medium">Best Performer</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PERF_PERIODS.map(p => (
            <button key={p} onClick={() => setPerfPeriod(prev => prev === p ? '' : p)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                perfPeriod === p
                  ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                  : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500'
              }`}>
              {p}
            </button>
          ))}
        </div>
        {perfPeriod && perfPeriod !== '1D' && (
          <span className="text-gray-600 text-xs">
            {perfPeriod === '1D' ? "Today's % change" : '52-week range position (proxy for longer-term strength)'}
          </span>
        )}
        {perfPeriod === '1D' && <span className="text-gray-600 text-xs">Sorted by today's % change</span>}
      </div>

      {/* Results table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
              {[
                ['symbol','Symbol'],['price','Price'],['pct','% Change'],
                ['marketCap','Mkt Cap'],['pe','P/E'],['volume','Volume'],
                ['week52High','52W High'],['week52Low','52W Low'],['beta','Beta'],
              ].map(([col, label]) => (
                <th key={col} onClick={() => toggleSort(col)}
                  className="text-left py-3 px-4 first:pl-5 whitespace-nowrap cursor-pointer hover:text-white transition-colors select-none">
                  {label}<SortArrow col={col} />
                </th>
              ))}
              <th className="py-3 px-4 text-left">Sector</th>
              <th className="py-3 px-4 pr-5 text-left">Opt Strategy</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [...Array(SYMBOLS.length)].map((_, i) => <SkeletonRow key={i} />)
              : filtered.map(s => {
                  const up = s.pct >= 0;
                  return (
                    <tr key={s.symbol} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5">
                      <td className="py-3 px-4 pl-5">
                        <Link to={`/stock/${s.symbol}`} className="text-white font-bold hover:text-indigo-400 transition-colors">
                          {s.symbol}
                        </Link>
                        <p className="text-gray-500 text-xs">{s.name?.split(' ').slice(0,2).join(' ')}</p>
                      </td>
                      <td className="py-3 px-4 text-white font-mono">${s.price.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono ${up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {up ? '+' : ''}{s.pct.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">{formatMarketCap(s.marketCap)}</td>
                      <td className="py-3 px-4 text-gray-300 font-mono">{s.pe != null ? s.pe.toFixed(1) : '—'}</td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">{formatVolume(s.volume)}</td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">{s.week52High ? `$${s.week52High.toFixed(2)}` : '—'}</td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">{s.week52Low  ? `$${s.week52Low.toFixed(2)}`  : '—'}</td>
                      <td className="py-3 px-4 text-gray-400 font-mono text-xs">{s.beta != null ? s.beta.toFixed(2) : '—'}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">{s.sector}</span>
                      </td>
                      <td className="py-3 px-4 pr-5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 whitespace-nowrap">{s.optStrategy}</span>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">No stocks match your filters.</div>
        )}
      </div>
    </div>
  );
}
