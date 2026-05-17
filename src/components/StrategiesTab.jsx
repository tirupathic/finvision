import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Zap, Target, ShieldAlert,
  Activity, Layers, MessageCircle, ExternalLink, RefreshCw,
  BarChart2, Cpu, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useChart, useNews } from '../hooks/useYahoo';

// ─── Strategy definitions ─────────────────────────────────────────────────────

const DAY_STRATEGIES = [
  { id: 'ma',       label: 'MA Cross',    subtitle: '50/200 SMA',         icon: TrendingUp, risk: 'Medium', minDays: 200,
    desc: 'Golden cross (50 > 200) = BUY; death cross = SELL.' },
  { id: 'rsi',      label: 'RSI Rev.',    subtitle: 'RSI < 35 / > 65',    icon: RefreshCw,  risk: 'Medium', minDays: 16,
    desc: 'Oversold (RSI<35) = BUY; overbought (RSI>65) = SELL.' },
  { id: 'momentum', label: 'Momentum',   subtitle: '20D % change',        icon: Zap,        risk: 'High',   minDays: 21,
    desc: '>5% gain = BUY; >5% loss = SELL. Rides price trends.' },
  { id: 'mean',     label: 'Mean Rev.',  subtitle: '30D Z-score',         icon: Minus,      risk: 'Low',    minDays: 30,
    desc: 'Z < -1.5 = BUY; Z > 1.5 = SELL. Fades extremes.' },
  { id: 'macd',     label: 'MACD',       subtitle: '12/26/9 histogram',   icon: BarChart2,  risk: 'Medium', minDays: 35,
    desc: 'Histogram turns positive = BUY; negative = SELL.' },
  { id: 'ema',      label: 'EMA Cross',  subtitle: 'EMA9/20 + EMA50',     icon: Activity,   risk: 'Low',    minDays: 50,
    desc: 'EMA9 > EMA20 and price > EMA50 = BUY.' },
];

const OPTION_STRATEGIES = [
  { id: 'long_call',   name: 'Long Call',       direction: 'bullish', ivPref: 'low',  risk: 'Limited (premium)',
    desc: 'Buy ATM call. Full upside with defined risk.' },
  { id: 'bull_spread', name: 'Bull Call Spread', direction: 'bullish', ivPref: 'any', risk: 'Limited (debit)',
    desc: 'Buy ATM call, sell 5% OTM call. Cheaper bullish bet.' },
  { id: 'long_put',    name: 'Long Put',         direction: 'bearish', ivPref: 'low',  risk: 'Limited (premium)',
    desc: 'Buy ATM put. Profit from downside or hedge a long.' },
  { id: 'bear_spread', name: 'Bear Put Spread',  direction: 'bearish', ivPref: 'any', risk: 'Limited (debit)',
    desc: 'Buy ATM put, sell 5% OTM put. Cheaper bearish bet.' },
  { id: 'straddle',    name: 'Long Straddle',    direction: 'neutral', ivPref: 'low',  risk: 'Limited (2× prem)',
    desc: 'Buy ATM call + put. Profits from any large move.' },
  { id: 'iron_condor', name: 'Iron Condor',      direction: 'neutral', ivPref: 'high', risk: 'Limited (wings)',
    desc: 'Sell ±5% strangles, buy ±10% wings. Earns in quiet markets.' },
];

const EXPIRY_OPTIONS = [
  { id: 'weekly',    label: 'Weekly',    dte: '5–7 DTE'   },
  { id: 'biweekly',  label: '2 Weeks',   dte: '14 DTE'    },
  { id: 'monthly',   label: 'Monthly',   dte: '21–30 DTE' },
  { id: 'quarterly', label: 'Quarterly', dte: '60–90 DTE' },
  { id: 'leaps',     label: 'LEAPS',     dte: '180+ DTE'  },
];

