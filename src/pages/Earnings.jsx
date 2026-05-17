import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Info, Globe, HelpCircle, X } from 'lucide-react';
import { useQuotes } from '../hooks/useYahoo';
import { fmt$ } from '../services/yahooApi';
import provider from '../services/providers';
import { ECONOMIC_EVENTS, IMPORTANCE_CONFIG, CATEGORY_ICONS } from '../services/calendarData';

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonthDays(monthOffset = 0) {
  const now   = new Date();
  const pad   = n => String(n).padStart(2, '0');
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const first = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year  = first.getFullYear();
  const month = first.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const d   = new Date(year, month, i + 1);
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return {
      iso,
      label:     d.toLocaleDateString('en-US', { weekday: 'short' }),
      num:       d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      day:       i + 1,
      isToday:   iso === todayIso,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    };
  });
}

// ── Month calendar grid (multi-select) ───────────────────────────────────────

function MonthCalendarGrid({ days, selectedDays, onToggle, onClear, eventCounts = {} }) {
  const firstDow = new Date(days[0].iso).getDay();
  const HEADERS  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const count    = selectedDays.size;

  return (
    <div className="mb-5 select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          {count === 0 ? 'No dates selected' : `${count} date${count !== 1 ? 's' : ''} selected`}
        </span>
        {count > 0 && (
          <button onClick={onClear}
            className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors px-2 py-0.5 rounded border border-indigo-500/20 hover:border-indigo-500/50">
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {HEADERS.map(h => (
          <div key={h} className="text-center text-[10px] text-gray-600 font-medium py-0.5">{h}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {[...Array(firstDow)].map((_, i) => <div key={`e${i}`} />)}
        {days.map(d => {
          const sel  = selectedDays.has(d.iso);
          const dots = eventCounts[d.iso] || 0;
          return (
            <button key={d.iso} onClick={() => onToggle(d.iso)}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-all border ${
                sel
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : d.isToday
                  ? 'bg-[#1a1a1a] border-indigo-500/60 text-indigo-300 hover:bg-indigo-600/20'
                  : d.isWeekend
                  ? 'bg-[#0f0f0f] border-[#161616] text-gray-700 hover:bg-[#1a1a1a] hover:text-gray-400'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-300 hover:bg-indigo-600/10 hover:border-indigo-500/30 hover:text-white'
              }`}>
              <span className="text-xs font-bold leading-none">{d.day}</span>
              <span className={`text-[9px] leading-none mt-0.5 ${sel ? 'text-indigo-200' : 'text-gray-600'}`}>{d.label}</span>
              {dots > 0 && (
                <span className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${sel ? 'bg-red-300' : 'bg-red-500'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}


// ── Indicator reading guide ───────────────────────────────────────────────────

const INDICATOR_GUIDE = [
  {
    category: 'Fed Policy', icon: '🏦',
    indicators: [
      {
        name: 'FOMC Rate Decision',
        what: 'Sets the federal funds rate — the benchmark for all borrowing costs in the U.S. economy.',
        bullish: 'Rate cut or dovish language → lower borrowing costs → stocks and bonds rally.',
        bearish: 'Rate hike or hawkish language → tighter credit → stocks and bonds fall.',
        tip: 'Watch the dot plot and press conference as much as the decision itself.',
      },
      {
        name: 'Fed Chair Press Conference',
        what: 'Chair explains the decision and signals the future policy path.',
        bullish: '"Dovish" tone: inflation under control, open to cuts, concerned about growth.',
        bearish: '"Hawkish" tone: inflation persistent, comfortable keeping rates higher for longer.',
        tip: 'Markets often move more on the tone of the conference than the rate decision itself.',
      },
    ],
  },
  {
    category: 'Inflation', icon: '📈',
    indicators: [
      {
        name: 'CPI (Consumer Price Index)',
        what: 'Measures average price change for a basket of consumer goods and services. Released monthly.',
        bullish: 'Actual < Forecast → inflation cooling → Fed may cut rates → stocks and bonds rally.',
        bearish: 'Actual > Forecast → inflation hot → Fed stays restrictive → stocks fall, yields rise.',
        tip: 'Core CPI (ex-food & energy) is more closely watched by the Fed than the headline number.',
      },
      {
        name: 'PCE Price Index',
        what: "Personal Consumption Expenditures — the Fed's preferred inflation gauge.",
        bullish: 'Trending toward or below 2% target → Fed confident to ease policy.',
        bearish: 'Above 2% and rising → reinforces rate-hold or hike stance.',
        tip: 'PCE typically runs lower than CPI. The Fed targets 2% PCE, not CPI.',
      },
      {
        name: 'PPI (Producer Price Index)',
        what: 'Measures price changes at the wholesale/producer level — a leading indicator for CPI.',
        bullish: 'Falling PPI → lower input costs for businesses → CPI likely to follow lower.',
        bearish: 'Rising PPI → businesses pass costs to consumers → CPI likely to increase.',
        tip: 'PPI leads CPI by roughly 1–3 months. Divergence between the two is worth noting.',
      },
    ],
  },
  {
    category: 'Employment', icon: '👥',
    indicators: [
      {
        name: 'Nonfarm Payrolls (NFP)',
        what: 'Number of jobs added outside agriculture. The single largest monthly market mover.',
        bullish: 'Strong but not overheated jobs → healthy economy without reigniting inflation concerns.',
        bearish: 'Weak jobs → economic slowdown fear. Extremely hot jobs → Fed delays cuts → rate concern.',
        tip: '"Goldilocks" readings near consensus are best for stocks. Both extremes can trigger selloffs.',
      },
      {
        name: 'Unemployment Rate',
        what: 'Percentage of the labor force actively seeking but unable to find work.',
        bullish: 'Stable or declining → healthy labor market and consumer spending confidence.',
        bearish: 'Rising rate → economic weakness, reduced spending, potential recession signal.',
        tip: 'The Fed watches for a meaningful rise from cycle lows as a sign of labor market cooling.',
      },
      {
        name: 'Initial Jobless Claims',
        what: 'Weekly count of first-time unemployment benefit filings. An early economic warning system.',
        bullish: 'Falling or low claims → employers not laying off → labor market remains solid.',
        bearish: 'Sustained rise above 300K → layoffs accelerating → recessionary signal.',
        tip: 'Weekly data is noisy — focus on the 4-week moving average for trend analysis.',
      },
    ],
  },
  {
    category: 'Growth', icon: '📊',
    indicators: [
      {
        name: 'GDP (Gross Domestic Product)',
        what: 'Total economic output. Released quarterly in 3 revisions: Advance → 2nd Estimate → 3rd Estimate.',
        bullish: 'Above expectations or accelerating growth → strong economy.',
        bearish: 'Negative for 2 consecutive quarters → technical recession.',
        tip: 'The Advance (first) estimate moves markets most. Later revisions have progressively less impact.',
      },
    ],
  },
  {
    category: 'Consumer', icon: '🛒',
    indicators: [
      {
        name: 'Retail Sales',
        what: 'Monthly measure of consumer spending — the engine of ~70% of U.S. GDP.',
        bullish: 'Strong or accelerating sales → consumers spending freely → economic momentum.',
        bearish: 'Declining sales → consumer pullback → growth slowdown risk.',
        tip: 'The "control group" (ex-autos, gas, food, building materials) is most used for GDP modeling.',
      },
      {
        name: 'Consumer Confidence / Sentiment',
        what: 'Survey-based, forward-looking measure of how optimistic consumers feel about the economy.',
        bullish: 'Rising confidence → consumers plan to spend more in coming months.',
        bearish: 'Falling confidence → spending pullback likely, often precedes economic slowdown.',
        tip: 'UoM (Univ. of Michigan) and CB (Conference Board) are the two main surveys — both are watched.',
      },
    ],
  },
  {
    category: 'Manufacturing', icon: '🏭',
    indicators: [
      {
        name: 'ISM Manufacturing PMI',
        what: 'Purchasing Managers Index — a survey of supply chain and procurement managers.',
        bullish: 'Above 50 = expansion. Breaking above 50 from below is a bullish inflection point.',
        bearish: 'Below 50 = contraction. Extended time below 45 signals meaningful industrial weakness.',
        tip: 'Key threshold is 50. Readings of 55+ are very strong; sustained below 45 signals trouble.',
      },
    ],
  },
  {
    category: 'Services', icon: '💼',
    indicators: [
      {
        name: 'ISM Services PMI',
        what: 'PMI for the services sector — more important than manufacturing as services = ~80% of U.S. GDP.',
        bullish: 'Above 50 and expanding → the bulk of the economy is growing.',
        bearish: 'Below 50 → services contracting → broad economic concern given services dominance.',
        tip: 'Services PMI has more impact on markets than manufacturing PMI due to sector size.',
      },
    ],
  },
  {
    category: 'Housing', icon: '🏠',
    indicators: [
      {
        name: 'New & Existing Home Sales',
        what: 'Measures housing market activity — very sensitive to mortgage rates and consumer confidence.',
        bullish: 'Rising sales despite high rates → strong consumer balance sheets and demand.',
        bearish: 'Sustained declining sales → rate pain or demand destruction → construction sector weakens.',
        tip: 'Housing leads the broader economy by 6–12 months. Sustained drops often precede recessions.',
      },
    ],
  },
];

// ── Sector → popular symbols mapping ─────────────────────────────────────────

const SECTOR_SYMBOLS = {
  Technology:    ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'META', 'AMD', 'INTC', 'CRM', 'ORCL', 'QCOM', 'AVGO', 'TXN', 'MU', 'AMAT', 'NOW', 'SNOW', 'PLTR'],
  Finance:       ['JPM', 'BAC', 'GS', 'MS', 'WFC', 'C', 'BLK', 'AXP', 'V', 'MA', 'COF', 'USB', 'PNC', 'SCHW', 'CB', 'TFC', 'SPGI', 'ICE'],
  Consumer:      ['AMZN', 'TSLA', 'HD', 'NKE', 'SBUX', 'MCD', 'TGT', 'WMT', 'COST', 'F', 'GM', 'BKNG', 'ABNB', 'MAR', 'YUM', 'CMG'],
  Healthcare:    ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'BMY', 'CVS', 'AMGN', 'GILD', 'MDT', 'TMO', 'DHR', 'SYK', 'ISRG', 'REGN', 'VRTX'],
  Energy:        ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'MPC', 'PSX', 'VLO', 'KMI', 'WMB', 'HAL'],
  Communication: ['T', 'VZ', 'CMCSA', 'NFLX', 'DIS', 'TMUS', 'PARA', 'WBD'],
  Industrials:   ['BA', 'CAT', 'HON', 'GE', 'UPS', 'FDX', 'DE', 'MMM', 'RTX', 'LMT', 'NOC', 'GD', 'EMR', 'ETN'],
  Materials:     ['LIN', 'APD', 'ECL', 'SHW', 'FCX', 'NEM', 'ALB', 'CF', 'MOS'],
};

const SECTOR_LIST = ['All', ...Object.keys(SECTOR_SYMBOLS)];

function Skeleton({ className = '' }) {
  return <div className={`bg-[#2a2a2a] rounded animate-pulse ${className}`} />;
}

// ── Economic Calendar Tab ─────────────────────────────────────────────────────

function EconomicCalendarTab() {
  const [monthOffset,      setMonthOffset]      = useState(0);
  const [filterImportance, setFilterImportance] = useState('All');
  const [filterCategory,   setFilterCategory]   = useState('All');
  const [showHelp,         setShowHelp]         = useState(false);

  const monthDays  = useMemo(() => getMonthDays(monthOffset), [monthOffset]);
  const todayIso   = new Date().toLocaleDateString('en-CA');
  const initDay    = monthDays.find(d => d.iso >= todayIso)?.iso || monthDays[0].iso;
  const [selectedDays, setSelectedDays] = useState(() => new Set([initDay]));

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const d = monthDays.find(d => d.iso >= today)?.iso || monthDays[0].iso;
    setSelectedDays(new Set([d]));
  }, [monthDays]);

  function toggleDay(iso) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(iso)) { if (next.size > 1) next.delete(iso); }
      else next.add(iso);
      return next;
    });
  }

  const monthLabel = new Date(monthDays[0].iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const allCategories = useMemo(() => {
    const cats = [...new Set(ECONOMIC_EVENTS.map(e => e.category))].sort();
    return ['All', ...cats];
  }, []);

  const dayEvents = useMemo(() => {
    let evts = ECONOMIC_EVENTS.filter(e => selectedDays.has(e.date));
    if (filterImportance !== 'All') evts = evts.filter(e => e.importance === filterImportance);
    if (filterCategory   !== 'All') evts = evts.filter(e => e.category   === filterCategory);
    return evts.sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));
  }, [selectedDays, filterImportance, filterCategory]);

  const dayEventCounts = useMemo(() => {
    return monthDays.reduce((acc, d) => {
      acc[d.iso] = ECONOMIC_EVENTS.filter(e => e.date === d.iso && e.importance === 'High').length;
      return acc;
    }, {});
  }, [monthDays]);

  const groupedEvents = useMemo(() => {
    const groups = {};
    dayEvents.forEach(e => {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [dayEvents]);

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonthOffset(m => m - 1)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm">{monthLabel}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHelp(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showHelp
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white'
            }`}>
            <HelpCircle size={12} />
            How to Read
          </button>
          <button onClick={() => setMonthOffset(m => m + 1)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Indicator reading guide */}
      {showHelp && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <HelpCircle size={14} className="text-indigo-400" />
              How to Read Economic Indicators
            </h3>
            <button onClick={() => setShowHelp(false)} className="text-gray-600 hover:text-gray-300 transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Forecast',  color: 'text-white',       bg: 'bg-white/5',        desc: "Analyst consensus estimate before the release. The bar the actual number is measured against." },
              { label: 'Previous',  color: 'text-gray-400',    bg: 'bg-gray-500/10',    desc: "Last reported value for this indicator. Useful context for whether conditions are improving or deteriorating." },
              { label: 'Deviation', color: 'text-indigo-400',  bg: 'bg-indigo-500/10',  desc: "How much the actual release differs from the forecast. Beat = actual better than expected; Miss = worse." },
            ].map(item => (
              <div key={item.label} className={`${item.bg} rounded-lg p-3 border border-[#2a2a2a]`}>
                <p className={`${item.color} text-xs font-semibold mb-1`}>{item.label}</p>
                <p className="text-gray-500 text-[11px] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mb-5 p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <p className="text-gray-600 text-[10px] uppercase tracking-wider w-full mb-1">Importance Levels</p>
            {[
              { imp: 'High',   dot: 'bg-red-500',    cls: 'text-red-400',    desc: 'Major market mover — expect significant volatility. Trade carefully around these.' },
              { imp: 'Medium', dot: 'bg-yellow-500', cls: 'text-yellow-400', desc: 'Notable release — can move markets but usually less dramatically than High events.' },
              { imp: 'Low',    dot: 'bg-gray-500',   cls: 'text-gray-400',   desc: 'Informational — minor or no market impact under normal conditions.' },
            ].map(item => (
              <div key={item.imp} className="flex items-start gap-2 flex-1 min-w-[180px]">
                <span className={`w-2 h-2 rounded-full ${item.dot} mt-1 shrink-0`} />
                <div>
                  <p className={`${item.cls} text-xs font-semibold`}>{item.imp}</p>
                  <p className="text-gray-600 text-[11px] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            {INDICATOR_GUIDE.map(section => (
              <div key={section.category}>
                <h4 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>{section.icon}</span> {section.category}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {section.indicators.map(ind => (
                    <div key={ind.name} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3">
                      <p className="text-white text-xs font-semibold mb-1.5">{ind.name}</p>
                      <p className="text-gray-500 text-[11px] leading-relaxed mb-2">{ind.what}</p>
                      <div className="space-y-1">
                        <p className="text-[11px] leading-relaxed">
                          <span className="text-green-500 font-medium">▲ Bullish: </span>
                          <span className="text-gray-400">{ind.bullish}</span>
                        </p>
                        <p className="text-[11px] leading-relaxed">
                          <span className="text-red-500 font-medium">▼ Bearish: </span>
                          <span className="text-gray-400">{ind.bearish}</span>
                        </p>
                        <p className="text-[11px] leading-relaxed mt-1.5 pt-1.5 border-t border-[#2a2a2a]">
                          <span className="text-yellow-500 font-medium">💡 Tip: </span>
                          <span className="text-gray-500">{ind.tip}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">Importance</p>
          <div className="flex gap-1.5">
            {['All', 'High', 'Medium', 'Low'].map(imp => (
              <button key={imp} onClick={() => setFilterImportance(imp)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  filterImportance === imp
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : imp === 'High'   ? 'bg-[#111] border-[#2a2a2a] text-red-400 hover:border-red-500/40'
                    : imp === 'Medium' ? 'bg-[#111] border-[#2a2a2a] text-yellow-400 hover:border-yellow-500/40'
                    : imp === 'Low'    ? 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:border-gray-500'
                    : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>
                {imp !== 'All' && <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${imp === 'High' ? 'bg-red-500' : imp === 'Medium' ? 'bg-yellow-500' : 'bg-gray-500'}`} />}
                {imp}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-gray-600 mb-1.5 uppercase tracking-wider">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  filterCategory === cat
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>
                {cat !== 'All' && <span className="mr-1">{CATEGORY_ICONS[cat] || '📌'}</span>}
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MonthCalendarGrid
        days={monthDays}
        selectedDays={selectedDays}
        onToggle={toggleDay}
        onClear={() => {
          const today = new Date().toLocaleDateString('en-CA');
          const d = monthDays.find(x => x.iso >= today)?.iso || monthDays[0].iso;
          setSelectedDays(new Set([d]));
        }}
        eventCounts={dayEventCounts}
      />

      {/* Events grouped by date */}
      {dayEvents.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Globe size={32} className="mx-auto mb-3 opacity-30" />
          <p>No economic events for the selected {selectedDays.size > 1 ? 'dates' : 'date'}</p>
          <p className="text-xs mt-1 text-gray-600">Try selecting other dates or adjusting filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedEvents.map(([date, events]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold text-white">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <div className="flex-1 h-px bg-[#2a2a2a]" />
                <span className="text-[10px] text-gray-600">{events.length} event{events.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2.5">
                {events.map((evt, i) => {
                  const imp = IMPORTANCE_CONFIG[evt.importance];
                  return (
                    <div key={i}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4 hover:border-[#3a3a3a] transition-colors">
                      <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                        <span className={`w-2 h-2 rounded-full ${imp.dot}`} />
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${imp.badge}`}>
                          {imp.label}
                        </span>
                      </div>
                      <span className="text-xl shrink-0 w-7 text-center">
                        {CATEGORY_ICONS[evt.category] || '📌'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{evt.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-gray-500 text-xs">{evt.time}</span>
                          <span className="text-gray-700 text-xs">·</span>
                          <span className="text-indigo-400 text-xs">{evt.category}</span>
                        </div>
                      </div>
                      <div className="flex gap-5 shrink-0 text-right">
                        {evt.forecast != null && (
                          <div>
                            <p className="text-[10px] text-gray-600 mb-0.5">Forecast</p>
                            <p className="text-white text-sm font-mono font-semibold">{evt.forecast}</p>
                          </div>
                        )}
                        {evt.previous != null && (
                          <div>
                            <p className="text-[10px] text-gray-600 mb-0.5">Previous</p>
                            <p className="text-gray-400 text-sm font-mono">{evt.previous}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[#1a1a1a]">
        <p className="text-gray-700 text-[10px] uppercase tracking-wider">Importance:</p>
        {[['High', 'bg-red-500'], ['Medium', 'bg-yellow-500'], ['Low', 'bg-gray-500']].map(([label, cls]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={`w-2 h-2 rounded-full ${cls}`} /> {label}
          </span>
        ))}
        <p className="text-gray-600 text-[10px] ml-auto">Red dot = High impact event on that day</p>
      </div>
    </div>
  );
}

// ── Earnings Calendar Tab ─────────────────────────────────────────────────────

function CalendarTab() {
  const [monthOffset, setMonthOffset] = useState(0);
  const monthDays = useMemo(() => getMonthDays(monthOffset), [monthOffset]);

  const todayIso = new Date().toLocaleDateString('en-CA');
  const initDay  = monthDays.find(d => d.iso >= todayIso)?.iso || monthDays[0].iso;
  const [selectedDays,    setSelectedDays]    = useState(() => new Set([initDay]));
  const [earningsByDate,  setEarningsByDate]  = useState({});
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [showFilters,  setShowFilters]  = useState(false);
  const [filterTime,   setFilterTime]   = useState('All');
  const [filterEps,    setFilterEps]    = useState('All');
  const [filterSector, setFilterSector] = useState('All');
  const [searchSym,    setSearchSym]    = useState('');
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    const d = monthDays.find(d => d.iso >= today)?.iso || monthDays[0].iso;
    setSelectedDays(new Set([d]));
    setEarningsByDate({});
  }, [monthDays]);

  function toggleDay(iso) {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(iso)) { if (next.size > 1) next.delete(iso); }
      else next.add(iso);
      return next;
    });
  }

  useEffect(() => {
    if (selectedDays.size === 0) return;
    const id = ++fetchIdRef.current;
    setLoadingEarnings(true);
    Promise.all([...selectedDays].sort().map(date =>
      provider.earningsCalendar(date)
        .then(data => ({ date, data }))
        .catch(() => ({ date, data: [] }))
    )).then(results => {
      if (id !== fetchIdRef.current) return;
      const map = {};
      results.forEach(({ date, data }) => { map[date] = data; });
      setEarningsByDate(map);
      setLoadingEarnings(false);
    });
  }, [selectedDays]);

  const rawStocks = useMemo(() =>
    [...selectedDays].sort().flatMap(date =>
      (earningsByDate[date] || []).map(s => ({ ...s, _date: date }))
    ),
  [selectedDays, earningsByDate]);

  const allSymbols = useMemo(() => rawStocks.map(s => s.symbol), [rawStocks]);
  const { data: quoteList = [] } = useQuotes(allSymbols, { ttl: 60_000 });
  const quoteMap = useMemo(
    () => Object.fromEntries(quoteList.map(q => [q.symbol, q])),
    [quoteList],
  );

  const stocks = useMemo(() => {
    let r = rawStocks;
    if (filterTime !== 'All')     r = r.filter(s => s.time === filterTime);
    if (filterEps === 'Positive') r = r.filter(s => s.epsForecast != null && s.epsForecast > 0);
    if (filterEps === 'Negative') r = r.filter(s => s.epsForecast != null && s.epsForecast < 0);
    if (filterEps === 'Surprise') r = r.filter(s => s.lastYearEPS != null && s.epsForecast != null && s.epsForecast > s.lastYearEPS);
    if (filterSector !== 'All') {
      const sectorSyms = SECTOR_SYMBOLS[filterSector] || [];
      r = r.filter(s => sectorSyms.includes(s.symbol));
    }
    if (searchSym.trim()) r = r.filter(s =>
      s.symbol.toUpperCase().includes(searchSym.toUpperCase()) ||
      s.name.toLowerCase().includes(searchSym.toLowerCase())
    );
    return r;
  }, [rawStocks, filterTime, filterEps, filterSector, searchSym]);

  const monthLabel = new Date(monthDays[0].iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const activeFilterCount = [
    filterTime !== 'All',
    filterEps !== 'All',
    filterSector !== 'All',
    !!searchSym.trim(),
  ].filter(Boolean).length;

  const grouped = useMemo(() => {
    const byDate = {};
    stocks.forEach(s => {
      if (!byDate[s._date]) byDate[s._date] = { BMO: [], AMC: [], '?': [] };
      byDate[s._date][s.time].push(s);
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  }, [stocks]);

  function StockCard({ stock }) {
    const q        = quoteMap[stock.symbol];
    const lo       = q?.week52Low  || 0;
    const hi       = q?.week52High || 0;
    const px       = q?.price      || 0;
    const rangePct = (hi > lo && px >= lo) ? Math.min(100, ((px - lo) / (hi - lo)) * 100) : null;
    const up       = q ? q.pct >= 0 : null;
    return (
      <Link to={`/stock/${stock.symbol}`}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <span className="text-indigo-400 font-bold text-[10px]">{stock.symbol.slice(0, 3)}</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{stock.symbol}</p>
              <p className="text-gray-500 text-[10px] truncate max-w-[110px]">{stock.name}</p>
            </div>
          </div>
          <div className="text-right">
            {q && px > 0 ? (
              <>
                <p className="text-white text-xs font-mono font-semibold">{fmt$(px)}</p>
                <p className={`text-[10px] font-mono ${up ? 'text-green-400' : 'text-red-400'}`}>
                  {up ? '+' : ''}{q.pct.toFixed(2)}%
                </p>
              </>
            ) : (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${stock.time === 'BMO' ? 'bg-yellow-500/10 text-yellow-400' : stock.time === 'AMC' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {stock.time}
              </span>
            )}
          </div>
        </div>
        {rangePct !== null ? (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-gray-600">52W Low {fmt$(lo)}</span>
              <span className="text-[9px] text-gray-500 font-medium">{rangePct.toFixed(0)}% of range</span>
              <span className="text-[9px] text-gray-600">High {fmt$(hi)}</span>
            </div>
            <div className="relative h-1.5 bg-[#2a2a2a] rounded-full overflow-visible">
              <div className="h-full bg-indigo-600/50 rounded-full" style={{ width: `${rangePct}%` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400 border border-[#1a1a1a] shadow"
                style={{ left: `calc(${rangePct}% - 4px)` }} />
            </div>
          </div>
        ) : (
          <div className="mb-2.5 h-1.5 bg-[#2a2a2a] rounded-full animate-pulse" />
        )}
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-600">EPS Est: </span>
            <span className="text-white font-mono">
              {stock.epsForecast != null ? `$${stock.epsForecast.toFixed(2)}` : '—'}
            </span>
            {stock.lastYearEPS != null && (
              <span className="text-gray-600 ml-1">vs ${stock.lastYearEPS.toFixed(2)} LY</span>
            )}
          </div>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${stock.time === 'BMO' ? 'bg-yellow-500/10 text-yellow-400' : stock.time === 'AMC' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
            {stock.time}
          </span>
        </div>
        {stock.fiscalQuarterEnding && (
          <p className="text-gray-600 text-[10px] mt-1">{stock.fiscalQuarterEnding}</p>
        )}
      </Link>
    );
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMonthOffset(m => m - 1)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm">{monthLabel}</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white'
            }`}>
            <Info size={12} />
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>
          <button onClick={() => setMonthOffset(m => m + 1)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Sector chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {SECTOR_LIST.map(sector => (
          <button key={sector} onClick={() => setFilterSector(sector)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
              filterSector === sector
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/30'
            }`}>
            {sector}
          </button>
        ))}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Report Time</label>
            <div className="flex gap-1.5">
              {['All', 'BMO', 'AMC'].map(t => (
                <button key={t} onClick={() => setFilterTime(t)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    filterTime === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white'
                  }`}>
                  {t === 'All' ? 'All' : t === 'BMO' ? '🌅 BMO' : '🌙 AMC'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">EPS Forecast</label>
            <div className="flex gap-1.5 flex-wrap">
              {['All', 'Positive', 'Negative', 'Surprise'].map(e => (
                <button key={e} onClick={() => setFilterEps(e)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    filterEps === e ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Search Symbol</label>
            <input value={searchSym} onChange={e => setSearchSym(e.target.value.toUpperCase())}
              placeholder="AAPL…"
              className="bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-1.5 w-28 focus:outline-none focus:border-indigo-500 placeholder-gray-600 uppercase" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => { setFilterTime('All'); setFilterEps('All'); setFilterSector('All'); setSearchSym(''); }}
              className="px-3 py-1.5 text-xs text-gray-400 border border-[#2a2a2a] rounded-lg hover:text-white hover:border-gray-500 transition-colors">
              Clear
            </button>
          )}
          <span className="text-gray-600 text-xs self-end ml-auto">
            {stocks.length} of {rawStocks.length} shown
          </span>
        </div>
      )}

      <MonthCalendarGrid
        days={monthDays}
        selectedDays={selectedDays}
        onToggle={toggleDay}
        onClear={() => {
          const today = new Date().toLocaleDateString('en-CA');
          const d = monthDays.find(x => x.iso >= today)?.iso || monthDays[0].iso;
          setSelectedDays(new Set([d]));
        }}
      />

      {/* Results grouped by date → report time */}
      {loadingEarnings ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Clock size={32} className="mx-auto mb-3 opacity-30" />
          <p>No earnings scheduled{filterSector !== 'All' ? ` for ${filterSector}` : ''} on the selected date{selectedDays.size > 1 ? 's' : ''}</p>
          {filterSector !== 'All' && (
            <button onClick={() => setFilterSector('All')} className="mt-2 text-indigo-400 text-xs hover:underline">
              Show all sectors
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([date, byTime]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-bold text-white">
                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <div className="flex-1 h-px bg-[#2a2a2a]" />
                <span className="text-[10px] text-gray-600">
                  {Object.values(byTime).flat().length} reporting
                </span>
              </div>
              <div className="space-y-6">
                {[
                  { key: 'BMO', label: 'Before Market Open (BMO)', icon: '🌅' },
                  { key: 'AMC', label: 'After Market Close (AMC)', icon: '🌙' },
                  { key: '?',   label: 'Time TBD',                 icon: '❓' },
                ].filter(g => byTime[g.key].length > 0).map(group => (
                  <div key={group.key}>
                    <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span>{group.icon}</span> {group.label}
                      <span className="text-gray-600 font-normal normal-case tracking-normal">({byTime[group.key].length})</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {byTime[group.key].map(stock => <StockCard key={stock.symbol} stock={stock} />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function EarningsPage() {
  const [tab, setTab] = useState('economic');

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold mb-1">Calendar</h1>
        <p className="text-gray-500 text-sm">Economic events and earnings calendar</p>
      </div>

      <div className="flex gap-1 border-b border-[#2a2a2a] mb-6">
        {[
          { id: 'economic',   label: 'Economic Calendar', icon: Globe },
          { id: 'calendar',   label: 'Earnings Calendar', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'economic'   && <EconomicCalendarTab />}
      {tab === 'calendar'   && <CalendarTab />}
    </div>
  );
}
