import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, TrendingUp, Bell, User, Menu, X, Loader2 } from 'lucide-react';
import { useSearch, useDebounced } from '../hooks/useYahoo';

const POPULAR = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL'];

export default function Navbar() {
  const [query, setQuery]           = useState('');
  const [open, setOpen]             = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const dropdownRef = useRef();
  const navigate    = useNavigate();
  const location    = useLocation();

  const debouncedQuery = useDebounced(query, 280);
  const { data: results = [], loading: searching } = useSearch(debouncedQuery);

  // Open dropdown when results arrive; close when query is cleared
  useEffect(() => {
    if (debouncedQuery.length >= 1) setOpen(true);
    else setOpen(false);
  }, [debouncedQuery, results]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handle(e) {
      if (!dropdownRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  function select(symbol) {
    setQuery('');
    setOpen(false);
    navigate(`/stock/${symbol}`);
  }

  const navLinks = [
    { to: '/markets',    label: 'Markets'    },
    { to: '/news',       label: 'News'       },
    { to: '/crypto',     label: 'Cryptos'    },
    { to: '/stocks',     label: 'Stocks'     },
    { to: '/etfs',       label: 'ETFs'       },
    { to: '/calendar',   label: 'Calendar'   },
    { to: '/strategies', label: 'Strategies' },
    { to: '/screener',   label: 'Screener'   },
    { to: '/education',  label: 'Education'  },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#2a2a2a] shadow-lg">
      <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <TrendingUp className="text-indigo-500" size={22} />
          <span className="text-white font-bold text-lg tracking-tight">FinVision</span>
        </Link>

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

        <div className="flex-1 max-w-md ml-auto relative" ref={dropdownRef}>
          <div className="relative">
            {searching
              ? <Loader2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin" />
              : <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            }
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder="Search stocks, ETFs, crypto…"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white placeholder-gray-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {open && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 overflow-hidden">
              {results.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider border-b border-[#2a2a2a]">
                    Results
                  </div>
                  {results.map(s => (
                    <button key={s.symbol} onClick={() => select(s.symbol)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center shrink-0">
                        <span className="text-indigo-400 font-bold text-[10px]">{s.symbol.slice(0,2)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{s.symbol}</p>
                        <p className="text-gray-500 text-xs truncate">{s.name}</p>
                      </div>
                      {s.exchange && (
                        <span className="text-[10px] text-gray-600 shrink-0">{s.exchange}</span>
                      )}
                    </button>
                  ))}
                </>
              ) : query.length > 0 && !searching ? (
                <div className="px-4 py-4 text-gray-500 text-sm text-center">No results for "{query}"</div>
              ) : null}

              {!query && (
                <>
                  <div className="px-3 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider border-b border-[#2a2a2a]">
                    Popular
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3">
                    {POPULAR.map(sym => (
                      <button key={sym} onClick={() => select(sym)}
                        className="px-2.5 py-1 text-xs text-gray-300 bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-300 rounded-md transition-colors border border-[#2a2a2a]">
                        {sym}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

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
