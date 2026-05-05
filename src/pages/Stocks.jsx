import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useQuotes } from '../hooks/useYahoo';
import { colorClass, fmt$, signStr, formatMarketCap } from '../services/yahooApi';

const SECTOR_COLORS = {
  'Technology':         '#6366f1',
  'Semiconductors':     '#8b5cf6',
  'Communication':      '#3b82f6',
  'Financials':         '#10b981',
  'Healthcare':         '#ec4899',
  'Consumer Disc.':     '#f59e0b',
  'Consumer Staples':   '#84cc16',
  'Energy':             '#f97316',
  'Industrials':        '#64748b',
  'Real Estate':        '#06b6d4',
  'Materials':          '#ca8a04',
  'Utilities':          '#0ea5e9',
};

const STOCK_INFO = {
  // ── Technology ──────────────────────────────────────────────
  AAPL:  { fullName: 'Apple Inc.',                   sector: 'Technology',       industry: 'Consumer Electronics',   founded: 1976 },
  MSFT:  { fullName: 'Microsoft Corporation',         sector: 'Technology',       industry: 'Software – Infrastructure', founded: 1975 },
  ORCL:  { fullName: 'Oracle Corporation',            sector: 'Technology',       industry: 'Software – Infrastructure', founded: 1977 },
  CRM:   { fullName: 'Salesforce Inc.',               sector: 'Technology',       industry: 'Software – Application',  founded: 1999 },
  ADBE:  { fullName: 'Adobe Inc.',                    sector: 'Technology',       industry: 'Software – Application',  founded: 1982 },
  NOW:   { fullName: 'ServiceNow Inc.',               sector: 'Technology',       industry: 'Software – Application',  founded: 2004 },
  INTU:  { fullName: 'Intuit Inc.',                   sector: 'Technology',       industry: 'Software – Application',  founded: 1983 },
  PLTR:  { fullName: 'Palantir Technologies',         sector: 'Technology',       industry: 'Software – Application',  founded: 2003 },
  UBER:  { fullName: 'Uber Technologies Inc.',        sector: 'Technology',       industry: 'Software – Application',  founded: 2009 },
  SNOW:  { fullName: 'Snowflake Inc.',                sector: 'Technology',       industry: 'Software – Infrastructure', founded: 2012 },
  SHOP:  { fullName: 'Shopify Inc.',                  sector: 'Technology',       industry: 'Software – Application',  founded: 2006 },
  NET:   { fullName: 'Cloudflare Inc.',               sector: 'Technology',       industry: 'Software – Infrastructure', founded: 2009 },

  // ── Semiconductors ──────────────────────────────────────────
  NVDA:  { fullName: 'NVIDIA Corporation',            sector: 'Semiconductors',   industry: 'Semiconductors',          founded: 1993 },
  AMD:   { fullName: 'Advanced Micro Devices',        sector: 'Semiconductors',   industry: 'Semiconductors',          founded: 1969 },
  INTC:  { fullName: 'Intel Corporation',             sector: 'Semiconductors',   industry: 'Semiconductors',          founded: 1968 },
  QCOM:  { fullName: 'Qualcomm Incorporated',         sector: 'Semiconductors',   industry: 'Semiconductors',          founded: 1985 },
  AVGO:  { fullName: 'Broadcom Inc.',                 sector: 'Semiconductors',   industry: 'Semiconductors',          founded: 1961 },
  MU:    { fullName: 'Micron Technology Inc.',        sector: 'Semiconductors',   industry: 'Semiconductors – Memory', founded: 1978 },
  TXN:   { fullName: 'Texas Instruments Inc.',        sector: 'Semiconductors',   industry: 'Semiconductors',          founded: 1951 },
  AMAT:  { fullName: 'Applied Materials Inc.',        sector: 'Semiconductors',   industry: 'Semiconductor Equipment', founded: 1967 },
  LRCX:  { fullName: 'Lam Research Corporation',     sector: 'Semiconductors',   industry: 'Semiconductor Equipment', founded: 1980 },
  KLAC:  { fullName: 'KLA Corporation',               sector: 'Semiconductors',   industry: 'Semiconductor Equipment', founded: 1975 },
  MRVL:  { fullName: 'Marvell Technology Inc.',       sector: 'Semiconductors',   industry: 'Semiconductors',          founded: 1997 },

  // ── Communication Services ──────────────────────────────────
  GOOGL: { fullName: 'Alphabet Inc.',                 sector: 'Communication',    industry: 'Internet Content & Info', founded: 1998 },
  META:  { fullName: 'Meta Platforms Inc.',           sector: 'Communication',    industry: 'Internet Content & Info', founded: 2004 },
  NFLX:  { fullName: 'Netflix Inc.',                  sector: 'Communication',    industry: 'Entertainment',           founded: 1997 },
  DIS:   { fullName: 'Walt Disney Company',           sector: 'Communication',    industry: 'Entertainment',           founded: 1923 },
  T:     { fullName: 'AT&T Inc.',                     sector: 'Communication',    industry: 'Telecom Services',        founded: 1983 },
  VZ:    { fullName: 'Verizon Communications',        sector: 'Communication',    industry: 'Telecom Services',        founded: 2000 },
  CMCSA: { fullName: 'Comcast Corporation',           sector: 'Communication',    industry: 'Telecom Services',        founded: 1963 },
  SNAP:  { fullName: 'Snap Inc.',                     sector: 'Communication',    industry: 'Internet Content & Info', founded: 2011 },
  SPOT:  { fullName: 'Spotify Technology S.A.',       sector: 'Communication',    industry: 'Entertainment',           founded: 2006 },
  RBLX:  { fullName: 'Roblox Corporation',            sector: 'Communication',    industry: 'Entertainment',           founded: 2004 },

  // ── Financials ───────────────────────────────────────────────
  JPM:   { fullName: 'JPMorgan Chase & Co.',          sector: 'Financials',       industry: 'Diversified Banks',       founded: 1799 },
  BAC:   { fullName: 'Bank of America Corp.',         sector: 'Financials',       industry: 'Diversified Banks',       founded: 1904 },
  GS:    { fullName: 'Goldman Sachs Group Inc.',      sector: 'Financials',       industry: 'Capital Markets',         founded: 1869 },
  V:     { fullName: 'Visa Inc.',                     sector: 'Financials',       industry: 'Credit Services',         founded: 1958 },
  MA:    { fullName: 'Mastercard Incorporated',       sector: 'Financials',       industry: 'Credit Services',         founded: 1966 },
  WFC:   { fullName: 'Wells Fargo & Company',         sector: 'Financials',       industry: 'Diversified Banks',       founded: 1852 },
  MS:    { fullName: 'Morgan Stanley',                sector: 'Financials',       industry: 'Capital Markets',         founded: 1935 },
  AXP:   { fullName: 'American Express Company',      sector: 'Financials',       industry: 'Credit Services',         founded: 1850 },
  BLK:   { fullName: 'BlackRock Inc.',                sector: 'Financials',       industry: 'Asset Management',        founded: 1988 },
  SCHW:  { fullName: 'Charles Schwab Corporation',   sector: 'Financials',       industry: 'Capital Markets',         founded: 1971 },
  C:     { fullName: 'Citigroup Inc.',                sector: 'Financials',       industry: 'Diversified Banks',       founded: 1998 },
  COF:   { fullName: 'Capital One Financial Corp.',  sector: 'Financials',       industry: 'Credit Services',         founded: 1994 },
  COIN:  { fullName: 'Coinbase Global Inc.',          sector: 'Financials',       industry: 'Capital Markets',         founded: 2012 },
  PYPL:  { fullName: 'PayPal Holdings Inc.',          sector: 'Financials',       industry: 'Credit Services',         founded: 1998 },

  // ── Healthcare ───────────────────────────────────────────────
  LLY:   { fullName: 'Eli Lilly and Company',         sector: 'Healthcare',       industry: 'Drug Manufacturers',      founded: 1876 },
  JNJ:   { fullName: 'Johnson & Johnson',             sector: 'Healthcare',       industry: 'Drug Manufacturers',      founded: 1886 },
  UNH:   { fullName: 'UnitedHealth Group Inc.',       sector: 'Healthcare',       industry: 'Healthcare Plans',        founded: 1977 },
  PFE:   { fullName: 'Pfizer Inc.',                   sector: 'Healthcare',       industry: 'Drug Manufacturers',      founded: 1849 },
  ABBV:  { fullName: 'AbbVie Inc.',                   sector: 'Healthcare',       industry: 'Drug Manufacturers',      founded: 2013 },
  MRK:   { fullName: 'Merck & Co. Inc.',              sector: 'Healthcare',       industry: 'Drug Manufacturers',      founded: 1891 },
  TMO:   { fullName: 'Thermo Fisher Scientific',      sector: 'Healthcare',       industry: 'Medical Devices',         founded: 1956 },
  AMGN:  { fullName: 'Amgen Inc.',                    sector: 'Healthcare',       industry: 'Biotechnology',           founded: 1980 },
  GILD:  { fullName: 'Gilead Sciences Inc.',          sector: 'Healthcare',       industry: 'Biotechnology',           founded: 1987 },
  REGN:  { fullName: 'Regeneron Pharmaceuticals',     sector: 'Healthcare',       industry: 'Biotechnology',           founded: 1988 },
  ISRG:  { fullName: 'Intuitive Surgical Inc.',       sector: 'Healthcare',       industry: 'Medical Devices',         founded: 1995 },

  // ── Consumer Discretionary ──────────────────────────────────
  AMZN:  { fullName: 'Amazon.com Inc.',               sector: 'Consumer Disc.',   industry: 'Internet Retail',         founded: 1994 },
  TSLA:  { fullName: 'Tesla Inc.',                    sector: 'Consumer Disc.',   industry: 'Auto Manufacturers',      founded: 2003 },
  NKE:   { fullName: 'Nike Inc.',                     sector: 'Consumer Disc.',   industry: 'Footwear & Accessories',  founded: 1964 },
  MCD:   { fullName: "McDonald's Corporation",        sector: 'Consumer Disc.',   industry: 'Restaurants',             founded: 1940 },
  SBUX:  { fullName: 'Starbucks Corporation',         sector: 'Consumer Disc.',   industry: 'Restaurants',             founded: 1971 },
  HD:    { fullName: 'Home Depot Inc.',               sector: 'Consumer Disc.',   industry: 'Home Improvement',        founded: 1978 },
  LOW:   { fullName: "Lowe's Companies Inc.",         sector: 'Consumer Disc.',   industry: 'Home Improvement',        founded: 1921 },
  TGT:   { fullName: 'Target Corporation',            sector: 'Consumer Disc.',   industry: 'Discount Stores',         founded: 1902 },
  BKNG:  { fullName: 'Booking Holdings Inc.',         sector: 'Consumer Disc.',   industry: 'Internet Travel',         founded: 1997 },
  GM:    { fullName: 'General Motors Company',        sector: 'Consumer Disc.',   industry: 'Auto Manufacturers',      founded: 1908 },
  F:     { fullName: 'Ford Motor Company',            sector: 'Consumer Disc.',   industry: 'Auto Manufacturers',      founded: 1903 },

  // ── Consumer Staples ─────────────────────────────────────────
  WMT:   { fullName: 'Walmart Inc.',                  sector: 'Consumer Staples', industry: 'Discount Stores',         founded: 1962 },
  PG:    { fullName: 'Procter & Gamble Co.',          sector: 'Consumer Staples', industry: 'Household Products',      founded: 1837 },
  KO:    { fullName: 'Coca-Cola Company',             sector: 'Consumer Staples', industry: 'Beverages',               founded: 1892 },
  PEP:   { fullName: 'PepsiCo Inc.',                  sector: 'Consumer Staples', industry: 'Beverages',               founded: 1898 },
  MDLZ:  { fullName: 'Mondelez International',        sector: 'Consumer Staples', industry: 'Confectioners',           founded: 2012 },
  CL:    { fullName: 'Colgate-Palmolive Company',     sector: 'Consumer Staples', industry: 'Household Products',      founded: 1806 },
  MNST:  { fullName: 'Monster Beverage Corporation',  sector: 'Consumer Staples', industry: 'Beverages',               founded: 1935 },

  // ── Energy ───────────────────────────────────────────────────
  XOM:   { fullName: 'Exxon Mobil Corporation',       sector: 'Energy',           industry: 'Oil & Gas Integrated',    founded: 1870 },
  CVX:   { fullName: 'Chevron Corporation',           sector: 'Energy',           industry: 'Oil & Gas Integrated',    founded: 1879 },
  COP:   { fullName: 'ConocoPhillips',                sector: 'Energy',           industry: 'Oil & Gas E&P',           founded: 1875 },
  OXY:   { fullName: 'Occidental Petroleum Corp.',   sector: 'Energy',           industry: 'Oil & Gas E&P',           founded: 1920 },
  SLB:   { fullName: 'SLB (Schlumberger)',            sector: 'Energy',           industry: 'Oil & Gas Equipment',     founded: 1926 },
  EOG:   { fullName: 'EOG Resources Inc.',            sector: 'Energy',           industry: 'Oil & Gas E&P',           founded: 1999 },
  PSX:   { fullName: 'Phillips 66',                   sector: 'Energy',           industry: 'Oil & Gas Refining',      founded: 2012 },

  // ── Industrials ──────────────────────────────────────────────
  CAT:   { fullName: 'Caterpillar Inc.',              sector: 'Industrials',      industry: 'Farm & Heavy Machinery',  founded: 1925 },
  DE:    { fullName: 'Deere & Company',               sector: 'Industrials',      industry: 'Farm & Heavy Machinery',  founded: 1837 },
  BA:    { fullName: 'Boeing Company',                sector: 'Industrials',      industry: 'Aerospace & Defense',     founded: 1916 },
  HON:   { fullName: 'Honeywell International',       sector: 'Industrials',      industry: 'Diversified Industrials', founded: 1906 },
  GE:    { fullName: 'GE Aerospace',                  sector: 'Industrials',      industry: 'Aerospace & Defense',     founded: 1892 },
  LMT:   { fullName: 'Lockheed Martin Corporation',  sector: 'Industrials',      industry: 'Aerospace & Defense',     founded: 1912 },
  RTX:   { fullName: 'RTX Corporation',               sector: 'Industrials',      industry: 'Aerospace & Defense',     founded: 1934 },
  UPS:   { fullName: 'United Parcel Service Inc.',    sector: 'Industrials',      industry: 'Integrated Freight',      founded: 1907 },
  FDX:   { fullName: 'FedEx Corporation',             sector: 'Industrials',      industry: 'Integrated Freight',      founded: 1971 },

  // ── Real Estate ──────────────────────────────────────────────
  AMT:   { fullName: 'American Tower Corporation',    sector: 'Real Estate',      industry: 'REIT – Specialty',        founded: 1995 },
  PLD:   { fullName: 'Prologis Inc.',                 sector: 'Real Estate',      industry: 'REIT – Industrial',       founded: 1983 },
  EQIX:  { fullName: 'Equinix Inc.',                  sector: 'Real Estate',      industry: 'REIT – Specialty',        founded: 1998 },
  SPG:   { fullName: 'Simon Property Group',          sector: 'Real Estate',      industry: 'REIT – Retail',           founded: 1993 },
  O:     { fullName: 'Realty Income Corporation',     sector: 'Real Estate',      industry: 'REIT – Retail',           founded: 1969 },

  // ── Materials ────────────────────────────────────────────────
  LIN:   { fullName: 'Linde plc',                     sector: 'Materials',        industry: 'Specialty Chemicals',     founded: 1879 },
  APD:   { fullName: 'Air Products & Chemicals',      sector: 'Materials',        industry: 'Specialty Chemicals',     founded: 1940 },
  NEM:   { fullName: 'Newmont Corporation',           sector: 'Materials',        industry: 'Gold',                    founded: 1916 },
  FCX:   { fullName: 'Freeport-McMoRan Inc.',         sector: 'Materials',        industry: 'Copper',                  founded: 1912 },
  DOW:   { fullName: 'Dow Inc.',                      sector: 'Materials',        industry: 'Chemicals',               founded: 2019 },

  // ── Utilities ────────────────────────────────────────────────
  NEE:   { fullName: 'NextEra Energy Inc.',           sector: 'Utilities',        industry: 'Utilities – Renewable',   founded: 1925 },
  DUK:   { fullName: 'Duke Energy Corporation',       sector: 'Utilities',        industry: 'Utilities – Regulated',   founded: 1904 },
  SO:    { fullName: 'Southern Company',              sector: 'Utilities',        industry: 'Utilities – Regulated',   founded: 1945 },
  AEP:   { fullName: 'American Electric Power',       sector: 'Utilities',        industry: 'Utilities – Regulated',   founded: 1906 },
};

