import { useNavigate } from 'react-router-dom';
import { X, Plus } from 'lucide-react';
import { useTabs } from '../context/TabsContext';

export default function SymbolTabBar({ activeSymbol }) {
  const { tabs, removeTab } = useTabs();
  const navigate = useNavigate();

  if (tabs.length === 0) return null;

  const active = activeSymbol?.toUpperCase();

  function close(sym, e) {
    e.stopPropagation();
    removeTab(sym);
    if (sym === active) {
      const idx  = tabs.indexOf(sym);
      const next = tabs[idx - 1] ?? tabs[idx + 1];
      if (next) navigate(`/stock/${next}`);
      else      navigate('/markets');
    }
  }

  return (
    <div className="flex items-end gap-0 overflow-x-auto border-b border-[#2a2a2a] bg-[#0d0d0d] px-3 pt-1 shrink-0">
      {tabs.map(sym => {
        const isActive = sym === active;
        return (
          <button
            key={sym}
            onClick={() => { if (!isActive) navigate(`/stock/${sym}`); }}
            className={`group flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-all select-none ${
              isActive
                ? 'border-indigo-500 text-white bg-[#0a0a0a]'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#111]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-indigo-400' : 'bg-gray-700 group-hover:bg-gray-500'}`} />
            {sym}
            <span
              onClick={e => close(sym, e)}
              className={`ml-0.5 rounded p-0.5 transition-colors ${isActive ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-700 hover:text-gray-300 opacity-0 group-hover:opacity-100'}`}
            >
              <X size={10} />
            </span>
          </button>
        );
      })}

      {/* new tab hint */}
      <button
        onClick={() => document.querySelector('input[placeholder*="Search"]')?.focus()}
        className="flex items-center gap-1 px-2.5 py-2 text-[10px] text-gray-700 hover:text-gray-400 transition-colors whitespace-nowrap"
        title="Search to open a new tab"
      >
        <Plus size={11} />
      </button>
    </div>
  );
}
