import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, Globe, Zap, DollarSign, Landmark, ShieldCheck, BarChart2, Calendar, AlertCircle, Info } from 'lucide-react';
import { SECTORS } from '../services/stockData';
import { formatMarketCap, formatVolume } from '../services/yahooApi';
import { useQuotes, useMarketNews } from '../hooks/useYahoo';
import StockCard from '../components/StockCard';
import NewsCard from '../components/NewsCard';

const INCOME_ETF_SYMS = ['JEPI', 'JEPQ', 'SCHD', 'VYM', 'HDV', 'QYLD', 'BND', 'SGOV'];
const DIVIDEND_SYMS   = ['ABBV', 'MO', 'VZ', 'T', 'O', 'JNJ', 'KO', 'IBM', 'PEP', 'PG'];
const YIELD_SYMS      = ['^IRX', '^FVX', '^TNX', '^TYX'];

const INCOME_ETF_INFO = {
  JEPI: { name: 'JPMorgan Equity Premium Income', type: 'Options Income',   typeColor: '#a78bfa' },
  JEPQ: { name: 'JPMorgan Nasdaq Equity Premium', type: 'Options Income',   typeColor: '#a78bfa' },
  SCHD: { name: 'Schwab US Dividend Equity',       type: 'Dividend Growth',  typeColor: '#34d399' },
  VYM:  { name: 'Vanguard High Dividend Yield',    type: 'High Dividend',    typeColor: '#34d399' },
  HDV:  { name: 'iShares Core High Dividend',      type: 'High Dividend',    typeColor: '#34d399' },
  QYLD: { name: 'Global X Nasdaq Covered Call',    type: 'Covered Call',     typeColor: '#fb923c' },
  BND:  { name: 'Vanguard Total Bond Market',      type: 'Bond Income',      typeColor: '#6366f1' },
  SGOV: { name: 'iShares 0-3M Treasury Bond',      type: 'T-Bills',          typeColor: '#38bdf8' },
};

const DIV_STOCK_INFO = {
  ABBV: { name: 'AbbVie Inc.',       sector: 'Healthcare' },
  MO:   { name: 'Altria Group',      sector: 'Consumer' },
  VZ:   { name: 'Verizon Comm.',     sector: 'Telecom' },
  T:    { name: 'AT&T Inc.',         sector: 'Telecom' },
  O:    { name: 'Realty Income',     sector: 'REIT' },
  JNJ:  { name: 'Johnson & Johnson', sector: 'Healthcare' },
  KO:   { name: 'Coca-Cola',         sector: 'Consumer' },
  IBM:  { name: 'IBM Corp.',         sector: 'Technology' },
  PEP:  { name: 'PepsiCo Inc.',      sector: 'Consumer' },
  PG:   { name: 'Procter & Gamble',  sector: 'Consumer' },
};

const YIELD_LABELS = { '^IRX': '3-Month', '^FVX': '5-Year', '^TNX': '10-Year', '^TYX': '30-Year' };

function vixLabel(v) {
  if (v < 12)  return { text: 'Extreme Calm',  color: '#34d399' };
  if (v < 20)  return { text: 'Low Volatility', color: '#86efac' };
  if (v < 30)  return { text: 'Elevated',        color: '#f59e0b' };
  if (v < 40)  return { text: 'High Fear',        color: '#f87171' };
  return              { text: 'Extreme Fear',    color: '#ef4444' };
}

const INDEX_SYMBOLS  = ['SPY', 'QQQ', 'DIA', 'IWM'];
const GLOBAL_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM', 'GLD', 'BTC-USD', 'ETH-USD', 'USO'];
const INDEX_NAMES    = {
  SPY: 'S&P 500', QQQ: 'NASDAQ 100', DIA: 'Dow Jones', IWM: 'Russell 2K',
  GLD: 'Gold', 'BTC-USD': 'Bitcoin', 'ETH-USD': 'Ethereum', USO: 'Crude Oil',
};

