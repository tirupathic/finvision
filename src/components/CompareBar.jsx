import { Plus, X } from 'lucide-react';
import { CMP_COLORS } from '../hooks/useCompareCharts';

export default function CompareBar({ compareSyms, cmpInput, onInputChange, onAdd, onRemove, onClear, primarySymbol }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-gray-400 text-xs font-medium shrink-0">
          Compare <span className="text-gray-600">({compareSyms.length}/10)</span>
        </span>

        {compareSyms.map((sym, i) => (
          <span key={sym}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: `${CMP_COLORS[i]}20`, color: CMP_COLORS[i], border: `1px solid ${CMP_COLORS[i]}40` }}>
            {sym}
            <button onClick={() => onRemove(sym)} className="hover:opacity-60 transition-opacity leading-none">
              <X size={10} />
            </button>
          </span>
        ))}

        {compareSyms.length < 10 && (
          <form onSubmit={e => { e.preventDefault(); onAdd(); }} className="flex items-center gap-1.5">
            <input
              value={cmpInput}
              onChange={e => onInputChange(e.target.value.toUpperCase())}
              placeholder="AAPL, MSFT, NVDA…"
              maxLength={60}
              className="w-44 bg-[#111] border border-[#3a3a3a] rounded-md px-2 py-1 text-xs text-white placeholder-gray-600 font-mono uppercase focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button type="submit"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors">
              <Plus size={11} /> Add
            </button>
          </form>
        )}

        {compareSyms.length > 0 && (
          <button onClick={onClear} className="ml-auto text-[10px] text-gray-600 hover:text-red-400 transition-colors">
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