const EXPIRY_SETUP = {
  weekly:    { long_call: 'Needs sharp move immediately — theta burns fastest.', bull_spread: 'Sell at 5–7 DTE; rapid decay favors seller.', long_put: 'Needs sharp drop fast — theta is the enemy.', bear_spread: 'Sell at 5–7 DTE; IV crush accelerates profit.', straddle: 'Enter 1 day before catalyst. Needs move > premium paid.', iron_condor: 'Ideal — rapid theta decay; wide profit zone.' },
  biweekly:  { long_call: 'Buy ATM at 14 DTE. Needs move within 2 weeks.', bull_spread: '14 DTE; theta accelerates, favoring sellers.', long_put: 'Buy ATM at 14 DTE. Needs catalyst within 2 weeks.', bear_spread: '14 DTE; good balance of premium and time.', straddle: 'Enter 1–2 days before catalyst; exit quickly after.', iron_condor: 'Sell ±5% at 14 DTE; theta accelerates toward expiry.' },
  monthly:   { long_call: 'Buy ATM 21–30 DTE. Balanced theta vs time.', bull_spread: 'Buy ATM / sell 5% OTM call. Standard 21–30 DTE setup.', long_put: 'Buy ATM 21–30 DTE. Balanced theta vs time.', bear_spread: 'Buy ATM / sell 5% OTM put. Standard 21–30 DTE setup.', straddle: 'Enter 3–5 days before catalyst; exit 1–2 days after.', iron_condor: 'Sell ±5%, buy ±10% wings. Target 21–30 DTE entry.' },
  quarterly: { long_call: 'Buy ATM 60–90 DTE. Ample time for thesis.', bull_spread: 'Wider spread at 60–90 DTE; lower theta on debit.', long_put: 'Buy ATM 60–90 DTE. Time on your side.', bear_spread: 'Wider spread; ride move without excessive drag.', straddle: 'Lower daily theta; buy 60 DTE and adjust if needed.', iron_condor: 'Use wider strikes to give the stock room to move.' },
  leaps:     { long_call: 'Buy deep ITM or ATM 180–365 DTE. Acts as leveraged stock.', bull_spread: 'Wide vertical 180+ DTE; minimal theta.', long_put: 'Buy deep ITM or ATM 180–365 DTE. Long-term hedge.', bear_spread: 'Wide vertical 180+ DTE for sustained downtrend.', straddle: 'Expensive upfront; virtually no theta risk.', iron_condor: 'Less effective at LEAPS; needs strong range-bound conviction.' },
};

// ─── Signal computation ───────────────────────────────────────────────────────

