import { useState, useMemo } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Bitcoin } from 'lucide-react';
import { useQuotes, useChart } from '../hooks/useYahoo';
import { colorClass, fmt$, signStr, formatMarketCap, formatVolume } from '../services/yahooApi';

const CRYPTO_INFO = {
  'BTC-USD':  { name: 'Bitcoin',         symbol: 'BTC',  color: '#f7931a', category: 'Layer 1' },
  'ETH-USD':  { name: 'Ethereum',        symbol: 'ETH',  color: '#627eea', category: 'Layer 1' },
  'SOL-USD':  { name: 'Solana',          symbol: 'SOL',  color: '#9945ff', category: 'Layer 1' },
  'BNB-USD':  { name: 'BNB',             symbol: 'BNB',  color: '#f3ba2f', category: 'Exchange' },
  'XRP-USD':  { name: 'XRP',             symbol: 'XRP',  color: '#346aa9', category: 'Payment' },
  'ADA-USD':  { name: 'Cardano',         symbol: 'ADA',  color: '#0d1e2d', category: 'Layer 1' },
  'AVAX-USD': { name: 'Avalanche',       symbol: 'AVAX', color: '#e84142', category: 'Layer 1' },
  'DOGE-USD': { name: 'Dogecoin',        symbol: 'DOGE', color: '#c2a633', category: 'Meme' },
  'DOT-USD':  { name: 'Polkadot',        symbol: 'DOT',  color: '#e6007a', category: 'Layer 0' },
  'LINK-USD': { name: 'Chainlink',       symbol: 'LINK', color: '#375bd2', category: 'Oracle' },
  'MATIC-USD':{ name: 'Polygon',         symbol: 'MATIC',color: '#8247e5', category: 'Layer 2' },
  'UNI-USD':  { name: 'Uniswap',         symbol: 'UNI',  color: '#ff007a', category: 'DeFi' },
  'LTC-USD':  { name: 'Litecoin',        symbol: 'LTC',  color: '#bfbbbb', category: 'Payment' },
  'NEAR-USD': { name: 'NEAR Protocol',   symbol: 'NEAR', color: '#00ec97', category: 'Layer 1' },
  'ARB-USD':  { name: 'Arbitrum',        symbol: 'ARB',  color: '#2d374b', category: 'Layer 2' },
  'OP-USD':   { name: 'Optimism',        symbol: 'OP',   color: '#ff0420', category: 'Layer 2' },
  'ATOM-USD': { name: 'Cosmos',          symbol: 'ATOM', color: '#2e3148', category: 'Layer 0' },
  'SUI-USD':  { name: 'Sui',             symbol: 'SUI',  color: '#4ca3ff', category: 'Layer 1' },
  'APT-USD':  { name: 'Aptos',           symbol: 'APT',  color: '#00d4aa', category: 'Layer 1' },
  'INJ-USD':  { name: 'Injective',       symbol: 'INJ',  color: '#00b4d8', category: 'DeFi' },
};

const ALL_SYMS   = Object.keys(CRYPTO_INFO);
const CATEGORIES = ['All', 'Layer 1', 'Layer 2', 'Layer 0', 'DeFi', 'Payment', 'Exchange', 'Meme', 'Oracle'];

function Skeleton({ className = '' }) {
  return <div className={`bg-[#2a2a2a] rounded-md animate-pulse ${className}`} />;
}

