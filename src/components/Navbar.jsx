import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, TrendingUp, Bell, User, Menu, X, Loader2, Clock, ArrowUpRight, Flame } from 'lucide-react';
import { useSearch, useDebounced } from '../hooks/useYahoo';
import { useTabs } from '../context/TabsContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const TRENDING_DEFAULTS = [
  { symbol: 'NVDA',    name: 'NVIDIA Corporation',   exchange: 'NMS' },
  { symbol: 'AAPL',    name: 'Apple Inc.',            exchange: 'NMS' },
  { symbol: 'TSLA',    name: 'Tesla Inc.',            exchange: 'NMS' },
  { symbol: 'META',    name: 'Meta Platforms Inc.',   exchange: 'NMS' },
  { symbol: 'MSFT',    name: 'Microsoft Corporation', exchange: 'NMS' },
  { symbol: 'AMZN',    name: 'Amazon.com Inc.',       exchange: 'NMS' },
  { symbol: 'BTC-USD', name: 'Bitcoin / USD',         exchange: 'CCC' },
  { symbol: 'SPY',     name: 'SPDR S&P 500 ETF',      exchange: 'PCX' },
];

const MAX_RECENT  = 5;
const RECENT_KEY  = 'fv_recent_searches';

// ── Helpers ───────────────────────────────────────────────────────────────────

