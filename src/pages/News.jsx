import { useState, useMemo } from 'react';
import { Newspaper, TrendingUp, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMarketNews, useQuotes } from '../hooks/useYahoo';
import { colorClass, fmt$, signStr } from '../services/yahooApi';
import NewsCard from '../components/NewsCard';

const CATEGORIES = ['All', 'Markets', 'Earnings', 'Economy', 'Tech', 'Crypto', 'AI', 'Commodities', 'Autos'];

export default function News() {
  const [activeCategory, setActiveCategory] = useState('All');

  const { data: articles = [], loading } = useMarketNews({ refreshMs: 300_000 });

  const trendingSymbols = useMemo(() => {
    const counts = {};
    for (const a of articles) {
      for (const t of a.tickers || []) counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([sym]) => sym);
  }, [articles]);

  const { data: trendingQuotes = [] } = useQuotes(trendingSymbols, { ttl: 30_000 });

  const filtered = activeCategory === 'All'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Newspaper size={20} className="text-indigo-400" />
        <h1 className="text-white text-2xl font-bold">Financial News</h1>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Trending stocks in the news */}
      {trendingSymbols.length > 0 && (
        <div className="mb-6">
          <h2 className="text-white font-semibold mb-3">Trending in the News</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {trendingSymbols.map(sym => {
              const q = trendingQuotes.find(q => q.symbol === sym);
              const up = q ? q.pct >= 0 : null;
              return (
                <Link key={sym} to={`/stock/${sym}`}
                  className="flex-shrink-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all min-w-[110px]">
                  <p className="text-white font-bold text-sm">{sym}</p>
                  {q ? (
                    <>
                      <p className="text-white font-mono text-sm mt-0.5">{fmt$(q.price)}</p>
                      <p className={`text-xs font-mono mt-0.5 flex items-center gap-0.5 ${colorClass(q.pct)}`}>
                        {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {signStr(q.pct)}%
                      </p>
                    </>
                  ) : (
                    <p className="text-gray-600 text-xs mt-1">—</p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <>
          {/* Featured skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[0, 1].map(i => (
              <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 animate-pulse">
                <div className="h-3 bg-[#2a2a2a] rounded mb-4 w-16" />
                <div className="h-5 bg-[#2a2a2a] rounded mb-2 w-full" />
                <div className="h-5 bg-[#2a2a2a] rounded mb-2 w-4/5" />
                <div className="h-3 bg-[#2a2a2a] rounded w-24" />
              </div>
            ))}
          </div>
          {/* Grid skeletons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-[#2a2a2a] rounded mb-3 w-16" />
                <div className="h-4 bg-[#2a2a2a] rounded mb-1.5 w-full" />
                <div className="h-4 bg-[#2a2a2a] rounded mb-1.5 w-5/6" />
                <div className="h-4 bg-[#2a2a2a] rounded w-3/4" />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Featured (first 2) */}
          {activeCategory === 'All' && filtered.length >= 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {filtered.slice(0, 2).map(a => (
                <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer"
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 hover:border-indigo-500/30 hover:bg-[#1f1f1f] transition-all group">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mb-3 inline-block
                    ${a.category === 'Economy' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    {a.category}
                  </span>
                  <h2 className="text-white font-semibold text-lg group-hover:text-indigo-300 transition-colors leading-snug mb-2">
                    {a.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="font-medium">{a.source}</span>
                    <span>·</span>
                    <span>{a.time}</span>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* News grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(activeCategory === 'All' ? filtered.slice(2) : filtered).map(a => (
              <NewsCard key={a.id} article={a} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <p>No news in this category yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