function Sparkline({ sym }) {
  const { data: chart } = useChart(sym, '5m', '1d');
  const points = useMemo(() => {
    if (!chart?.ohlcv?.length) return [];
    return chart.ohlcv.map((p, i) => ({ i, v: p.close }));
  }, [chart]);

  if (!points.length) return <div className="w-20 h-8" />;
  const positive = points[points.length - 1]?.v >= points[0]?.v;
  const stroke   = positive ? '#22c55e' : '#ef4444';
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={points}>
        <defs>
          <linearGradient id={`cg-${sym}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={stroke} stopOpacity={0.3} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={1.5}
          fill={`url(#cg-${sym})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CryptoCard({ sym, info, q, loading }) {
  const up = q ? q.pct >= 0 : null;
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[#2a2a2a]"
            style={{ background: `${info.color}20` }}>
            <span className="font-bold text-xs" style={{ color: info.color }}>{info.symbol.slice(0, 3)}</span>
          </div>
          <div>
            <p className="text-white font-bold text-base">{info.name}</p>
            <p className="text-gray-500 text-xs">{info.symbol}</p>
          </div>
        </div>
        {q ? (
          <div className="text-right">
            <p className="text-white font-mono font-bold">{fmt$(q.price, q.price < 1 ? 4 : 2)}</p>
            <p className={`text-xs font-mono flex items-center gap-0.5 justify-end ${colorClass(q.pct)}`}>
              {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {signStr(q.pct)}%
            </p>
          </div>
        ) : loading ? (
          <div className="text-right space-y-1">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-12 h-3" />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{info.category}</span>
        <Sparkline sym={sym} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#111] rounded-lg p-2">
          <p className="text-gray-600 text-[10px]">Market Cap</p>
          <p className="text-white font-mono text-xs font-semibold">
            {q?.marketCap ? formatMarketCap(q.marketCap) : '—'}
          </p>
        </div>
        <div className="bg-[#111] rounded-lg p-2">
          <p className="text-gray-600 text-[10px]">Volume 24h</p>
          <p className="text-white font-mono text-xs font-semibold">
            {q?.volume ? formatVolume(q.volume) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Crypto() {
  const [cat, setCat] = useState('All');

  const { data: quotes = [], loading } = useQuotes(ALL_SYMS, { refreshMs: 15_000 });

  const quoteMap = useMemo(
    () => Object.fromEntries(quotes.map(q => [q.symbol, q])),
    [quotes],
  );

  const filtered = useMemo(() => {
    const syms = cat === 'All'
      ? ALL_SYMS
      : ALL_SYMS.filter(s => CRYPTO_INFO[s].category === cat);
    return syms.map(sym => ({ sym, info: CRYPTO_INFO[sym], q: quoteMap[sym] }));
  }, [cat, quoteMap]);

  const totalMcap = useMemo(
    () => quotes.reduce((s, q) => s + (q.marketCap ?? 0), 0),
    [quotes],
  );

  const topGainer = useMemo(() => {
    if (!quotes.length) return null;
    return quotes.reduce((best, q) => (!best || q.pct > best.pct ? q : best), null);
  }, [quotes]);

  const topLoser = useMemo(() => {
    if (!quotes.length) return null;
    return quotes.reduce((best, q) => (!best || q.pct < best.pct ? q : best), null);
  }, [quotes]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Bitcoin size={24} className="text-[#f7931a]" />
          <h1 className="text-white text-2xl font-bold">Cryptos</h1>
        </div>
        <p className="text-gray-500 text-sm">Real-time cryptocurrency prices and market data</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Total Market Cap</p>
          <p className="text-white font-bold font-mono">{totalMcap ? formatMarketCap(totalMcap) : '—'}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Top Gainer (24h)</p>
          {topGainer ? (
            <p className="text-green-400 font-bold font-mono text-sm">
              {CRYPTO_INFO[topGainer.symbol]?.symbol ?? topGainer.symbol} +{topGainer.pct.toFixed(2)}%
            </p>
          ) : <p className="text-white font-bold font-mono">—</p>}
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">Top Loser (24h)</p>
          {topLoser ? (
            <p className="text-red-400 font-bold font-mono text-sm">
              {CRYPTO_INFO[topLoser.symbol]?.symbol ?? topLoser.symbol} {topLoser.pct.toFixed(2)}%
            </p>
          ) : <p className="text-white font-bold font-mono">—</p>}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              cat === c
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500'
            }`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(({ sym, info, q }) => (
          <CryptoCard key={sym} sym={sym} info={info} q={q} loading={loading} />
        ))}
      </div>
    </div>
  );
}