const CATEGORIES = [
  { id: 'all',              label: 'All Stocks'        },
  { id: 'Technology',       label: 'Technology'        },
  { id: 'Semiconductors',   label: 'Semiconductors'    },
  { id: 'Communication',    label: 'Communication'     },
  { id: 'Financials',       label: 'Financials'        },
  { id: 'Healthcare',       label: 'Healthcare'        },
  { id: 'Consumer Disc.',   label: 'Consumer Disc.'    },
  { id: 'Consumer Staples', label: 'Consumer Staples'  },
  { id: 'Energy',           label: 'Energy'            },
  { id: 'Industrials',      label: 'Industrials'       },
  { id: 'Real Estate',      label: 'Real Estate'       },
  { id: 'Materials',        label: 'Materials'         },
  { id: 'Utilities',        label: 'Utilities'         },
];

const ALL_SYMBOLS = Object.keys(STOCK_INFO);

function Skeleton({ className = '' }) {
  return <div className={`bg-[#2a2a2a] rounded-md animate-pulse ${className}`} />;
}

export default function Stocks() {
  const [sector, setSector] = useState('all');

  const { data: quotes = [], loading } = useQuotes(ALL_SYMBOLS, { refreshMs: 30_000 });

  const quoteMap = useMemo(
    () => Object.fromEntries(quotes.map(q => [q.symbol, q])),
    [quotes],
  );

  const filtered = useMemo(() => {
    const syms = sector === 'all'
      ? ALL_SYMBOLS
      : ALL_SYMBOLS.filter(s => STOCK_INFO[s].sector === sector);
    return syms.map(sym => ({ sym, info: STOCK_INFO[sym], q: quoteMap[sym] }));
  }, [sector, quoteMap]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold mb-1">Stocks</h1>
        <p className="text-gray-500 text-sm">Popular stocks across all sectors — real-time prices and key info</p>
      </div>

      {/* Sector filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setSector(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              sector === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500'
            }`}>
            {cat.id !== 'all' && (
              <span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                style={{ backgroundColor: SECTOR_COLORS[cat.id] }} />
            )}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Stocks grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(({ sym, info, q }) => {
          const up    = q ? q.pct >= 0 : null;
          const color = SECTOR_COLORS[info.sector] ?? '#6366f1';
          return (
            <Link key={sym} to={`/stock/${sym}`}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group">

              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                    <span className="font-bold text-[10px]" style={{ color }}>
                      {sym.slice(0, 3)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{sym}</p>
                    <p className="text-gray-500 text-[10px] truncate max-w-[110px]">{info.industry}</p>
                  </div>
                </div>

                {q ? (
                  <div className="text-right">
                    <p className="text-white font-mono font-bold text-sm">{fmt$(q.price)}</p>
                    <p className={`text-[11px] font-mono flex items-center gap-0.5 justify-end ${colorClass(q.pct)}`}>
                      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {signStr(q.pct)}%
                    </p>
                  </div>
                ) : loading ? (
                  <div className="text-right space-y-1">
                    <Skeleton className="w-14 h-4" />
                    <Skeleton className="w-10 h-3" />
                  </div>
                ) : null}
              </div>

              {/* Company name */}
              <p className="text-gray-400 text-xs mb-3 truncate">{info.fullName}</p>

              {/* Metrics row */}
              <div className="flex items-center justify-between">
                {/* Sector badge */}
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${color}22`, color }}>
                  {info.sector}
                </span>

                {/* Market cap or volume */}
                {q?.marketCap ? (
                  <span className="text-gray-500 text-[10px] font-mono">
                    {formatMarketCap(q.marketCap)}
                  </span>
                ) : (
                  <span className="text-gray-600 text-[10px]">Est. {info.founded}</span>
                )}
              </div>

              {/* P/E if available */}
              {q?.pe != null && (
                <div className="mt-2 pt-2 border-t border-[#2a2a2a] flex items-center justify-between">
                  <span className="text-gray-600 text-[10px]">P/E</span>
                  <span className="text-yellow-400 font-mono text-[10px] font-semibold">{q.pe.toFixed(1)}</span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