const TRENDING = ['AAPL', 'NVDA', 'TSLA', 'META', 'AMZN', 'MSFT', 'AMD', 'NFLX', 'GOOGL', 'JPM'];
const TABLE_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'TSLA', 'JPM', 'JNJ', 'V',
  'PG',   'UNH',  'HD',   'MA',   'DIS',  'NFLX',  'AMD',  'INTC','CRM','ADBE',
  'ORCL', 'CSCO', 'IBM',  'MU',   'QCOM', 'TXN',   'AVGO', 'NOW', 'PYPL','COIN',
];

const INDEX_DETAIL = [
  { sym: 'SPY', name: 'S&P 500',     label: 'Large Cap Blend',   color: '#6366f1' },
  { sym: 'QQQ', name: 'NASDAQ 100',  label: 'Large Cap Growth',  color: '#3b82f6' },
  { sym: 'DIA', name: 'Dow Jones',   label: '30 Blue Chips',     color: '#22c55e' },
  { sym: 'IWM', name: 'Russell 2K',  label: 'Small Cap Blend',   color: '#f59e0b' },
];

const ECO_CALENDAR = [
  { date: 'May 6',   day: 'Wed', name: 'FOMC Rate Decision',          impact: 'High',   est: '4.25–4.50%',  prev: '4.25–4.50%', note: 'Fed expected to hold; watch for hawkish/dovish tone shift' },
  { date: 'May 7',   day: 'Thu', name: 'Initial Jobless Claims',      impact: 'Medium', est: '215K',        prev: '220K',       note: 'Leading indicator of labor market health' },
  { date: 'May 8',   day: 'Fri', name: 'Nonfarm Payrolls (Apr)',      impact: 'High',   est: '+178K',       prev: '+228K',      note: 'Biggest monthly market mover — watch unemployment rate' },
  { date: 'May 12',  day: 'Tue', name: 'CPI Inflation (Apr)',         impact: 'High',   est: '+0.3% MoM',   prev: '+0.2% MoM',  note: 'Core CPI drives Fed expectations and bond yields' },
  { date: 'May 13',  day: 'Wed', name: 'PPI Producer Prices (Apr)',   impact: 'Medium', est: '+0.2% MoM',   prev: '+0.0% MoM',  note: 'Leading inflation indicator; upstream cost pressures' },
  { date: 'May 14',  day: 'Thu', name: 'Retail Sales (Apr)',          impact: 'High',   est: '+0.4% MoM',   prev: '+1.4% MoM',  note: 'Consumer spending drives ~70% of US GDP' },
  { date: 'May 15',  day: 'Fri', name: 'Michigan Consumer Sentiment', impact: 'Medium', est: '52.8',        prev: '52.2',       note: 'Consumer confidence and inflation expectations survey' },
  { date: 'May 28',  day: 'Thu', name: 'GDP Q1 Second Estimate',      impact: 'High',   est: '-0.2%',       prev: '-0.3%',      note: 'Revision to Q1 advance estimate; tariff impact visible' },
  { date: 'Jun 5',   day: 'Thu', name: 'Nonfarm Payrolls (May)',      impact: 'High',   est: '+165K',       prev: '+178K',      note: 'Monthly jobs data; key input for June FOMC decision' },
  { date: 'Jun 11',  day: 'Wed', name: 'FOMC Rate Decision',          impact: 'High',   est: '4.25–4.50%',  prev: '4.25–4.50%', note: 'Markets pricing ~40% chance of a 25bps cut here' },
];