function assetType(exchange) {
  if (!exchange) return { label: 'Stock', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  const ex = exchange.toUpperCase();
  if (ex === 'CCC' || ex.includes('CRYPTO')) return { label: 'Crypto', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
  if (['PCX', 'BATS', 'ARCA'].some(x => ex.includes(x))) return { label: 'ETF', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
  return { label: 'Stock', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
}

function Highlight({ text = '', query = '' }) {
  if (!query) return <>{text}</>;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-indigo-300 font-bold">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </>
  );
}

function loadRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
  catch { return []; }
}

// ── Result row ────────────────────────────────────────────────────────────────

function ResultRow({ item, query, active, onSelect, onRemove }) {
  const type = assetType(item.exchange);
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onSelect(item); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all group outline-none
        ${active ? 'bg-indigo-600/15' : 'hover:bg-white/[0.04]'}`}>
      {/* Avatar */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-[11px] border transition-colors
        ${active
          ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300'
          : 'bg-[#242424] border-[#2e2e2e] text-gray-500 group-hover:bg-indigo-600/20 group-hover:border-indigo-500/30 group-hover:text-indigo-300'}`}>
        {item.symbol.replace('-', '').slice(0, 2)}
      </div>

      {/* Name + symbol */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-tight ${active ? 'text-indigo-200' : 'text-white'}`}>
          <Highlight text={item.symbol} query={query} />
        </p>
        <p className="text-gray-500 text-xs truncate leading-tight mt-0.5">
          <Highlight text={item.name} query={query} />
        </p>
      </div>

      {/* Type badge */}
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${type.cls}`}>
        {type.label}
      </span>

      {/* Remove (recent only) or arrow */}
      {onRemove ? (
        <button
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRemove(item.symbol); }}
          className="p-1 text-gray-700 hover:text-gray-400 rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100">
          <X size={11} />
        </button>
      ) : (
        <ArrowUpRight size={12}
          className={`shrink-0 text-gray-700 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
      )}
    </button>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-9 h-9 rounded-xl bg-[#242424] animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-16 bg-[#2a2a2a] rounded animate-pulse" />
        <div className="h-2.5 w-32 bg-[#242424] rounded animate-pulse" />
      </div>
      <div className="h-4 w-10 bg-[#242424] rounded-full animate-pulse" />
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon: Icon, label, extra }) {
  return (
    <div className="flex items-center gap-1.5 px-3 pt-3 pb-1.5">
      <Icon size={11} className="text-gray-600" />
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">{label}</span>
      {extra && <span className="text-[10px] text-gray-700 ml-auto">{extra}</span>}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const [query,         setQuery]         = useState('');
  const [open,          setOpen]          = useState(false);
  const [activeIdx,     setActiveIdx]     = useState(-1);
  const [mobileMenu,    setMobileMenu]    = useState(false);
  const [recentSearches, setRecentSearches] = useState(loadRecent);

  const inputRef     = useRef(null);
  const containerRef = useRef(null);
  const navigate     = useNavigate();
  const location     = useLocation();
  const { addTab }   = useTabs();

  const debouncedQuery = useDebounced(query, 160);
  const { data: apiResults = [], loading: searching } = useSearch(debouncedQuery);

  // The flat list used for keyboard navigation
  const navItems = query.trim()
    ? apiResults
    : [
        ...recentSearches,
        ...TRENDING_DEFAULTS.filter(t => !recentSearches.find(r => r.symbol === t.symbol)),
      ];

  // Reset active index when query or results change
  useEffect(() => { setActiveIdx(-1); }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ── Keyboard navigation ───────────────────────────────────────────────────

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, navItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && navItems[activeIdx]) {
          select(navItems[activeIdx]);
        } else if (query.trim()) {
          select({ symbol: query.trim().toUpperCase(), name: query.trim(), exchange: '' });
        }
        break;
      case 'Escape':
        setOpen(false);
        setActiveIdx(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  }

  // ── Selection + recent history ────────────────────────────────────────────

  function select(item) {
    const entry = { symbol: item.symbol, name: item.name || item.symbol, exchange: item.exchange || '' };
    const updated = [entry, ...recentSearches.filter(r => r.symbol !== entry.symbol)].slice(0, MAX_RECENT);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    addTab(entry.symbol);
    setQuery('');
    setOpen(false);
    setActiveIdx(-1);
    navigate(`/stock/${entry.symbol}`);
  }

  function removeRecent(symbol) {
    const updated = recentSearches.filter(r => r.symbol !== symbol);
    setRecentSearches(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  }

  const hasQuery    = query.trim().length > 0;
  const showResults = hasQuery;
  const showEmpty   = hasQuery && !searching && apiResults.length === 0 && debouncedQuery === query.trim();

  // ── Nav links ─────────────────────────────────────────────────────────────

  const navLinks = [
    { to: '/markets',    label: 'Markets'    },
    { to: '/news',       label: 'News'       },
    { to: '/crypto',     label: 'Cryptos'    },
    { to: '/stocks',     label: 'Stocks'     },
    { to: '/etfs',       label: 'ETFs'       },
    { to: '/calendar',   label: 'Calendar'   },
    { to: '/screener',   label: 'Screener'   },
    { to: '/education',  label: 'Education'  },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#2a2a2a] shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <TrendingUp className="text-indigo-500" size={22} />
          <span className="text-white font-bold text-lg tracking-tight">FinVision</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1 ml-2">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                location.pathname === l.to || (l.to === '/markets' && location.pathname === '/')
                  ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md ml-auto" ref={containerRef}>
          {/* Input */}
          <div className="relative">
            {searching
              ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin pointer-events-none" />
              : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            }
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search stocks, ETFs, crypto…"
              autoComplete="off"
              spellCheck={false}
              className={`w-full bg-[#141414] border text-sm text-white placeholder-gray-600 rounded-xl pl-9 pr-8 py-2 focus:outline-none transition-all ${
                open ? 'border-indigo-500/60 bg-[#1a1a1a]' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
            />
            {query && (
              <button
                onMouseDown={e => { e.preventDefault(); setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-0.5 rounded">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          {open && (
            <div className="absolute left-0 right-0 mt-1.5 bg-[#141414] border border-[#2e2e2e] rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden">

              {/* ── Searching skeleton ── */}
              {searching && (
                <div className="py-1">
                  <SectionLabel icon={Search} label="Searching…" />
                  {[0,1,2].map(i => <SkeletonRow key={i} />)}
                </div>
              )}

              {/* ── API results ── */}
              {!searching && showResults && apiResults.length > 0 && (
                <div className="py-1">
                  <SectionLabel icon={Search} label="Results" extra={`${apiResults.length} found`} />
                  {apiResults.map((item, i) => (
                    <ResultRow
                      key={item.symbol}
                      item={item}
                      query={query}
                      active={activeIdx === i}
                      onSelect={select}
                    />
                  ))}
                </div>
              )}

              {/* ── Empty state ── */}
              {showEmpty && (
                <div className="px-4 py-8 text-center">
                  <Search size={24} className="mx-auto mb-2 text-gray-700" />
                  <p className="text-gray-400 text-sm font-medium">No results for "{query}"</p>
                  <p className="text-gray-600 text-xs mt-1">Try a symbol like AAPL, BTC-USD, or QQQ</p>
                </div>
              )}

              {/* ── Recent searches (no query) ── */}
              {!hasQuery && recentSearches.length > 0 && (
                <div className="py-1 border-b border-[#222]">
                  <SectionLabel icon={Clock} label="Recent" />
                  {recentSearches.map((item, i) => {
                    const navIdx = i;
                    return (
                      <ResultRow
                        key={item.symbol}
                        item={item}
                        query=""
                        active={activeIdx === navIdx}
                        onSelect={select}
                        onRemove={removeRecent}
                      />
                    );
                  })}
                </div>
              )}

              {/* ── Trending (no query) ── */}
              {!hasQuery && (() => {
                const filtered = TRENDING_DEFAULTS.filter(t => !recentSearches.find(r => r.symbol === t.symbol));
                if (filtered.length === 0) return null;
                return (
                  <div className="py-1">
                    <SectionLabel icon={Flame} label="Trending" />
                    {filtered.map((item, i) => {
                      const navIdx = recentSearches.length + i;
                      return (
                        <ResultRow
                          key={item.symbol}
                          item={item}
                          query=""
                          active={activeIdx === navIdx}
                          onSelect={select}
                        />
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── Footer hint ── */}
              <div className="px-3 py-2 border-t border-[#1e1e1e] flex items-center gap-3 text-[10px] text-gray-700">
                <span><kbd className="px-1 py-0.5 bg-[#222] rounded text-[9px] font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="px-1 py-0.5 bg-[#222] rounded text-[9px] font-mono">↵</kbd> select</span>
                <span><kbd className="px-1 py-0.5 bg-[#222] rounded text-[9px] font-mono">esc</kbd> close</span>
              </div>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <Bell size={18} />
          </button>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors">
            <User size={15} />
            Sign In
          </button>
        </div>

        <button className="md:hidden ml-auto text-gray-400" onClick={() => setMobileMenu(!mobileMenu)}>
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenu && (
        <div className="md:hidden border-t border-[#2a2a2a] px-4 py-3 flex flex-col gap-1">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMobileMenu(false)}
              className="text-sm text-gray-400 hover:text-white px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
