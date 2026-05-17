import { useState, useRef, useEffect, useMemo } from 'react';
import { Plus, X, Search, Loader2 } from 'lucide-react';
import { CMP_COLORS } from '../hooks/useCompareCharts';
import { useSearch, useDebounced } from '../hooks/useYahoo';

// Self-contained compare bar with live search suggestions.
// Props:
//   compareSyms    string[]        currently added symbols
//   onAdd          (syms: string[]) => void   called with validated symbols to add
//   onRemove       (sym: string) => void
//   onClear        () => void
//   primarySymbol  string          main symbol (excluded from suggestions)
export default function CompareBar({ compareSyms, onAdd, onRemove, onClear, primarySymbol }) {
  const [input,     setInput]     = useState('');
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [error,     setError]     = useState('');
  const containerRef = useRef(null);
  const inputRef     = useRef(null);

  // Search the last typed token so "AAPL, MS" searches for "MS"
  const queryToken = useMemo(() => {
    const parts = input.trim().split(/[\s,]+/);
    return parts.at(-1) ?? '';
  }, [input]);

  const debQuery = useDebounced(queryToken, 200);
  const { data: results = [], loading: searching } = useSearch(debQuery);

  useEffect(() => {
    function handle(e) {
      if (!containerRef.current?.contains(e.target)) { setOpen(false); setActiveIdx(-1); }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  useEffect(() => { setActiveIdx(-1); }, [debQuery]);

  function addFromSuggestion(sym) {
    if (sym === primarySymbol || compareSyms.includes(sym)) return;
    // Also submit any complete tokens already typed (e.g. "AAPL, MS" + pick MSFT → adds AAPL + MSFT)
    const parts = input.toUpperCase().trim().split(/[\s,]+/).filter(Boolean);
    parts.pop();
    const candidates = [sym, ...parts];
    const toAdd = [...new Set(candidates)].filter(s => s !== primarySymbol && !compareSyms.includes(s));
    onAdd(toAdd);
    setInput('');
    setActiveIdx(-1);
    setError('');
    inputRef.current?.focus();
  }

  function addTyped() {
    const parts = input.trim().toUpperCase().split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;

    if (parts.length === 1) {
      const typed = parts[0];
      if (typed === primarySymbol)     { setError('Already viewing this symbol'); return; }
      if (compareSyms.includes(typed)) { setError('Already in compare list');    return; }
      // Validate: if the search has settled for this exact query and no match, reject
      if (!searching && debQuery.toUpperCase() === typed) {
        if (results.length === 0) { setError(`"${typed}" not found`); return; }
        if (!results.find(r => r.symbol.toUpperCase() === typed)) {
          setError(`"${typed}" not found — pick from suggestions`); return;
        }
      }
      onAdd([typed]);
    } else {
      // Multi-symbol: no API validation, add all non-duplicates
      const toAdd = parts.filter(s => s !== primarySymbol && !compareSyms.includes(s));
      if (!toAdd.length) { setInput(''); return; }
      onAdd(toAdd);
    }

    setInput('');
    setError('');
    setOpen(false);
    setActiveIdx(-1);
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); break;
      case 'ArrowUp':   e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0 && results[activeIdx]) addFromSuggestion(results[activeIdx].symbol);
        else addTyped();
        break;
      case 'Escape': setOpen(false); setActiveIdx(-1); break;
      default: break;
    }
  }

  const canAdd = compareSyms.length < 10;

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-gray-400 text-sm font-medium shrink-0">
          Compare with <span className="text-gray-600 text-xs font-normal">({compareSyms.length}/10)</span>
        </span>

        {compareSyms.map((sym, i) => (
          <span key={sym} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-bold"
            style={{ backgroundColor: `${CMP_COLORS[i]}20`, color: CMP_COLORS[i], border: `1px solid ${CMP_COLORS[i]}40` }}>
            {sym}
            <button onClick={() => onRemove(sym)} className="hover:opacity-70 transition-opacity">
              <X size={11} />
            </button>
          </span>
        ))}

        {canAdd && (
          <div className="relative" ref={containerRef}>
            <form onSubmit={e => { e.preventDefault(); addTyped(); }} className="flex items-center gap-2">
              <div className="relative">
                {searching
                  ? <Loader2 size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-400 animate-spin pointer-events-none" />
                  : <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />}
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); setOpen(true); setError(''); }}
                  onFocus={() => { if (queryToken) setOpen(true); }}
                  onKeyDown={onKeyDown}
                  placeholder="AAPL or Apple…"
                  maxLength={60}
                  autoComplete="off"
                  className={`w-44 bg-[#111] border rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                    error ? 'border-red-500/60' : open && queryToken ? 'border-indigo-500/60' : 'border-[#3a3a3a]'
                  }`}
                />
              </div>
              <button type="submit"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors">
                <Plus size={12} /> Add
              </button>
            </form>

            {error && (
              <p className="absolute left-0 top-full mt-0.5 text-[11px] text-red-400 whitespace-nowrap">{error}</p>
            )}

            {open && queryToken && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-[#141414] border border-[#2e2e2e] rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden">
                {searching && (
                  <div className="py-2 px-3 space-y-2">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#242424] animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2.5 w-12 bg-[#2a2a2a] rounded animate-pulse" />
                          <div className="h-2 w-24 bg-[#242424] rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!searching && results.length > 0 && (
                  <div className="py-1">
                    {results.map((item, i) => {
                      const already = item.symbol === primarySymbol || compareSyms.includes(item.symbol);
                      return (
                        <button
                          key={item.symbol}
                          onMouseDown={e => { e.preventDefault(); if (!already) addFromSuggestion(item.symbol); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                            already ? 'opacity-40 cursor-default' : activeIdx === i ? 'bg-indigo-600/15' : 'hover:bg-white/[0.04]'
                          }`}>
                          <div className="w-7 h-7 rounded-lg bg-[#242424] border border-[#2e2e2e] flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                            {item.symbol.slice(0, 2)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-bold font-mono">{item.symbol}</p>
                            <p className="text-gray-500 text-[11px] truncate">{item.name}</p>
                          </div>
                          {already && <span className="text-[10px] text-gray-600 shrink-0">added</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!searching && results.length === 0 && debQuery && (
                  <div className="px-3 py-5 text-center">
                    <Search size={18} className="mx-auto mb-1.5 text-gray-700" />
                    <p className="text-gray-500 text-xs">No results for "{queryToken}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {compareSyms.length > 0 && (
          <button onClick={onClear} className="ml-auto text-xs text-gray-500 hover:text-red-400 transition-colors">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
