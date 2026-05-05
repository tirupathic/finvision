import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useQuotes } from '../hooks/useYahoo';
import { ETF_INFO } from '../services/etfData';
import { colorClass, fmt$, signStr } from '../services/yahooApi';

const CATEGORIES = [
  { id: 'all',           label: 'All ETFs' },
  { id: 'broad',         label: 'Broad Market' },
  { id: 'sector',        label: 'Sectors' },
  { id: 'bond',          label: 'Bonds' },
  { id: 'commodity',     label: 'Commodities' },
  { id: 'international', label: 'International' },
  { id: 'crypto',        label: 'Crypto ETFs' },
  { id: 'leveraged',     label: 'Leveraged ETFs' },
];

const CATEGORY_MAP = {
  SPY:  'broad',  QQQ:  'broad',  DIA:  'broad',  IWM: 'broad',
  VTI:  'broad',  VOO:  'broad',  ARKK: 'broad',
  XLF:  'sector', XLK:  'sector', XLE:  'sector', XLV: 'sector',
  XLY:  'sector', XLP:  'sector', XLI:  'sector', XLB: 'sector',
  XLU:  'sector', XLRE: 'sector', XLC:  'sector',
  AGG:  'bond',   TLT:  'bond',   HYG:  'bond',
  GLD:  'commodity', SLV: 'commodity', IAU: 'commodity',
  USO:  'commodity', UNG: 'commodity', PDBC: 'commodity', DBC: 'commodity',
  // Long/leveraged bull
  TQQQ: 'long', UPRO: 'long', SPXL: 'long',
  TECL: 'long', UDOW: 'long', TNA:  'long',
  SOXL: 'long', FNGU: 'long', FAS:  'long',
  LABU: 'long', NAIL: 'long', BULZ: 'long',
  // Short/inverse bear
  SQQQ: 'short', SPXU: 'short', SPXS: 'short',
  TECS: 'short', SDOW: 'short', TZA:  'short',
  SOXS: 'short', FNGD: 'short', FAZ:  'short',
  LABD: 'short',
  // Volatility (grouped under short/inverse for simplicity)
  UVXY: 'short', SVXY: 'long',
  // International — broad
  EFA: 'international', EEM: 'international', VEU: 'international',
  VWO: 'international', IEFA: 'international', VGK: 'international',
  EWJ: 'international', EWZ: 'international', FXI: 'international',
  IEMG: 'international',
  // International — country-specific
  INDA: 'international', MCHI: 'international', KWEB: 'international',
  EWY: 'international',  EWA: 'international',  EWT: 'international',
  // Crypto exposure ETFs
  IBIT: 'crypto', FBTC: 'crypto', GBTC: 'crypto',
  BITB: 'crypto', BITO: 'crypto', ETHA: 'crypto', MSTR: 'crypto',
};

const ALL_SYMBOLS = Object.keys(ETF_INFO);

function Skeleton({ className = '' }) {
  return <div className={`bg-[#2a2a2a] rounded-md animate-pulse ${className}`} />;
}

