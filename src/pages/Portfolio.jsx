import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';
import { Plus, DollarSign, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import { STOCKS, generatePriceHistory } from '../services/stockData';
import { formatMarketCap } from '../services/yahooApi';

const DEFAULT_HOLDINGS = [
  { symbol: 'AAPL', shares: 50,  avgCost: 172.50 },
  { symbol: 'NVDA', shares: 15,  avgCost: 520.00 },
  { symbol: 'MSFT', shares: 20,  avgCost: 385.00 },
  { symbol: 'AMZN', shares: 30,  avgCost: 160.00 },
  { symbol: 'META', shares: 12,  avgCost: 450.00 },
];

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316'];

export default function Portfolio() {
  const [holdings, setHoldings] = useState(DEFAULT_HOLDINGS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ symbol: '', shares: '', avgCost: '' });

  const enriched = holdings.map(h => {
    const stock = STOCKS[h.symbol];
    if (!stock) return null;
    const currentValue = stock.price * h.shares;
    const costBasis    = h.avgCost * h.shares;
    const gainLoss     = currentValue - costBasis;
    const gainLossPct  = ((stock.price - h.avgCost) / h.avgCost) * 100;
    return { ...h, stock, currentValue, costBasis, gainLoss, gainLossPct };
  }).filter(Boolean);

  const totalValue    = enriched.reduce((s, h) => s + h.currentValue, 0);
  const totalCost     = enriched.reduce((s, h) => s + h.costBasis, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalPct      = ((totalValue - totalCost) / totalCost) * 100;

  const pieData = enriched.map(h => ({
    name: h.symbol,
    value: +((h.currentValue / totalValue) * 100).toFixed(1),
  }));

  const portfolioHistory = generatePriceHistory(totalValue * 0.88, 90, 0.010);

  function addHolding() {
    const { symbol, shares, avgCost } = form;
    if (symbol && shares && avgCost && STOCKS[symbol.toUpperCase()]) {
      setHoldings(prev => [...prev, { symbol: symbol.toUpperCase(), shares: +shares, avgCost: +avgCost }]);
      setForm({ symbol: '', shares: '', avgCost: '' });
      setShowAdd(false);
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">My Portfolio</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium">
          <Plus size={15} /> Add Position
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-[#1a1a1a] border border-indigo-500/30 rounded-xl p-5 mb-6">
          <h3 className="text-white font-medium mb-4">Add New Position</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['symbol','Symbol (e.g. AAPL)','text'],['shares','# of Shares','number'],['avgCost','Avg Cost ($)','number']].map(([field, placeholder, type]) => (
              <input key={field} type={type} placeholder={placeholder}
                value={form[field]}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                className="bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors placeholder-gray-600" />
            ))}
            <button onClick={addHolding}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg px-4 py-2 transition-colors font-medium">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Value',   value: `$${totalValue.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}`, icon: Briefcase, color: 'text-indigo-400' },
          { label: 'Total Cost',    value: `$${totalCost.toLocaleString('en-US', {minimumFractionDigits:2,maximumFractionDigits:2})}`,  icon: DollarSign, color: 'text-gray-400' },
          { label: 'Total Gain/Loss', value: `${totalGainLoss >= 0 ? '+' : ''}$${totalGainLoss.toFixed(2)}`, icon: totalGainLoss >= 0 ? TrendingUp : TrendingDown, color: totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400' },
          { label: 'Return %', value: `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`, icon: totalPct >= 0 ? TrendingUp : TrendingDown, color: totalPct >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(c => (
          <div key={c.label} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={14} className={c.color} />
              <span className="text-gray-500 text-xs">{c.label}</span>
            </div>
            <p className={`text-lg font-bold font-mono ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Portfolio Performance (90-Day)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={portfolioHistory}>
              <defs>
                <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                formatter={v => [`$${v.toFixed(2)}`, 'Value']}
              />
              <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2}
                fill="url(#portGrad)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Allocation</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                dataKey="value" paddingAngle={3} isAnimationActive={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [`${v}%`, n]}
                contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-300 text-xs">{d.name}</span>
                </div>
                <span className="text-gray-400 text-xs font-mono">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings table */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-x-auto">
        <div className="px-5 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-white font-semibold">Holdings</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs border-b border-[#2a2a2a]">
              {['Symbol','Shares','Avg Cost','Current Price','Mkt Value','Gain/Loss','% Return','Weight'].map(h => (
                <th key={h} className="text-left py-3 px-4 first:pl-5 last:pr-5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enriched.map(h => {
              const up = h.gainLoss >= 0;
              return (
                <tr key={h.symbol} className="border-b border-[#2a2a2a] last:border-0 hover:bg-white/5">
                  <td className="py-3 px-4 pl-5">
                    <Link to={`/stock/${h.symbol}`} className="text-white font-bold hover:text-indigo-400 transition-colors">
                      {h.symbol}
                    </Link>
                    <p className="text-gray-500 text-xs">{h.stock.name.split(' ').slice(0,2).join(' ')}</p>
                  </td>
                  <td className="py-3 px-4 text-gray-300 font-mono">{h.shares}</td>
                  <td className="py-3 px-4 text-gray-300 font-mono">${h.avgCost.toFixed(2)}</td>
                  <td className="py-3 px-4 text-white font-mono font-semibold">${h.stock.price.toFixed(2)}</td>
                  <td className="py-3 px-4 text-white font-mono">${h.currentValue.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                  <td className={`py-3 px-4 font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
                    {up ? '+' : ''}${h.gainLoss.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono ${up ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {up ? '+' : ''}{h.gainLossPct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 pr-5 text-gray-400 text-xs font-mono">
                    {((h.currentValue / totalValue) * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