function computeSignal(id, closes) {
  const n = closes.length;
  if (n < 2) return { signal: 'HOLD', strength: 0, label: '' };
  const last = closes[n - 1];

  if (id === 'ma') {
    if (n < 200) return { signal: 'HOLD', strength: 0, label: 'Need 200 days' };
    const ma50 = closes.slice(-50).reduce((s, v) => s + v, 0) / 50;
    const ma200 = closes.slice(-200).reduce((s, v) => s + v, 0) / 200;
    const diff = (ma50 - ma200) / ma200 * 100;
    return { signal: ma50 > ma200 ? 'BUY' : ma50 < ma200 * 0.98 ? 'SELL' : 'HOLD', strength: Math.min(Math.abs(diff) * 10, 100), label: `MA50/200: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%` };
  }
  if (id === 'rsi') {
    if (n < 16) return { signal: 'HOLD', strength: 0, label: 'Need 16 days' };
    const changes = closes.slice(1).map((p, i) => p - closes[i]);
    const r14 = changes.slice(-14);
    const gains = r14.filter(c => c > 0).reduce((s, c) => s + c, 0) / 14;
    const losses = r14.filter(c => c < 0).reduce((s, c) => s - c, 0) / 14;
    const rsi = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
    return { signal: rsi < 35 ? 'BUY' : rsi > 65 ? 'SELL' : 'HOLD', strength: rsi < 35 ? Math.min((35 - rsi) / 35 * 100, 100) : rsi > 65 ? Math.min((rsi - 65) / 35 * 100, 100) : 50, label: `RSI(14): ${rsi.toFixed(1)}` };
  }
  if (id === 'momentum') {
    if (n < 22) return { signal: 'HOLD', strength: 0, label: 'Need 21 days' };
    const mom = (last - closes[n - 21]) / closes[n - 21] * 100;
    return { signal: mom > 5 ? 'BUY' : mom < -5 ? 'SELL' : 'HOLD', strength: Math.min(Math.abs(mom) * 5, 100), label: `20D mom: ${mom >= 0 ? '+' : ''}${mom.toFixed(2)}%` };
  }
  if (id === 'mean') {
    if (n < 30) return { signal: 'HOLD', strength: 0, label: 'Need 30 days' };
    const sl = closes.slice(-30);
    const mean = sl.reduce((s, v) => s + v, 0) / 30;
    const sd = Math.sqrt(sl.reduce((s, v) => s + (v - mean) ** 2, 0) / 29);
    const z = sd === 0 ? 0 : (last - mean) / sd;
    return { signal: z < -1.5 ? 'BUY' : z > 1.5 ? 'SELL' : 'HOLD', strength: Math.min(Math.abs(z) * 33.3, 100), label: `Z-score(30): ${z.toFixed(2)}` };
  }
  if (id === 'macd') {
    if (n < 35) return { signal: 'HOLD', strength: 0, label: 'Need 35 days' };
    const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
    let e12 = closes[0], e26 = closes[0];
    const macdArr = [];
    for (let i = 1; i < n; i++) { e12 = closes[i] * k12 + e12 * (1 - k12); e26 = closes[i] * k26 + e26 * (1 - k26); macdArr.push(e12 - e26); }
    let sig = macdArr[0];
    const hist = [];
    for (const m of macdArr) { sig = m * k9 + sig * (1 - k9); hist.push(m - sig); }
    const lh = hist[hist.length - 1], ph = hist[hist.length - 2] ?? 0;
    return { signal: lh > 0 && ph <= 0 ? 'BUY' : lh < 0 && ph >= 0 ? 'SELL' : 'HOLD', strength: Math.min(Math.abs(lh) * 1000, 100), label: `MACD hist: ${lh >= 0 ? '+' : ''}${lh.toFixed(4)}` };
  }
  if (id === 'ema') {
    if (n < 50) return { signal: 'HOLD', strength: 0, label: 'Need 50 days' };
    const k9 = 2 / 10, k20 = 2 / 21, k50 = 2 / 51;
    let e9 = closes[0], e20 = closes[0], e50 = closes[0];
    for (let i = 1; i < n; i++) { e9 = closes[i] * k9 + e9 * (1 - k9); e20 = closes[i] * k20 + e20 * (1 - k20); e50 = closes[i] * k50 + e50 * (1 - k50); }
    const spread = (e9 - e20) / e20 * 100;
    return { signal: e9 > e20 && last > e50 ? 'BUY' : e9 < e20 && last < e50 ? 'SELL' : 'HOLD', strength: Math.min(Math.abs(spread) * 500, 100), label: `EMA9/20 spread: ${spread >= 0 ? '+' : ''}${spread.toFixed(3)}%` };
  }
  return { signal: 'HOLD', strength: 0, label: '' };
}

function computeATR(ohlcv, n = 14) {
  if (ohlcv.length < n + 1) return 0;
  let sum = 0;
  for (let i = ohlcv.length - n; i < ohlcv.length; i++) {
    const prev = ohlcv[i - 1]?.close ?? ohlcv[i].close;
    const h = ohlcv[i].high ?? ohlcv[i].close, l = ohlcv[i].low ?? ohlcv[i].close;
    sum += Math.max(h - l, Math.abs(h - prev), Math.abs(l - prev));
  }
  return sum / n;
}