function ETFCard({ sym, info, q, loading }) {
  const up = q ? q.pct >= 0 : null;
  const isShort = CATEGORY_MAP[sym] === 'short';
  return (
    <Link to={`/stock/${sym}`}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group">

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isShort ? 'bg-red-600/20 border border-red-500/30' : 'bg-indigo-600/20 border border-indigo-500/30'
          }`}>
            <span className={`font-bold text-xs ${isShort ? 'text-red-400' : 'text-indigo-400'}`}>{sym.slice(0, 3)}</span>
          </div>
          <div>
            <p className="text-white font-bold text-base group-hover:text-indigo-300 transition-colors">{sym}</p>
            <p className="text-gray-500 text-xs truncate max-w-[160px]">{info.issuer}</p>
          </div>
        </div>
        {q ? (
          <div className="text-right">
            <p className="text-white font-mono font-bold">{fmt$(q.price)}</p>
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

      <div className="flex items-center gap-2 mb-2">
        <p className="text-gray-400 text-xs line-clamp-1 flex-1">{info.fullName}</p>
        {info.country && (
          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{info.country}</span>
        )}
      </div>
      <p className="text-gray-600 text-xs mb-3 truncate">Tracks: <span className="text-gray-400">{info.index}</span></p>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-[#111] rounded-lg p-2 text-center">
          <p className="text-gray-600 text-[10px]">Exp. Ratio</p>
          <p className="text-yellow-400 font-mono text-xs font-semibold">{info.expenseRatio}%</p>
        </div>
        <div className="bg-[#111] rounded-lg p-2 text-center">
          <p className="text-gray-600 text-[10px]">AUM</p>
          <p className="text-white font-mono text-xs font-semibold">{info.aum}</p>
        </div>
        <div className="bg-[#111] rounded-lg p-2 text-center">
          <p className="text-gray-600 text-[10px]">Holdings</p>
          <p className="text-white font-mono text-xs font-semibold">{info.holdings.length < 5 ? info.holdings.length : '500+'}</p>
        </div>
      </div>

      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {info.sectors.slice(0, 5).map(sec => (
          <div key={sec.name} style={{ width: `${sec.weight}%`, backgroundColor: sec.color }}
            title={`${sec.name}: ${sec.weight}%`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 mt-1.5">
        {info.sectors.slice(0, 3).map(sec => (
          <span key={sec.name} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: sec.color }} />
            {sec.name} {sec.weight}%
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function ETFs() {
  const [category, setCategory] = useState('all');

  const { data: quotes = [], loading } = useQuotes(ALL_SYMBOLS, { refreshMs: 30_000 });

  const quoteMap = useMemo(
    () => Object.fromEntries(quotes.map(q => [q.symbol, q])),
    [quotes],
  );

  const filtered = useMemo(() => {
    let syms;
    if (category === 'all') {
      syms = ALL_SYMBOLS;
    } else if (category === 'leveraged') {
      syms = ALL_SYMBOLS.filter(s => CATEGORY_MAP[s] === 'long' || CATEGORY_MAP[s] === 'short');
    } else {
      syms = ALL_SYMBOLS.filter(s => CATEGORY_MAP[s] === category);
    }
    return syms.map(sym => ({ sym, info: ETF_INFO[sym], q: quoteMap[sym] }));
  }, [category, quoteMap]);

  const longItems  = useMemo(() => filtered.filter(({ sym }) => CATEGORY_MAP[sym] === 'long'),  [filtered]);
  const shortItems = useMemo(() => filtered.filter(({ sym }) => CATEGORY_MAP[sym] === 'short'), [filtered]);
  const isAllLeveraged = category === 'all';
  const isLeveraged    = category === 'leveraged';

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold mb-1">ETFs</h1>
        <p className="text-gray-500 text-sm">Exchange-traded funds — real-time prices, holdings, and sector allocation</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500'
            }`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Long sub-section — shown in 'leveraged' and 'all' views */}
      {(isLeveraged || isAllLeveraged) && longItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-green-400" />
            Long / Leveraged ETFs
            <span className="text-gray-500 text-xs font-normal">({longItems.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {longItems.map(({ sym, info, q }) => (
              <ETFCard key={sym} sym={sym} info={info} q={q} loading={loading} />
            ))}
          </div>
        </div>
      )}

      {/* Short sub-section — shown in 'leveraged' and 'all' views */}
      {(isLeveraged || isAllLeveraged) && shortItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingDown size={16} className="text-red-400" />
            Short / Inverse ETFs
            <span className="text-gray-500 text-xs font-normal">({shortItems.length})</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shortItems.map(({ sym, info, q }) => (
              <ETFCard key={sym} sym={sym} info={info} q={q} loading={loading} />
            ))}
          </div>
        </div>
      )}

      {/* Regular grid — single-category views (broad, sector, bond, commodity, international) */}
      {!isLeveraged && !isAllLeveraged && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(({ sym, info, q }) => (
            <ETFCard key={sym} sym={sym} info={info} q={q} loading={loading} />
          ))}
        </div>
      )}

      {/* Core + International ETFs when viewing 'all' */}
      {isAllLeveraged && (() => {
        const rest = filtered.filter(({ sym }) => CATEGORY_MAP[sym] !== 'long' && CATEGORY_MAP[sym] !== 'short');
        const intl = rest.filter(({ sym }) => CATEGORY_MAP[sym] === 'international');
        const core = rest.filter(({ sym }) => CATEGORY_MAP[sym] !== 'international');
        return (
          <>
            {intl.length > 0 && (
              <div className="mb-8">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  🌍 International ETFs
                  <span className="text-gray-500 text-xs font-normal">({intl.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {intl.map(({ sym, info, q }) => <ETFCard key={sym} sym={sym} info={info} q={q} loading={loading} />)}
                </div>
              </div>
            )}
            {core.length > 0 && (
              <div>
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  Core ETFs
                  <span className="text-gray-500 text-xs font-normal">({core.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {core.map(({ sym, info, q }) => <ETFCard key={sym} sym={sym} info={info} q={q} loading={loading} />)}
                </div>
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
