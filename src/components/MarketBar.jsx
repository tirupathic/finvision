import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuotes } from '../hooks/useYahoo';

// ETF/stock proxies for indices — NASDAQ doesn't serve ^GSPC, GC=F, etc.
// Swap these mappings when switching data providers.
const TICKER_MAP = {
  SPY:      { name: 'S&P 500',     link: '/stock/SPY'     },
  QQQ:      { name: 'NASDAQ 100',  link: '/stock/QQQ'     },
  DIA:      { name: 'Dow Jones',   link: '/stock/DIA'     },
  IWM:      { name: 'Russell 2K',  link: '/stock/IWM'     },
  GLD:      { name: 'Gold',        link: '/stock/GLD'     },
  USO:      { name: 'Crude Oil',   link: '/stock/USO'     },
  'BTC-USD':{ name: 'Bitcoin',     link: '/stock/BTC-USD' },
  'ETH-USD':{ name: 'Ethereum',    link: '/stock/ETH-USD' },
};

const SYMBOLS = Object.keys(TICKER_MAP);

const TickerItem = memo(function TickerItem({ quote }) {
  const meta = TICKER_MAP[quote.symbol] || { name: quote.symbol, link: `/stock/${quote.symbol}` };
  const up   = quote.pct >= 0;

  return (
    <Link
      to={meta.link}
      className="flex items-center gap-3 px-5 py-2 border-r border-[#2a2a2a] hover:bg-white/5 transition-colors whitespace-nowrap"
    >
      <span className="text-gray-300 text-xs font-medium">{meta.name}</span>
      <span className="text-white text-xs font-mono font-semibold">
        {quote.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span className={`text-xs font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '+' : ''}{quote.pct.toFixed(2)}%
      </span>
    </Link>
  );
});

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 px-5 py-2 border-r border-[#2a2a2a] whitespace-nowrap">
      <div className="h-2.5 w-16 bg-[#2a2a2a] rounded animate-pulse" />
      <div className="h-2.5 w-14 bg-[#2a2a2a] rounded animate-pulse" />
      <div className="h-2.5 w-10 bg-[#2a2a2a] rounded animate-pulse" />
    </div>
  );
}

export default function MarketBar() {
  const { data: quotes, loading } = useQuotes(SYMBOLS, { refreshMs: 30_000 });

  const items   = quotes?.length ? quotes : null;
  const doubled = useMemo(() => items ? [...items, ...items] : null, [items]);

  return (
    <div className="bg-[#111111] border-b border-[#2a2a2a] overflow-hidden select-none">
      <div className="ticker-scroll flex gap-0" style={{ width: 'max-content' }}>
        {doubled
          ? doubled.map((q, i) => <TickerItem key={`${q.symbol}-${i}`} quote={q} />)
          : SYMBOLS.concat(SYMBOLS).map((s, i) => <SkeletonItem key={`${s}-${i}`} />)
        }
      </div>
    </div>
  );
}