function computeHV(ohlcv, n = 60) {
  const sl = ohlcv.slice(-Math.min(n + 1, ohlcv.length));
  if (sl.length < 5) return 0.3;
  const rets = sl.slice(1).map((pt, i) => Math.log(pt.close / sl[i].close));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  return Math.sqrt(rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1) * 252);
}

function suggestOptStrategies(trend, hvLevel, expiry) {
  if (expiry === 'weekly' || expiry === 'biweekly') {
    if (hvLevel === 'high') return trend === 'bullish' ? ['bull_spread', 'iron_condor'] : trend === 'bearish' ? ['bear_spread', 'iron_condor'] : ['iron_condor', 'bull_spread'];
    return trend === 'bullish' ? ['bull_spread', 'straddle'] : trend === 'bearish' ? ['bear_spread', 'straddle'] : ['straddle', 'iron_condor'];
  }
  if (expiry === 'quarterly' || expiry === 'leaps') {
    return trend === 'bullish' ? ['long_call', 'bull_spread'] : trend === 'bearish' ? ['long_put', 'bear_spread'] : ['straddle', 'iron_condor'];
  }
  return trend === 'bullish' ? (hvLevel === 'low' ? ['long_call', 'bull_spread'] : ['bull_spread', 'long_call']) : trend === 'bearish' ? (hvLevel === 'low' ? ['long_put', 'bear_spread'] : ['bear_spread', 'long_put']) : (hvLevel === 'high' ? ['iron_condor', 'straddle'] : ['straddle', 'iron_condor']);
}

const BULLISH_RE = /\b(beat|beats|surges?|upgrades?|growth|strong|rally|profits?|gains?|exceeds?|outperforms?|bullish|breakout|launches?|positive|upside|soars?|jumps?|rises?|boosts?|rebounds?|record-high)\b/gi;
const BEARISH_RE = /\b(miss|misses|drops?|declines?|falls?|downgrades?|losses?|weak|lower|negative|concerns?|risks?|bearish|warns?|cuts?|layoffs?|lawsuit|downside|pressure|recession|plunges?|slides?|tumbles?|disappoints?|shortfall|fears?|sell-off)\b/gi;