function SectorCard({ sector }) {
  const up        = sector.change >= 0;
  const intensity = Math.min(1, Math.abs(sector.change) / 3);
  return (
    <div className="rounded-xl p-4 border transition-all hover:scale-[1.02] cursor-pointer"
      style={{
        borderColor: up ? `rgba(34,197,94,${intensity * 0.5 + 0.1})` : `rgba(239,68,68,${intensity * 0.5 + 0.1})`,
        background:  up ? `rgba(34,197,94,${intensity * 0.08})` : `rgba(239,68,68,${intensity * 0.08})`,
      }}>
      <p className="text-gray-300 text-sm font-medium mb-1">{sector.name}</p>
      <p className={`text-lg font-bold font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '+' : ''}{sector.change.toFixed(2)}%
      </p>
    </div>
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
          <div className={`h-full rounded-full ${up ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, (quote.volume / 120_000_000) * 100)}%` }} />
        </div>
      </div>
      <span className="text-gray-400 text-xs font-mono w-16 text-right">{formatVolume(quote.volume)}</span>
      <span className={`text-xs font-mono w-14 text-right ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? '+' : ''}{quote.pct.toFixed(2)}%
      </span>
    </div>
  );
}

function TableSkeleton({ rows, cols }) {
  return [...Array(rows)].map((_, i) => (
    <tr key={i} className="border-b border-[#2a2a2a]">
      {[...Array(cols)].map((__, j) => (
        <td key={j} className="py-3 px-4">
          <div className="h-3 bg-[#2a2a2a] rounded animate-pulse w-16" />
        </td>
      ))}
    </tr>
  ));
}

