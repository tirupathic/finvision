import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Plus } from 'lucide-react';
import StockMiniChart from './StockMiniChart';
import { formatMarketCap } from '../services/yahooApi';

export default function StockCard({ stock, onAddToWatchlist }) {
  const up = stock.pct >= 0;

  return (
    <Link to={`/stock/${stock.symbol}`}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group">
      <div className="flex items-start justify-between mb-1">
        <div>
          <span className="text-white font-bold text-base">{stock.symbol}</span>
          <p className="text-gray-500 text-xs truncate max-w-[120px]">{stock.name}</p>
        </div>
        <button
          onClick={e => { e.preventDefault(); onAddToWatchlist?.(stock.symbol); }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-all">
          <Plus size={14} />
        </button>
      </div>

      <div className="my-2">
        <StockMiniChart symbol={stock.symbol} basePrice={stock.price} positive={up} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-white font-mono font-semibold">
          ${stock.price.toFixed(2)}
        </span>
        <div className={`flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full ${up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {up ? '+' : ''}{stock.pct.toFixed(2)}%
        </div>
      </div>

      <div className="mt-1.5 text-xs text-gray-600">
        Mkt Cap: <span className="text-gray-400">{formatMarketCap(stock.marketCap)}</span>
      </div>
    </Link>
  );
}
