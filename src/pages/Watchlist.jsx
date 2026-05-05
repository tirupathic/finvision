import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Plus, Trash2, TrendingUp, TrendingDown, Search, Loader2 } from 'lucide-react';
import { generatePriceHistory } from '../services/stockData';
import { formatMarketCap, formatVolume } from '../services/yahooApi';
import { useQuotes, useSearch, useDebounced } from '../hooks/useYahoo';

const DEFAULT_WATCHLIST = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'META'];
const LS_KEY = 'finvision_watchlist';

function loadWatchlist() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_WATCHLIST;
}

function MiniSparkline({ symbol, price, positive }) {
  const data = useMemo(() => generatePriceHistory(price, 20, 0.015), [symbol]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`wl-${symbol}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={positive ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={positive ? '#22c55e' : '#ef4444'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="price" stroke={positive ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5} fill={`url(#wl-${symbol})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function Watchlist() {
  const [symbols, setSymbols] = useState(loadWatchlist);

  function persist(next) {
    setSymbols(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const debouncedQuery = useDebounced(query, 280);
  const { data: searchResults = [], loading: searching } = useSearch(debouncedQuery);

  const { data: quotes = [], loading } = useQuotes(symbols, { refreshMs: 30_000 });

  const quoteMap = useMemo(() => Object.fromEntries(quotes.map(q => [q.symbol, q])), [quotes]);
  const watchedStocks = symbols.map(s => quoteMap[s]).filter(Boolean);

  const gainCount = watchedStocks.filter(s => s.pct >= 0).length;
  const lossCount = watchedStocks.filter(s => s.pct < 0).length;

  function addSymbol(sym) {
    if (!symbols.includes(sym)) persist([...symbols, sym]);
    setQuery('');
    setDropdownOpen(false);
  }

  function removeSymbol(sym) {
    persist(symbols.filter(s => s !== sym));
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-white text-2xl font-bold">My Watchlist</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-400">
            <span className="text-green-400 font-semibold">{gainCount} ↑</span>
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-red-400 font-semibold">{lossCount} ↓</span>
          </div>
        </div>
      </div>

      {/* Add stock search */}
      <div className="relative max-w-sm mb-6">
        <div className="relative">
          {searching
            ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
            : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          }
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            placeholder="Add stock to watchlist…"
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white placeholder-gray-600 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        {dropdownOpen && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-10 overflow-hidden">
            {searchResults.map(s => (
              <button key={s.symbol} onMouseDown={() => addSymbol(s.symbol)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors">
                <Plus size={13} className="text-indigo-400 shrink-0" />
                <span className="text-white font-semibold text-sm w-14">{s.symbol}</span>
                <span className="text-gray-400 text-sm flex-1 truncate">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Watchlist table */}
      {loading && watchedStocks.length === 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 space-y-4">
          {symbols.map(s => (
            <div key={s} className="h-10 bg-[#2a2a2a] rounded animate-pulse" />
          ))}
        </div>
      ) : watchedStocks.length > 0 ? (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
                <th className="text-left py-3 px-5">Symbol</th>
                <th className="text-right py-3 px-4">Price</th>
                <th className="text-right py-3 px-4">Change</th>
                <th className="text-right py-3 px-4">% Change</th>
                <th className="text-right py-3 px-4 hidden md:table-cell">Volume</th>
                <th className="text-right py-3 px-4 hidden lg:table-cell">Mkt Cap</th>
                <th className="text-right py-3 px-4 hidden md:table-cell">P/E</th>
                <th className="text-center py-3 px-4 hidden sm:table-cell">7D Chart</th>
                <th className="py-3 px-5"></th>
              </tr>
            </thead>
            <tbody>
              {watchedStocks.map(s => {
                const up = s.pct >= 0;
                return (
                  <tr key={s.symbol} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5 group">
                    <td className="py-3 px-5">
                      <Link to={`/stock/${s.symbol}`}>
                        <p className="text-white font-bold hover:text-indigo-400 transition-colors">{s.symbol}</p>
                        <p className="text-gray-500 text-xs">{s.name.split(' ').slice(0, 2).join(' ')}</p>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono font-semibold">
                      ${s.price.toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 text-right font-mono text-xs ${up ? 'text-green-400' : 'text-red-400'}`}>
                      {up ? '+' : ''}{s.change.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-semibold ${up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {up ? '+' : ''}{s.pct.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400 font-mono text-xs hidden md:table-cell">
                      {formatVolume(s.volume)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400 text-xs hidden lg:table-cell">
                      {formatMarketCap(s.marketCap)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400 font-mono text-xs hidden md:table-cell">
                      {s.pe != null ? s.pe.toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <MiniSparkline symbol={s.symbol} price={s.price} positive={up} />
                    </td>
                    <td className="py-3 px-5">
                      <button onClick={() => removeSymbol(s.symbol)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">Your watchlist is empty</p>
          <p className="text-sm">Search for a stock above to add it.</p>
        </div>
      )}
    </div>
  );
}