function analyzeSentiment(news) {
  if (!news.length) return null;
  const scored = news.map(n => { const bull = (n.title.match(BULLISH_RE) || []).length; const bear = (n.title.match(BEARISH_RE) || []).length; return { ...n, net: bull - bear }; });
  const totalNet = scored.reduce((s, v) => s + v.net, 0);
  const score = Math.min(100, Math.max(0, Math.round(50 + (totalNet / Math.max(scored.length * 2, 1)) * 50)));
  const label = score >= 62 ? 'Bullish' : score <= 38 ? 'Bearish' : 'Neutral';
  const strength = score >= 75 || score <= 25 ? 'Strong' : score >= 62 || score <= 38 ? 'Moderate' : 'Weak';
  return { score, label, strength, bullishCount: scored.filter(s => s.net > 0).length, bearishCount: scored.filter(s => s.net < 0).length, neutralCount: scored.filter(s => s.net === 0).length, top: scored.filter(s => s.net !== 0).slice(0, 4), total: scored.length };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SIG_STYLE = {
  BUY:  { badge: 'bg-green-500/15 text-green-400 border-green-500/30',  ring: 'border-green-500/40 bg-green-500/5',  dot: 'bg-green-400' },
  SELL: { badge: 'bg-red-500/15   text-red-400   border-red-500/30',    ring: 'border-red-500/40   bg-red-500/5',    dot: 'bg-red-400'   },
  HOLD: { badge: 'bg-gray-700/30  text-gray-500  border-gray-700/40',   ring: 'border-[#2a2a2a]    bg-[#111]',       dot: 'bg-gray-600'  },
};

function SignalPill({ signal, label, detail, active, onClick }) {
  const s = SIG_STYLE[signal] ?? SIG_STYLE.HOLD;
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${active ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300' : s.badge} hover:opacity-90`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-indigo-400' : s.dot}`} />
      {label}
      <span className={`font-bold ${active ? '' : ''}`}>{signal}</span>
    </button>
  );
}

function TradeSetupCard({ direction, price, atr, supportingSignals, symbol }) {
  const isLong = direction === 'long';
  const entry     = price;
  const stop      = isLong ? +(price - 1.25 * atr).toFixed(2) : +(price + 1.25 * atr).toFixed(2);
  const target    = isLong ? +(price + 2.5 * atr).toFixed(2)  : +(price - 2.5 * atr).toFixed(2);
  const riskAmt   = Math.abs(entry - stop);
  const rewardAmt = Math.abs(target - entry);
  const rr        = riskAmt > 0 ? (rewardAmt / riskAmt).toFixed(1) : '—';
  const pctStop   = ((Math.abs(entry - stop) / entry) * 100).toFixed(1);
  const pctTarget = ((Math.abs(target - entry) / entry) * 100).toFixed(1);

  return (
    <div className={`rounded-xl border p-4 ${isLong ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
      <div className="flex items-center gap-2 mb-3">
        {isLong ? <TrendingUp size={14} className="text-green-400" /> : <TrendingDown size={14} className="text-red-400" />}
        <span className={`text-sm font-bold ${isLong ? 'text-green-400' : 'text-red-400'}`}>
          {isLong ? 'Long Setup' : 'Short Setup'}
        </span>
        <span className="ml-auto text-[10px] text-gray-600 font-mono">{supportingSignals.length} signals agree</span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-[#111] rounded-lg p-2.5 text-center">
          <p className="text-gray-600 text-[10px] mb-0.5">Entry</p>
          <p className="text-white font-mono font-bold text-sm">${entry.toFixed(2)}</p>
          <p className="text-gray-600 text-[10px]">Market</p>
        </div>
        <div className={`rounded-lg p-2.5 text-center ${isLong ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <p className="text-gray-600 text-[10px] mb-0.5 flex items-center justify-center gap-1"><Target size={8} />Target</p>
          <p className={`font-mono font-bold text-sm ${isLong ? 'text-green-400' : 'text-red-400'}`}>${target.toFixed(2)}</p>
          <p className={`text-[10px] ${isLong ? 'text-green-600' : 'text-red-600'}`}>+{pctTarget}%</p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-2.5 text-center">
          <p className="text-gray-600 text-[10px] mb-0.5 flex items-center justify-center gap-1"><ShieldAlert size={8} />Stop</p>
          <p className="text-red-400 font-mono font-bold text-sm">${stop.toFixed(2)}</p>
          <p className="text-red-600 text-[10px]">-{pctStop}%</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-indigo-300 text-[11px] font-semibold">R:R {rr}:1</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {supportingSignals.map(s => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function OptionCard({ stratId, rank, expiry, active, onClick }) {
  const s = OPTION_STRATEGIES.find(o => o.id === stratId);
  if (!s) return null;
  const setupNote = EXPIRY_SETUP[expiry]?.[stratId] ?? '';
  const dirStyle = s.direction === 'bullish'
    ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : s.direction === 'bearish'
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
  const riskStyle = s.risk.includes('Limited') ? 'text-green-400' : 'text-yellow-400';

  return (
    <button onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${active ? 'border-indigo-500 bg-indigo-500/8' : 'border-[#2a2a2a] bg-[#111] hover:border-indigo-500/40'}`}>
      <div className="flex items-start gap-2 mb-2.5">
        <span className={`text-[11px] font-bold shrink-0 mt-0.5 ${rank === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>{rank === 0 ? '★' : `#${rank + 1}`}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-white text-sm font-semibold">{s.name}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${dirStyle}`}>{s.direction}</span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
        </div>
      </div>
      {setupNote && (
        <p className="text-gray-600 text-[11px] leading-relaxed border-t border-[#222] pt-2.5">{setupNote}</p>
      )}
      <p className={`text-[10px] font-medium mt-2 ${riskStyle}`}>Risk: {s.risk}</p>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StrategiesTab({ symbol }) {
  const [activeSignal, setActiveSignal] = useState(null);
  const [expiry, setExpiry]             = useState('monthly');
  const [showAllNews, setShowAllNews]   = useState(false);

  const { data: chart, loading }                  = useChart(symbol, '1d', '2y');
  const { data: news = [], loading: newsLoading } = useNews(symbol, 20);

  const ohlcv  = chart?.ohlcv ?? [];
  const closes = useMemo(() => ohlcv.map(p => p.close), [ohlcv]);
  const price  = closes[closes.length - 1] ?? 0;

  const signals = useMemo(
    () => Object.fromEntries(DAY_STRATEGIES.map(s => [s.id, computeSignal(s.id, closes)])),
    [closes],
  );

  const signalCounts = useMemo(() => {
    const vals = Object.values(signals);
    return { BUY: vals.filter(s => s.signal === 'BUY').length, SELL: vals.filter(s => s.signal === 'SELL').length, HOLD: vals.filter(s => s.signal === 'HOLD').length };
  }, [signals]);

  const verdict = useMemo(() => {
    const { BUY, SELL } = signalCounts;
    const total = 6;
    if (BUY > SELL && BUY >= 3) return { label: 'BULLISH', color: 'text-green-400', border: 'border-green-500/30', bg: 'bg-green-500/5', score: Math.round((BUY / total) * 100) };
    if (SELL > BUY && SELL >= 3) return { label: 'BEARISH', color: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-500/5', score: Math.round((SELL / total) * 100) };
    if (BUY > SELL) return { label: 'LEAN BULLISH', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', score: Math.round((BUY / total) * 100) };
    if (SELL > BUY) return { label: 'LEAN BEARISH', color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5', score: Math.round((SELL / total) * 100) };
    return { label: 'NEUTRAL', color: 'text-gray-400', border: 'border-gray-600/30', bg: 'bg-gray-500/5', score: 50 };
  }, [signalCounts]);

  const hv       = useMemo(() => computeHV(ohlcv), [ohlcv]);
  const atr      = useMemo(() => computeATR(ohlcv), [ohlcv]);
  const trendPct = useMemo(() => {
    if (ohlcv.length < 2) return 0;
    const sl = ohlcv.slice(-63);
    return (sl[sl.length - 1].close - sl[0].close) / sl[0].close * 100;
  }, [ohlcv]);

  const trend   = trendPct > 5 ? 'bullish' : trendPct < -5 ? 'bearish' : 'neutral';
  const hvLevel = hv > 0.40 ? 'high' : hv > 0.20 ? 'medium' : 'low';

  const buySignals  = DAY_STRATEGIES.filter(s => signals[s.id]?.signal === 'BUY').map(s => s.label);
  const sellSignals = DAY_STRATEGIES.filter(s => signals[s.id]?.signal === 'SELL').map(s => s.label);

  const optSuggestions = useMemo(() => suggestOptStrategies(trend, hvLevel, expiry), [trend, hvLevel, expiry]);
  const sentiment      = useMemo(() => analyzeSentiment(news), [news]);

  const trendCls  = trend === 'bullish' ? 'text-green-400' : trend === 'bearish' ? 'text-red-400' : 'text-gray-400';
  const hvCls     = hvLevel === 'high' ? 'text-red-400' : hvLevel === 'medium' ? 'text-yellow-400' : 'text-green-400';
  const sentColor = !sentiment ? 'text-gray-400' : sentiment.label === 'Bullish' ? 'text-green-400' : sentiment.label === 'Bearish' ? 'text-red-400' : 'text-gray-400';

  const showLong  = signalCounts.BUY >= signalCounts.SELL && atr > 0 && price > 0;
  const showShort = signalCounts.SELL >= signalCounts.BUY && atr > 0 && price > 0;
  const showBoth  = signalCounts.BUY >= 2 && signalCounts.SELL >= 2;

  const activeSignalMeta = activeSignal ? DAY_STRATEGIES.find(s => s.id === activeSignal) : null;
  const riskColor = { Low: 'text-green-400', Medium: 'text-yellow-400', High: 'text-red-400' };

  return (
    <div className="space-y-5">

      {/* ── Verdict Banner ── */}
      <div className={`rounded-xl border p-5 ${verdict.bg} ${verdict.border}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-wider mb-1">Overall Signal · {symbol}</p>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-black tracking-tight ${verdict.color}`}>{verdict.label}</span>
              <div className="flex gap-1.5">
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 font-semibold">{signalCounts.BUY} Buy</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/20 font-semibold">{signalCounts.SELL} Sell</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-700/30 text-gray-500 border border-gray-700/40 font-semibold">{signalCounts.HOLD} Hold</span>
              </div>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-4 text-xs">
            <div className="text-center">
              <p className="text-gray-600 text-[10px] mb-0.5">3M Trend</p>
              <p className={`font-mono font-bold ${trendCls}`}>{trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-[10px] mb-0.5">HV (60D)</p>
              <p className={`font-mono font-bold ${hvCls}`}>{(hv * 100).toFixed(0)}%</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600 text-[10px] mb-0.5">ATR(14)</p>
              <p className="font-mono font-bold text-white">${atr.toFixed(2)}</p>
            </div>
            {sentiment && (
              <div className="text-center">
                <p className="text-gray-600 text-[10px] mb-0.5">Sentiment</p>
                <p className={`font-mono font-bold ${sentColor}`}>{sentiment.score}/100</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Technical Signals ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-indigo-400" />
          <h2 className="text-white font-semibold text-sm">Technical Signals</h2>
          <span className="text-gray-600 text-[11px]">2Y daily · click for detail</span>
        </div>

        {loading ? (
          <div className="flex flex-wrap gap-2">{[...Array(6)].map((_, i) => <div key={i} className="h-8 w-28 bg-[#111] rounded-lg animate-pulse" />)}</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {DAY_STRATEGIES.map(s => (
                <SignalPill
                  key={s.id}
                  signal={signals[s.id]?.signal ?? 'HOLD'}
                  label={s.label}
                  detail={signals[s.id]?.label}
                  active={activeSignal === s.id}
                  onClick={() => setActiveSignal(prev => prev === s.id ? null : s.id)}
                />
              ))}
            </div>

            {activeSignal && activeSignalMeta && (
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-[#242424]">
                <Cpu size={12} className="text-indigo-400 shrink-0" />
                <p className="text-gray-400 text-xs flex-1 leading-relaxed">{activeSignalMeta.desc}</p>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-semibold ${riskColor[activeSignalMeta.risk]}`}>Risk: {activeSignalMeta.risk}</span>
                  <span className="text-gray-600 text-[10px] font-mono">{signals[activeSignal]?.label}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Equity Trade Setups ── */}
      {!loading && price > 0 && atr > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-indigo-400" />
            <h2 className="text-white font-semibold text-sm">Equity Trade Setup</h2>
            <span className="text-gray-600 text-[11px]">ATR-based targets · 2:1 R:R</span>
          </div>

          <div className={`grid gap-4 ${showBoth ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-sm'}`}>
            {(showLong || showBoth) && (
              <TradeSetupCard direction="long"  price={price} atr={atr} supportingSignals={buySignals}  symbol={symbol} />
            )}
            {(showShort || showBoth) && (
              <TradeSetupCard direction="short" price={price} atr={atr} supportingSignals={sellSignals} symbol={symbol} />
            )}
          </div>
          <p className="text-gray-700 text-[10px] mt-3">Educational only. Not financial advice. Always use your own risk management.</p>
        </div>
      )}

      {/* ── Options Trade Ideas ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={14} className="text-indigo-400" />
          <h2 className="text-white font-semibold text-sm">Options Trade Ideas</h2>
          <span className="text-gray-600 text-[11px]">based on trend + volatility</span>
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="flex gap-2">{[...Array(5)].map((_, i) => <div key={i} className="h-9 w-24 bg-[#111] rounded-lg animate-pulse" />)}</div>
            <div className="grid grid-cols-2 gap-3">{[0, 1].map(i => <div key={i} className="h-28 bg-[#111] rounded-xl animate-pulse" />)}</div>
          </div>
        ) : ohlcv.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">No data available</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {EXPIRY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setExpiry(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    expiry === opt.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40'
                  }`}>
                  {opt.label}
                  <span className={`text-[10px] ${expiry === opt.id ? 'text-indigo-200' : 'text-gray-600'}`}>{opt.dte}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[#111] border border-[#242424]">
              {trend === 'bullish' ? <TrendingUp size={11} className="text-green-400" /> : trend === 'bearish' ? <TrendingDown size={11} className="text-red-400" /> : <Minus size={11} className="text-gray-400" />}
              <p className="text-gray-500 text-[11px]">
                <span className={trendCls}>{trend}</span> trend · <span className={hvCls}>{hvLevel} volatility</span>
                {' — '}{hvLevel === 'high' ? 'sell premium; avoid naked long options' : hvLevel === 'low' ? 'cheap options favor directional buys' : 'balanced environment'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {optSuggestions.map((id, i) => (
                <OptionCard key={id} stratId={id} rank={i} expiry={expiry} active={false} onClick={() => {}} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── News Sentiment ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={14} className="text-indigo-400" />
          <h2 className="text-white font-semibold text-sm">News Sentiment</h2>
          {sentiment && <span className="text-gray-600 text-[11px]">{sentiment.total} headlines analyzed</span>}
        </div>

        {newsLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-[#111] rounded-lg animate-pulse" />)}</div>
        ) : !sentiment ? (
          <p className="text-gray-600 text-sm text-center py-8">No news data available for {symbol}</p>
        ) : (
          <>
            {/* Score row */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 relative h-2 bg-[#252525] rounded-full overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-500/30 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-green-500/30 to-transparent" />
                <div className="absolute top-0 h-full w-0.5 bg-white rounded-full transition-all duration-500" style={{ left: `calc(${sentiment.score}% - 1px)` }} />
              </div>
              <span className={`text-sm font-bold font-mono ${sentColor}`}>{sentiment.score}/100</span>
              <span className={`text-xs font-semibold ${sentColor}`}>{sentiment.strength} {sentiment.label}</span>
            </div>

            <div className="flex gap-2 mb-4">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{sentiment.bullishCount} Bullish</span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/10   text-red-400   border border-red-500/20">{sentiment.bearishCount} Bearish</span>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-gray-700/30  text-gray-500  border border-gray-700/40">{sentiment.neutralCount} Neutral</span>
            </div>

            {/* Headlines */}
            <div className="space-y-1.5">
              {(showAllNews ? sentiment.top : sentiment.top.slice(0, 3)).map((h, i) => (
                <a key={i} href={h.url} target="_blank" rel="noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#111] border border-[#222] hover:border-indigo-500/30 hover:bg-[#161616] transition-all group">
                  <span className={`text-[10px] mt-0.5 shrink-0 font-bold ${h.net > 0 ? 'text-green-500' : 'text-red-500'}`}>{h.net > 0 ? '▲' : '▼'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-300 text-xs leading-snug line-clamp-2 group-hover:text-white transition-colors">{h.title}</p>
                    <p className="text-gray-600 text-[10px] mt-0.5">{h.source} · {h.time}</p>
                  </div>
                  <ExternalLink size={9} className="text-gray-700 group-hover:text-indigo-400 transition-colors shrink-0 mt-0.5" />
                </a>
              ))}
            </div>

            {sentiment.top.length > 3 && (
              <button onClick={() => setShowAllNews(v => !v)}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-300 text-[11px] mt-2 transition-colors">
                {showAllNews ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showAllNews ? 'Show less' : `Show ${sentiment.top.length - 3} more`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
