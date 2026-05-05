import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Globe, Zap } from 'lucide-react';
import { formatMarketCap, formatVolume } from '../services/yahooApi';
import { useQuotes, useChart, useMarketNews } from '../hooks/useYahoo';
import StockCard from '../components/StockCard';
import NewsCard from '../components/NewsCard';

const INDEX_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM'];
const INDEX_NAMES = { SPY: 'S&P 500', QQQ: 'NASDAQ 100', DIA: 'Dow Jones', IWM: 'Russell 2000' };
const TRENDING = ['AAPL', 'NVDA', 'TSLA', 'META', 'AMZN', 'MSFT', 'AMD', 'NFLX', 'GOOGL', 'JPM'];

function IndexCard({ quote }) {
  const up = quote.pct >= 0;
  return (
    <Link to={`/stock/${quote.symbol}`}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/30 transition-all">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-400 text-sm font-medium">{INDEX_NAMES[quote.symbol] || quote.name}</span>
        {up ? <TrendingUp size={15} className="text-green-400" /> : <TrendingDown size={15} className="text-red-400" />}
      </div>
      <div className="text-white font-mono text-xl font-bold">
        {quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`text-sm font-mono mt-0.5 ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '+' : ''}{quote.change.toFixed(2)} ({up ? '+' : ''}{quote.pct.toFixed(2)}%)
      </div>
    </Link>
  );
}

function SPYChart({ ohlcv }) {
  const [min, max] = useMemo(() => {
    if (!ohlcv?.length) return [0, 1];
    const prices = ohlcv.map(d => d.price);
    return [Math.min(...prices) * 0.998, Math.max(...prices) * 1.002];
  }, [ohlcv]);

  if (!ohlcv?.length) {
    return <div className="h-[180px] flex items-center justify-center text-gray-600 text-sm">Loading chart…</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={ohlcv} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis domain={[min, max]} hide />
        <Tooltip
          contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: '#6366f1' }}
          formatter={v => [`$${v.toFixed(2)}`, 'S&P 500']}
        />
        <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2}
          fill="url(#spyGrad)" dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function VolumeBar({ quote }) {
  const up = quote.pct >= 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#2a2a2a] last:border-0">
      <Link to={`/stock/${quote.symbol}`} className="text-white font-semibold text-sm w-14 hover:text-indigo-400 transition-colors">
        {quote.symbol}
      </Link>
      <div className="flex-1">
        <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${up ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, (quote.volume / 120_000_000) * 100)}%` }}
          />
        </div>
      </div>
      <span className="text-gray-400 text-xs font-mono w-16 text-right">{formatVolume(quote.volume)}</span>
      <span className={`text-xs font-mono w-14 text-right ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '+' : ''}{quote.pct.toFixed(2)}%
      </span>
    </div>
  );
}

const CHART_DURATIONS = ['1M', '3M', '6M', '1Y', 'YTD'];
const CHART_RANGE = { '1M': '1mo', '3M': '3mo', '6M': '6mo', '1Y': '1y', 'YTD': 'ytd' };

export default function Home() {
  const [watchlist, setWatchlist] = useState(['AAPL', 'MSFT', 'NVDA']);
  const [showLosers, setShowLosers] = useState(false);
  const [chartDuration, setChartDuration] = useState('3M');

  const { data: indexQuotes = [] } = useQuotes(INDEX_SYMBOLS, { refreshMs: 30_000 });
  const { data: trendingQuotes = [], loading: trendingLoading } = useQuotes(TRENDING, { refreshMs: 30_000 });
  const { data: spyChart } = useChart('SPY', '1d', CHART_RANGE[chartDuration]);
  const { data: news = [], loading: newsLoading } = useMarketNews();

  const spyQuote = indexQuotes.find(q => q.symbol === 'SPY');

  const [gainers, losers, trendingMap] = useMemo(() => {
    const map = Object.fromEntries(trendingQuotes.map(q => [q.symbol, q]));
    const sorted = [...trendingQuotes].sort((a, b) => b.pct - a.pct);
    return [sorted.slice(0, 5), [...trendingQuotes].sort((a, b) => a.pct - b.pct).slice(0, 5), map];
  }, [trendingQuotes]);

  const displayed = showLosers ? losers : gainers;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-indigo-400" />
          <h1 className="text-white font-bold text-xl">Market Summary</h1>
          <span className="text-xs text-gray-500 ml-1">· Live Data</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1" />
        </div>
        <p className="text-gray-500 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · NYSE &amp; NASDAQ
        </p>
      </div>

      {/* Index cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {indexQuotes.length > 0
          ? indexQuotes.map(q => <IndexCard key={q.symbol} quote={q} />)
          : INDEX_SYMBOLS.map(sym => (
              <div key={sym} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 animate-pulse">
                <div className="h-3 bg-[#2a2a2a] rounded mb-3 w-24" />
                <div className="h-6 bg-[#2a2a2a] rounded mb-2 w-20" />
                <div className="h-3 bg-[#2a2a2a] rounded w-28" />
              </div>
            ))
        }
      </div>

      {/* Main chart + gainers/losers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-white font-semibold">S&P 500</h2>
              {spyQuote && (
                <p className={`text-sm font-mono ${spyQuote.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {spyQuote.price.toFixed(2)}
                  <span className="ml-2">
                    {spyQuote.pct >= 0 ? '+' : ''}{spyQuote.change.toFixed(2)} ({spyQuote.pct >= 0 ? '+' : ''}{spyQuote.pct.toFixed(2)}%)
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-1">
              {CHART_DURATIONS.map(d => (
                <button key={d} onClick={() => setChartDuration(d)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    chartDuration === d
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white'
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <SPYChart ohlcv={spyChart?.ohlcv} />
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex gap-1 mb-4">
            <button onClick={() => setShowLosers(false)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md font-medium transition-colors ${!showLosers ? 'bg-green-500/10 text-green-400' : 'text-gray-500 hover:bg-white/5'}`}>
              <TrendingUp size={13} /> Top Gainers
            </button>
            <button onClick={() => setShowLosers(true)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-md font-medium transition-colors ${showLosers ? 'bg-red-500/10 text-red-400' : 'text-gray-500 hover:bg-white/5'}`}>
              <TrendingDown size={13} /> Top Losers
            </button>
          </div>
          <div className="space-y-1">
            {displayed.map(s => (
              <Link key={s.symbol} to={`/stock/${s.symbol}`}
                className="flex items-center justify-between py-2 hover:bg-white/5 px-2 rounded-lg transition-colors">
                <div>
                  <p className="text-white text-sm font-semibold">{s.symbol}</p>
                  <p className="text-gray-500 text-xs">{s.name.split(' ').slice(0, 2).join(' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-mono">${s.price.toFixed(2)}</p>
                  <p className={`text-xs font-mono ${s.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Trending stocks */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" />
            <h2 className="text-white font-semibold text-lg">Trending Stocks</h2>
          </div>
          <Link to="/markets" className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors">View All →</Link>
        </div>
        {trendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {TRENDING.map(s => (
              <div key={s} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-[#2a2a2a] rounded mb-2 w-16" />
                <div className="h-12 bg-[#2a2a2a] rounded mb-2" />
                <div className="h-4 bg-[#2a2a2a] rounded w-24" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {TRENDING.map(sym => trendingMap[sym] && (
              <StockCard key={sym} stock={trendingMap[sym]}
                onAddToWatchlist={s => setWatchlist(prev => prev.includes(s) ? prev : [...prev, s])} />
            ))}
          </div>
        )}
      </div>

      {/* Volume leaders + News */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-400" />
            <h2 className="text-white font-semibold">Volume Leaders</h2>
          </div>
          <div>
            {TRENDING.slice(0, 7).map(sym => trendingMap[sym] && (
              <VolumeBar key={sym} quote={trendingMap[sym]} />
            ))}
          </div>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Latest News</h2>
            <Link to="/news" className="text-indigo-400 text-sm hover:text-indigo-300">All News →</Link>
          </div>
          {newsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse py-3 border-b border-[#2a2a2a]">
                  <div className="h-3 bg-[#2a2a2a] rounded mb-1.5 w-full" />
                  <div className="h-3 bg-[#2a2a2a] rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div>{news.slice(0, 6).map(a => <NewsCard key={a.id} article={a} compact />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