export default function Markets() {
  const [showLosers, setShowLosers] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState(null);

  const { data: globalQuotes = [] }                          = useQuotes(GLOBAL_SYMBOLS,  { refreshMs: 30_000 });
  const { data: trendingQuotes = [], loading: trendingLoad } = useQuotes(TRENDING,         { refreshMs: 30_000 });
  const { data: tableQuotes   = [], loading: tableLoad }     = useQuotes(TABLE_SYMBOLS,    { refreshMs: 60_000 });
  const { data: incomeEtfQuotes = [] }                       = useQuotes(INCOME_ETF_SYMS,  { refreshMs: 60_000 });
  const { data: dividendQuotes  = [] }                       = useQuotes(DIVIDEND_SYMS,    { refreshMs: 60_000 });
  const { data: yieldQuotes     = [] }                       = useQuotes(YIELD_SYMS,       { refreshMs: 60_000 });
  const { data: vixQuotes       = [] }                       = useQuotes(['^VIX'],         { refreshMs: 30_000 });
  const { data: news = [],          loading: newsLoad }      = useMarketNews();

  const vixQuote  = vixQuotes[0];
  const vixLevel  = vixLabel(vixQuote?.price ?? 20);
  const incomeMap = useMemo(() => Object.fromEntries(incomeEtfQuotes.map(q => [q.symbol, q])), [incomeEtfQuotes]);
  const divMap    = useMemo(() => Object.fromEntries(dividendQuotes.map(q => [q.symbol, q])), [dividendQuotes]);
  const yieldMap  = useMemo(() => Object.fromEntries(yieldQuotes.map(q => [q.symbol, q])), [yieldQuotes]);
  const yieldCurveData = useMemo(() =>
    YIELD_SYMS.map(sym => ({ label: YIELD_LABELS[sym], value: yieldMap[sym]?.price ?? 0 })),
    [yieldMap]);

  const [gainers, losers, trendingMap] = useMemo(() => {
    const map    = Object.fromEntries(trendingQuotes.map(q => [q.symbol, q]));
    const sorted = [...trendingQuotes].sort((a, b) => b.pct - a.pct);
    return [sorted.slice(0, 5), [...trendingQuotes].sort((a, b) => a.pct - b.pct).slice(0, 5), map];
  }, [trendingQuotes]);

  const [tableGainers, tableLosers] = useMemo(() => [
    [...tableQuotes].sort((a, b) => b.pct - a.pct),
    [...tableQuotes].sort((a, b) => a.pct - b.pct),
  ], [tableQuotes]);

  const displayed = showLosers ? losers : gainers;
  const indexMap  = useMemo(() => Object.fromEntries(globalQuotes.map(q => [q.symbol, q])), [globalQuotes]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-indigo-400" />
          <h1 className="text-white font-bold text-xl">Markets</h1>
          <span className="text-xs text-gray-500 ml-1">· Live Data</span>
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-1" />
        </div>
        <p className="text-gray-500 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · NYSE &amp; NASDAQ
        </p>
      </div>

      {/* Global Markets bar */}
      <section className="mb-8">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Global Markets</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {globalQuotes.length > 0
            ? globalQuotes.map(q => {
                const up = q.pct >= 0;
                return (
                  <div key={q.symbol} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 hover:border-indigo-500/30 transition-colors">
                    <p className="text-gray-500 text-xs mb-1 truncate">{INDEX_NAMES[q.symbol] || q.symbol}</p>
                    <p className="text-white font-mono text-sm font-bold">
                      {q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
                      {up ? '+' : ''}{q.pct.toFixed(2)}%
                    </p>
                  </div>
                );
              })
            : GLOBAL_SYMBOLS.map(sym => (
                <div key={sym} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 animate-pulse">
                  <div className="h-2.5 bg-[#2a2a2a] rounded mb-2 w-16" />
                  <div className="h-3.5 bg-[#2a2a2a] rounded mb-1.5 w-12" />
                  <div className="h-2.5 bg-[#2a2a2a] rounded w-10" />
                </div>
              ))
          }
        </div>
      </section>

      {/* Market Pulse Strip */}
      <section className="mb-8">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Market Pulse</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* VIX Fear Gauge */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-gray-500" />
                <span className="text-gray-500 text-xs">VIX · Fear Gauge</span>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ color: vixLevel.color, background: `${vixLevel.color}20` }}>
                {vixLevel.text}
              </span>
            </div>
            <div className="flex items-end gap-3">
              <span className="text-white text-2xl font-bold font-mono">
                {vixQuote ? vixQuote.price.toFixed(2) : '—'}
              </span>
              {vixQuote && (
                <span className={`text-sm font-mono mb-0.5 ${vixQuote.pct >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {vixQuote.pct >= 0 ? '+' : ''}{vixQuote.pct.toFixed(2)}%
                </span>
              )}
            </div>
            {vixQuote && (
              <div className="mt-2 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (vixQuote.price / 80) * 100)}%`, background: vixLevel.color }} />
              </div>
            )}
          </div>

          {/* Treasury Yield Curve */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 lg:col-span-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Landmark size={13} className="text-gray-500" />
              <span className="text-gray-500 text-xs">US Treasury Yields</span>
            </div>
            <div className="space-y-1.5">
              {YIELD_SYMS.map(sym => {
                const q = yieldMap[sym];
                return (
                  <div key={sym} className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs w-16">{YIELD_LABELS[sym]}</span>
                    <div className="flex-1 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${Math.min(100, (q?.price ?? 0) / 6 * 100)}%` }} />
                    </div>
                    <span className="text-white text-xs font-mono w-10 text-right">
                      {q ? `${q.price.toFixed(2)}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Market Stats */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3 lg:col-span-2">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart2 size={13} className="text-gray-500" />
              <span className="text-gray-500 text-xs">Key Stats</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Gold',    sym: 'GLD',     suffix: '/oz' },
                { label: 'Oil (WTI)', sym: 'USO',   suffix: '/bbl' },
                { label: 'Bitcoin', sym: 'BTC-USD',  suffix: '' },
              ].map(({ label, sym, suffix }) => {
                const q = globalQuotes.find(g => g.symbol === sym);
                return (
                  <div key={sym} className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">{label}</span>
                    <div className="text-right">
                      <span className="text-white text-xs font-mono">
                        {q ? `$${q.price.toLocaleString('en-US', { maximumFractionDigits: 0 })}${suffix}` : '—'}
                      </span>
                      {q && (
                        <span className={`ml-2 text-xs font-mono ${q.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {q.pct >= 0 ? '+' : ''}{q.pct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Major Index Overview */}
      <section className="mb-8">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Major Indices</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {INDEX_DETAIL.map(({ sym, name, label, color }) => {
            const q = indexMap[sym];
            const up = (q?.pct ?? 0) >= 0;
            const rangePos = q?.week52High && q?.week52Low
              ? ((q.price - q.week52Low) / (q.week52High - q.week52Low)) * 100
              : null;
            return (
              <Link key={sym} to={`/stock/${sym}`}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-indigo-500/30 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-white font-bold text-sm">{sym}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{name}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 bg-[#2a2a2a] px-2 py-0.5 rounded">{label}</span>
                </div>
                {q ? (
                  <>
                    <p className="text-white text-xl font-bold font-mono mb-0.5">
                      ${q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-sm font-mono mb-4 ${up ? 'text-green-400' : 'text-red-400'}`}>
                      {up ? '+' : ''}{q.change.toFixed(2)} &nbsp;({up ? '+' : ''}{q.pct.toFixed(2)}%)
                    </p>
                    {/* 52W Range bar */}
                    {rangePos !== null && (
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                          <span>52W Low ${q.week52Low.toFixed(0)}</span>
                          <span>52W High ${q.week52High.toFixed(0)}</span>
                        </div>
                        <div className="h-1.5 bg-[#2a2a2a] rounded-full relative">
                          <div className="h-full rounded-full" style={{ width: `${rangePos}%`, background: color, opacity: 0.5 }} />
                          <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-white"
                            style={{ left: `calc(${rangePos}% - 5px)`, background: color }} />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 text-center">
                          {rangePos.toFixed(0)}% of 52W range
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-x-3 text-xs border-t border-[#2a2a2a] pt-3">
                      <div>
                        <p className="text-gray-600 text-[10px]">Open</p>
                        <p className="text-gray-300 font-mono">${q.open?.toFixed(2) ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-[10px]">Volume</p>
                        <p className="text-gray-300 font-mono">{formatVolume(q.volume)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-6 bg-[#2a2a2a] rounded w-24" />
                    <div className="h-4 bg-[#2a2a2a] rounded w-16" />
                    <div className="h-2 bg-[#2a2a2a] rounded w-full mt-4" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Economic Calendar + Quick Gainers/Losers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Economic Calendar */}
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={15} className="text-indigo-400" />
            <h2 className="text-white font-semibold">Economic Calendar</h2>
            <span className="text-gray-600 text-xs ml-1">· Upcoming key events</span>
          </div>
          <div className="space-y-1">
            {ECO_CALENDAR.map((ev, i) => {
              const impactColor = ev.impact === 'High' ? '#ef4444' : ev.impact === 'Medium' ? '#f59e0b' : '#6b7280';
              const isExpanded  = expandedEvent === i;
              return (
                <div key={i}>
                  <button onClick={() => setExpandedEvent(isExpanded ? null : i)}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/5 transition-colors text-left">
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-white text-xs font-bold">{ev.date}</p>
                      <p className="text-gray-600 text-[10px]">{ev.day}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200 text-sm font-medium truncate">{ev.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-gray-600">Est</p>
                        <p className="text-xs font-mono text-gray-300">{ev.est}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] text-gray-600">Prev</p>
                        <p className="text-xs font-mono text-gray-500">{ev.prev}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{ color: impactColor, background: `${impactColor}18` }}>
                        {ev.impact}
                      </span>
                      <Info size={12} className={`transition-colors ${isExpanded ? 'text-indigo-400' : 'text-gray-600'}`} />
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="ml-[68px] mr-3 mb-2 px-3 py-2 bg-[#111] rounded-lg border border-[#2a2a2a]">
                      <p className="text-gray-400 text-xs leading-relaxed">{ev.note}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Gainers / Losers */}
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

      {/* Sector heatmap */}
      <section className="mb-8">
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Sector Performance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {SECTORS.map(s => <SectorCard key={s.name} sector={s} />)}
        </div>
      </section>

      {/* Trending stocks */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-yellow-400" />
          <h2 className="text-white font-semibold text-lg">Trending Stocks</h2>
        </div>
        {trendingLoad ? (
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
              <StockCard key={sym} stock={trendingMap[sym]} onAddToWatchlist={() => {}} />
            ))}
          </div>
        )}
      </section>

      {/* Volume leaders + News */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-indigo-400" />
            <h2 className="text-white font-semibold">Volume Leaders</h2>
          </div>
          {TRENDING.slice(0, 7).map(sym => trendingMap[sym] && (
            <VolumeBar key={sym} quote={trendingMap[sym]} />
          ))}
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Latest News</h2>
            <Link to="/news" className="text-indigo-400 text-sm hover:text-indigo-300">All News →</Link>
          </div>
          {newsLoad ? (
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

      {/* Streams of Income */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={16} className="text-green-400" />
          <h2 className="text-white font-semibold text-lg">Streams of Income</h2>
          <span className="text-gray-500 text-xs ml-1">Dividend · Bond · Options Premium</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income ETFs */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Income ETFs
            </h3>
            <div className="space-y-0">
              {INCOME_ETF_SYMS.map(sym => {
                const q = incomeMap[sym];
                const info = INCOME_ETF_INFO[sym];
                const divYield = q?.yield ?? 0;
                return (
                  <div key={sym} className="flex items-center gap-3 py-2.5 border-b border-[#2a2a2a] last:border-0">
                    <Link to={`/stock/${sym}`} className="w-14 text-white font-bold text-sm hover:text-indigo-400 transition-colors shrink-0">
                      {sym}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-400 text-xs truncate">{info.name}</p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ color: info.typeColor, background: `${info.typeColor}18` }}>
                        {info.type}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 font-bold text-sm font-mono">
                        {divYield > 0 ? `${divYield.toFixed(1)}%` : '—'}
                      </p>
                      <p className="text-gray-500 text-xs font-mono">yield</p>
                    </div>
                    <div className="text-right w-20 shrink-0">
                      <p className="text-white text-sm font-mono">{q ? `$${q.price.toFixed(2)}` : '—'}</p>
                      {q && (
                        <p className={`text-xs font-mono ${q.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {q.pct >= 0 ? '+' : ''}{q.pct.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dividend Stocks */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400" /> High Dividend Stocks
            </h3>
            <div className="space-y-0">
              {DIVIDEND_SYMS.map(sym => {
                const q = divMap[sym];
                const info = DIV_STOCK_INFO[sym];
                const divYield = q?.yield ?? 0;
                const annualDiv = q ? (q.price * divYield / 100) : 0;
                return (
                  <div key={sym} className="flex items-center gap-3 py-2.5 border-b border-[#2a2a2a] last:border-0">
                    <Link to={`/stock/${sym}`} className="w-14 text-white font-bold text-sm hover:text-indigo-400 transition-colors shrink-0">
                      {sym}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-400 text-xs truncate">{info.name}</p>
                      <span className="text-[10px] text-gray-600">{info.sector}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-green-400 font-bold text-sm font-mono">
                        {divYield > 0 ? `${divYield.toFixed(1)}%` : '—'}
                      </p>
                      <p className="text-gray-500 text-xs font-mono">
                        {annualDiv > 0 ? `$${annualDiv.toFixed(2)}/yr` : 'yield'}
                      </p>
                    </div>
                    <div className="text-right w-20 shrink-0">
                      <p className="text-white text-sm font-mono">{q ? `$${q.price.toFixed(2)}` : '—'}</p>
                      {q && (
                        <p className={`text-xs font-mono ${q.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {q.pct >= 0 ? '+' : ''}{q.pct.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Full Gainers & Losers tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {[
          { title: 'Top Gainers', data: tableGainers, color: 'text-green-400', icon: TrendingUp },
          { title: 'Top Losers',  data: tableLosers,  color: 'text-red-400',   icon: TrendingDown },
        ].map(({ title, data, color, icon: Icon }) => (
          <div key={title} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon size={16} className={color} />
              <h2 className="text-white font-semibold">{title}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
                  <th className="text-left py-1.5">Symbol</th>
                  <th className="text-right py-1.5">Price</th>
                  <th className="text-right py-1.5">Change</th>
                  <th className="text-right py-1.5">% Chg</th>
                  <th className="text-right py-1.5">Volume</th>
                  <th className="text-right py-1.5">Mkt Cap</th>
                </tr>
              </thead>
              <tbody>
                {tableLoad
                  ? <TableSkeleton rows={8} cols={6} />
                  : data.slice(0, 8).map(s => {
                      const up = s.pct >= 0;
                      return (
                        <tr key={s.symbol} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5">
                          <td className="py-2">
                            <Link to={`/stock/${s.symbol}`} className="text-white font-semibold hover:text-indigo-400 transition-colors">
                              {s.symbol}
                            </Link>
                            <p className="text-gray-500 text-xs">{s.name.split(' ').slice(0, 2).join(' ')}</p>
                          </td>
                          <td className="py-2 text-right text-white font-mono">${s.price.toFixed(2)}</td>
                          <td className={`py-2 text-right font-mono text-xs ${up ? 'text-green-400' : 'text-red-400'}`}>
                            {up ? '+' : ''}{s.change.toFixed(2)}
                          </td>
                          <td className={`py-2 text-right font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
                            {up ? '+' : ''}{s.pct.toFixed(2)}%
                          </td>
                          <td className="py-2 text-right text-gray-400 font-mono text-xs">{formatVolume(s.volume)}</td>
                          <td className="py-2 text-right text-gray-400 text-xs">{formatMarketCap(s.marketCap)}</td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* All Stocks table */}
      <section>
        <h2 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">All Stocks</h2>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
                {['Symbol', 'Name', 'Price', 'Change', '% Change', 'Volume', 'Avg Volume', 'Mkt Cap', 'P/E', '52W High', '52W Low'].map(h => (
                  <th key={h} className="text-left py-3 px-4 first:pl-5 last:pr-5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableLoad
                ? <TableSkeleton rows={10} cols={11} />
                : tableQuotes.map(s => {
                    const up = s.pct >= 0;
                    return (
                      <tr key={s.symbol} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5">
                        <td className="py-3 px-4 pl-5">
                          <Link to={`/stock/${s.symbol}`} className="text-white font-bold hover:text-indigo-400 transition-colors">
                            {s.symbol}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-gray-400 max-w-[180px] truncate">{s.name}</td>
                        <td className="py-3 px-4 text-white font-mono">${s.price.toFixed(2)}</td>
                        <td className={`py-3 px-4 font-mono text-sm ${up ? 'text-green-400' : 'text-red-400'}`}>
                          {up ? '+' : ''}{s.change.toFixed(2)}
                        </td>
                        <td className={`py-3 px-4 font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${up ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            {up ? '+' : ''}{s.pct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-xs">{formatVolume(s.volume)}</td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-xs">{formatVolume(s.avgVolume)}</td>
                        <td className="py-3 px-4 text-gray-400 text-xs">{formatMarketCap(s.marketCap)}</td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-xs">{s.pe != null ? s.pe.toFixed(1) : '—'}</td>
                        <td className="py-3 px-4 text-gray-400 font-mono text-xs">${s.week52High.toFixed(2)}</td>
                        <td className="py-3 px-4 pr-5 text-gray-400 font-mono text-xs">${s.week52Low.toFixed(2)}</td>
                      </tr>
                    );
                  })
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
