import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, Minus, BarChart2, Zap, RefreshCw,
  Layers, Activity, Cpu, MessageCircle, TrendingDown, Newspaper, ExternalLink,
} from 'lucide-react';
import { useChart, useNews } from '../hooks/useYahoo';

// ─── Constants ────────────────────────────────────────────────────────────────

const POPULAR = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'META', 'AMZN', 'GOOGL', 'SPY', 'QQQ', 'GLD'];

const DAY_STRATEGIES = [
  { id: 'ma',       label: 'MA Crossover',   subtitle: '50/200-day SMA',         icon: TrendingUp, risk: 'Medium', minDays: 200,
    desc: 'Golden cross (50 > 200) = BUY; death cross = SELL. Classic trend filter.' },
  { id: 'rsi',      label: 'RSI Reversion',  subtitle: 'RSI < 35 / > 65',        icon: RefreshCw,  risk: 'Medium', minDays: 16,
    desc: 'Oversold (RSI<35) = BUY; overbought (RSI>65) = SELL. Fades extremes.' },
  { id: 'momentum', label: 'Momentum',       subtitle: '20-day % change',         icon: Zap,        risk: 'High',   minDays: 21,
    desc: '>5% gain = BUY; >5% loss = SELL. Rides existing price trends.' },
  { id: 'mean',     label: 'Mean Reversion', subtitle: '30-day Z-score',          icon: Minus,      risk: 'Low',    minDays: 30,
    desc: 'Z < -1.5 (cheap) = BUY; Z > 1.5 (expensive) = SELL.' },
  { id: 'macd',     label: 'MACD',           subtitle: '12/26/9 EMA histogram',   icon: BarChart2,  risk: 'Medium', minDays: 35,
    desc: 'Histogram turns positive = BUY; turns negative = SELL.' },
  { id: 'ema',      label: 'EMA Crossover',  subtitle: 'EMA9/20 + EMA50 filter', icon: Activity,   risk: 'Low',    minDays: 50,
    desc: 'EMA9 > EMA20 and price > EMA50 = BUY. Triple trend confirmation.' },
];

const OPTION_STRATEGIES = [
  { id: 'long_call',   name: 'Long Call',       direction: 'bullish', ivPref: 'low',  riskColor: 'text-yellow-400',
    risk: 'Limited (premium)', desc: 'Buy ATM call. Profit from upside with defined risk.' },
  { id: 'bull_spread', name: 'Bull Call Spread', direction: 'bullish', ivPref: 'any', riskColor: 'text-green-400',
    risk: 'Limited (debit)',   desc: 'Buy ATM call, sell 5% OTM call. Cheaper bullish bet.' },
  { id: 'long_put',    name: 'Long Put',          direction: 'bearish', ivPref: 'low',  riskColor: 'text-yellow-400',
    risk: 'Limited (premium)', desc: 'Buy ATM put. Profit from downside or hedge a long.' },
  { id: 'bear_spread', name: 'Bear Put Spread',   direction: 'bearish', ivPref: 'any', riskColor: 'text-green-400',
    risk: 'Limited (debit)',   desc: 'Buy ATM put, sell 5% OTM put. Cheaper bearish bet.' },
  { id: 'straddle',    name: 'Long Straddle',     direction: 'neutral', ivPref: 'low',  riskColor: 'text-yellow-400',
    risk: 'Limited (2× prem)', desc: 'Buy ATM call + put. Profits from any large move.' },
  { id: 'iron_condor', name: 'Iron Condor',       direction: 'neutral', ivPref: 'high', riskColor: 'text-green-400',
    risk: 'Limited (wings)',   desc: 'Sell ±5% strangles, buy ±10% wings. Earns in quiet markets.' },
];

const EXPIRY_OPTIONS = [
  { id: 'weekly',    label: 'Weekly',  dte: '5–7 DTE'     },
  { id: 'biweekly',  label: '2 Weeks', dte: '14 DTE'      },
  { id: 'monthly',   label: 'Monthly', dte: '21–30 DTE'   },
  { id: 'quarterly', label: 'Quarterly', dte: '60–90 DTE' },
  { id: 'leaps',     label: 'LEAPS',   dte: '180–365 DTE' },
];

const OPT_ROLL_WINDOWS     = ['7D', '14D', '30D', '90D'];
const OPT_ROLL_WINDOW_DAYS = { '7D': 7, '14D': 14, '30D': 30, '90D': 90 };

// ─── Day-trading signal helpers ───────────────────────────────────────────────

function computeSignalFromCloses(strategyId, closes) {
  const n = closes.length;
  if (n < 2) return { signal: 'HOLD', strength: 0, metric: null, label: '' };
  const last = closes[n - 1];

  if (strategyId === 'ma') {
    if (n < 200) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 200 days' };
    const ma50  = closes.slice(-50).reduce((s, v) => s + v, 0) / 50;
    const ma200 = closes.slice(-200).reduce((s, v) => s + v, 0) / 200;
    const diff  = (ma50 - ma200) / ma200 * 100;
    return {
      signal:   ma50 > ma200 ? 'BUY' : ma50 < ma200 * 0.98 ? 'SELL' : 'HOLD',
      strength: Math.min(Math.abs(diff) * 10, 100),
      metric:   diff,
      label:    `MA50/200 spread: ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`,
    };
  }
  if (strategyId === 'rsi') {
    if (n < 16) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 16 days' };
    const changes = closes.slice(1).map((p, i) => p - closes[i]);
    const recent  = changes.slice(-14);
    const gains   = recent.filter(c => c > 0).reduce((s, c) => s + c, 0) / 14;
    const losses  = recent.filter(c => c < 0).reduce((s, c) => s - c, 0) / 14;
    const rsi     = losses === 0 ? 100 : 100 - 100 / (1 + gains / losses);
    return {
      signal:   rsi < 35 ? 'BUY' : rsi > 65 ? 'SELL' : 'HOLD',
      strength: rsi < 35 ? Math.min((35 - rsi) / 35 * 100, 100) : rsi > 65 ? Math.min((rsi - 65) / 35 * 100, 100) : 50,
      metric:   rsi,
      label:    `RSI(14): ${rsi.toFixed(1)}`,
    };
  }
  if (strategyId === 'momentum') {
    if (n < 22) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 21 days' };
    const base20 = closes[n - 21];
    const mom    = (last - base20) / base20 * 100;
    return {
      signal:   mom > 5 ? 'BUY' : mom < -5 ? 'SELL' : 'HOLD',
      strength: Math.min(Math.abs(mom) * 5, 100),
      metric:   mom,
      label:    `20D momentum: ${mom >= 0 ? '+' : ''}${mom.toFixed(2)}%`,
    };
  }
  if (strategyId === 'mean') {
    if (n < 30) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 30 days' };
    const slice = closes.slice(-30);
    const mean  = slice.reduce((s, v) => s + v, 0) / 30;
    const sd    = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / 29);
    const z     = sd === 0 ? 0 : (last - mean) / sd;
    return {
      signal:   z < -1.5 ? 'BUY' : z > 1.5 ? 'SELL' : 'HOLD',
      strength: Math.min(Math.abs(z) * 33.3, 100),
      metric:   z,
      label:    `Z-score(30): ${z.toFixed(2)}`,
    };
  }
  if (strategyId === 'macd') {
    if (n < 35) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 35 days' };
    const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
    let e12 = closes[0], e26 = closes[0];
    const macdArr = [];
    for (let i = 1; i < n; i++) {
      e12 = closes[i] * k12 + e12 * (1 - k12);
      e26 = closes[i] * k26 + e26 * (1 - k26);
      macdArr.push(e12 - e26);
    }
    let sig = macdArr[0];
    const histArr = [];
    for (const m of macdArr) { sig = m * k9 + sig * (1 - k9); histArr.push(m - sig); }
    const lh = histArr[histArr.length - 1];
    const ph = histArr[histArr.length - 2] ?? 0;
    return {
      signal:   lh > 0 && ph <= 0 ? 'BUY' : lh < 0 && ph >= 0 ? 'SELL' : 'HOLD',
      strength: Math.min(Math.abs(lh) * 1000, 100),
      metric:   lh,
      label:    `MACD hist: ${lh >= 0 ? '+' : ''}${lh.toFixed(4)}`,
    };
  }
  if (strategyId === 'ema') {
    if (n < 50) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 50 days' };
    const k9 = 2 / 10, k20 = 2 / 21, k50 = 2 / 51;
    let e9 = closes[0], e20 = closes[0], e50 = closes[0];
    for (let i = 1; i < n; i++) {
      e9  = closes[i] * k9  + e9  * (1 - k9);
      e20 = closes[i] * k20 + e20 * (1 - k20);
      e50 = closes[i] * k50 + e50 * (1 - k50);
    }
    const spread = (e9 - e20) / e20 * 100;
    return {
      signal:   e9 > e20 && last > e50 ? 'BUY' : e9 < e20 && last < e50 ? 'SELL' : 'HOLD',
      strength: Math.min(Math.abs(spread) * 500, 100),
      metric:   spread,
      label:    `EMA9/20 spread: ${spread >= 0 ? '+' : ''}${spread.toFixed(3)}%`,
    };
  }
  return { signal: 'HOLD', strength: 0, metric: null, label: '' };
}

// ─── Options helpers ──────────────────────────────────────────────────────────

function computeHV(ohlcv, n = 60) {
  const slice = ohlcv.slice(-Math.min(n + 1, ohlcv.length));
  if (slice.length < 5) return 0.3;
  const rets = slice.slice(1).map((pt, i) => Math.log(pt.close / slice[i].close));
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance * 252);
}

function normCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))));
  return x > 0 ? 1 - p : p;
}
function bsCall(S, K, T, sigma, r = 0.05) {
  if (T <= 0) return Math.max(0, S - K);
  const sq = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / sq;
  return S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d1 - sq);
}
function bsPut(S, K, T, sigma, r = 0.05) {
  if (T <= 0) return Math.max(0, K - S);
  const sq = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / sq;
  return K * Math.exp(-r * T) * normCDF(-(d1 - sq)) - S * normCDF(-d1);
}

function computeOptStratRolling(ohlcv, strategyId, windowDays, hv) {
  if (!ohlcv || ohlcv.length <= windowDays || hv <= 0) return [];
  const T = windowDays / 252, r = 0.05;
  const result = [];
  for (let i = 0; i + windowDays < ohlcv.length; i++) {
    const S0 = ohlcv[i].close, S1 = ohlcv[i + windowDays].close;
    const stockRet = +((S1 - S0) / S0 * 100).toFixed(2);
    let stratRet = 0;
    if (strategyId === 'long_call') {
      const prem = bsCall(S0, S0, T, hv, r);
      stratRet = prem > 0.01 ? +((Math.max(0, S1 - S0) - prem) / prem * 100).toFixed(2) : 0;
    } else if (strategyId === 'bull_spread') {
      const K2 = S0 * 1.05, cost = bsCall(S0, S0, T, hv, r) - bsCall(S0, K2, T, hv, r);
      stratRet = cost > 0.01 ? +((Math.max(0, Math.min(S1 - S0, K2 - S0)) - cost) / cost * 100).toFixed(2) : 0;
    } else if (strategyId === 'long_put') {
      const prem = bsPut(S0, S0, T, hv, r);
      stratRet = prem > 0.01 ? +((Math.max(0, S0 - S1) - prem) / prem * 100).toFixed(2) : 0;
    } else if (strategyId === 'bear_spread') {
      const K1 = S0 * 0.95, cost = bsPut(S0, S0, T, hv, r) - bsPut(S0, K1, T, hv, r);
      stratRet = cost > 0.01 ? +((Math.max(0, Math.min(S0 - S1, S0 - K1)) - cost) / cost * 100).toFixed(2) : 0;
    } else if (strategyId === 'straddle') {
      const cost = bsCall(S0, S0, T, hv, r) + bsPut(S0, S0, T, hv, r);
      stratRet = cost > 0.01 ? +((Math.abs(S1 - S0) - cost) / cost * 100).toFixed(2) : 0;
    } else if (strategyId === 'iron_condor') {
      const Kpc = S0 * 0.95, Kpp = S0 * 0.90, Kcc = S0 * 1.05, Kcp = S0 * 1.10;
      const credit = (bsPut(S0, Kpc, T, hv, r) - bsPut(S0, Kpp, T, hv, r))
                   + (bsCall(S0, Kcc, T, hv, r) - bsCall(S0, Kcp, T, hv, r));
      let pnl = credit;
      if (S1 < Kpc) pnl -= Math.min(Kpc - S1, Kpc - Kpp);
      if (S1 > Kcc) pnl -= Math.min(S1 - Kcc, Kcp - Kcc);
      const maxLoss = S0 * 0.05 - credit;
      stratRet = maxLoss > 0.01 ? +((pnl / maxLoss) * 100).toFixed(2) : 0;
    }
    result.push({ date: ohlcv[i + windowDays].date, stratRet, stockRet });
  }
  return result;
}

function suggestOptStrategies(trend, hvLevel, expiry) {
  if (expiry === 'weekly') {
    if (hvLevel === 'high') {
      if (trend === 'bullish') return ['bull_spread', 'iron_condor'];
      if (trend === 'bearish') return ['bear_spread', 'iron_condor'];
      return ['iron_condor', 'bull_spread'];
    }
    if (trend === 'bullish') return ['bull_spread', 'straddle'];
    if (trend === 'bearish') return ['bear_spread', 'straddle'];
    return ['straddle', 'iron_condor'];
  }
  if (expiry === 'biweekly') {
    if (hvLevel === 'high') {
      if (trend === 'bullish') return ['bull_spread', 'iron_condor'];
      if (trend === 'bearish') return ['bear_spread', 'iron_condor'];
      return ['iron_condor', 'bull_spread'];
    }
    if (trend === 'bullish') return ['bull_spread', 'long_call'];
    if (trend === 'bearish') return ['bear_spread', 'long_put'];
    return ['straddle', 'iron_condor'];
  }
  if (expiry === 'quarterly') {
    if (trend === 'bullish') return hvLevel === 'high' ? ['bull_spread', 'long_call'] : ['long_call', 'bull_spread'];
    if (trend === 'bearish') return hvLevel === 'high' ? ['bear_spread', 'long_put'] : ['long_put', 'bear_spread'];
    return hvLevel === 'high' ? ['iron_condor', 'straddle'] : ['straddle', 'long_call'];
  }
  if (expiry === 'leaps') {
    if (trend === 'bullish') return ['long_call', 'bull_spread'];
    if (trend === 'bearish') return ['long_put', 'bear_spread'];
    return ['straddle', 'long_call'];
  }
  // monthly (default)
  if (trend === 'bullish') return hvLevel === 'low' ? ['long_call', 'bull_spread'] : ['bull_spread', 'long_call'];
  if (trend === 'bearish') return hvLevel === 'low' ? ['long_put', 'bear_spread'] : ['bear_spread', 'long_put'];
  return hvLevel === 'high' ? ['iron_condor', 'straddle'] : ['straddle', 'iron_condor'];
}

function getConditionRationale(trend, hvLevel, expiry) {
  const trendStr  = trend === 'bullish' ? 'uptrend' : trend === 'bearish' ? 'downtrend' : 'sideways range';
  const ivStr     = hvLevel === 'high' ? 'elevated IV' : hvLevel === 'medium' ? 'moderate IV' : 'low IV';
  const expiryCtx = expiry === 'weekly'    ? 'Fast theta at weekly expiry amplifies credit spreads.'
    : expiry === 'biweekly'  ? '2-week expiry balances fast theta with some directional runway.'
    : expiry === 'quarterly' ? 'Longer runway reduces theta pressure on directional plays.'
    : expiry === 'leaps'     ? 'LEAPS theta is minimal — buying premium is cost-effective.'
    : 'Standard monthly expiry — balanced theta vs time-to-profit.';
  if (trend === 'bullish' && hvLevel === 'high')
    return `${trendStr.charAt(0).toUpperCase() + trendStr.slice(1)} with ${ivStr} — sell premium on pullbacks. ${expiryCtx}`;
  if (trend === 'bullish' && hvLevel !== 'high')
    return `${trendStr.charAt(0).toUpperCase() + trendStr.slice(1)} with ${ivStr} — cheap options favor directional buys. ${expiryCtx}`;
  if (trend === 'bearish' && hvLevel === 'high')
    return `${trendStr.charAt(0).toUpperCase() + trendStr.slice(1)} with ${ivStr} — premium selling on bounces works well. ${expiryCtx}`;
  if (trend === 'bearish' && hvLevel !== 'high')
    return `${trendStr.charAt(0).toUpperCase() + trendStr.slice(1)} with ${ivStr} — low option cost favors put purchases. ${expiryCtx}`;
  if (hvLevel === 'high')
    return `Range-bound with ${ivStr} — Iron Condor collects rich premium on both sides. ${expiryCtx}`;
  return `Range-bound with ${ivStr} — straddle profits from any large move. ${expiryCtx}`;
}

const EXPIRY_SETUP = {
  weekly: {
    long_call:   'Needs a sharp move immediately — theta burns fastest at weekly expiry.',
    bull_spread: "Sell the spread at 5–7 DTE. Rapid theta decay works in the seller's favor.",
    long_put:    'Needs a sharp drop fast — theta is the biggest enemy here.',
    bear_spread: 'Sell the spread at 5–7 DTE. Quick IV crush accelerates profit.',
    straddle:    'Enter 1 day before a catalyst. Needs a move larger than combined premium paid.',
    iron_condor: 'Ideal for weekly expiry — theta decays rapidly and the profit zone is wide.',
  },
  biweekly: {
    long_call:   'Buy ATM call at 14 DTE. Short window — needs a move within 2 weeks.',
    bull_spread:'Sell the spread at 14 DTE. Theta starts accelerating, favoring sellers.',
    long_put:    'Buy ATM put at 14 DTE. Requires a clear catalyst within 2 weeks.',
    bear_spread: 'Sell the spread at 14 DTE. Good balance of premium and time.',
    straddle:    'Enter 1–2 days before a catalyst with 14 DTE. Exit quickly after the move.',
    iron_condor: 'Sell ±5% strikes at 14 DTE. Theta decay accelerates toward expiry.',
  },
  monthly: {
    long_call:   'Buy ATM call 21–30 DTE. Balanced theta vs enough time to be right.',
    bull_spread: 'Buy ATM / sell 5% OTM call. Standard 21–30 DTE setup.',
    long_put:    'Buy ATM put 21–30 DTE. Balanced theta vs time for the move.',
    bear_spread: 'Buy ATM / sell 5% OTM put. Standard 21–30 DTE setup.',
    straddle:    'Enter 3–5 days before a catalyst. Exit within 1–2 days after the event.',
    iron_condor: 'Sell ±5% strikes, buy ±10% wings. Target 21–30 DTE entry.',
  },
  quarterly: {
    long_call:   'Buy ATM or slightly OTM call 60–90 DTE. Ample time for the thesis to play out.',
    bull_spread: 'Wider spread works well at 60–90 DTE — lower theta pressure on the debit.',
    long_put:    'Buy ATM or slightly OTM put 60–90 DTE. Time on your side.',
    bear_spread: 'Wider spread at 60–90 DTE. Ride the move without excessive theta drag.',
    straddle:    'Lower daily theta cost — buy 60 DTE and adjust strikes if needed.',
    iron_condor: 'Use wider strikes at 60–90 DTE to give the stock room to move.',
  },
  leaps: {
    long_call:   'Buy deep ITM or ATM call 180–365 DTE. Acts as leveraged long stock exposure.',
    bull_spread: 'Wide vertical spread 180+ DTE. Minimal theta, maximum time to be right.',
    long_put:    'Buy deep ITM or ATM put 180–365 DTE. Effective long-term hedge.',
    bear_spread: 'Wide vertical spread 180+ DTE for a sustained downtrend thesis.',
    straddle:    'Expensive upfront but virtually no theta risk. Good for macro uncertainty.',
    iron_condor: 'Less effective at LEAPS — use only with very high range-bound conviction.',
  },
};

// ─── Sentiment engine ─────────────────────────────────────────────────────────

const BULLISH_RE = /\b(beat|beats|surges?|records?|upgrades?|growth|strong|rally|rallies|higher|profits?|gains?|exceeds?|outperforms?|bullish|breakout|momentum|launches?|partnerships?|acquisitions?|raises?|positive|upside|soars?|jumps?|rises?|boosts?|rebounds?|optimistic|expansion|record-high|all-time)\b/gi;
const BEARISH_RE = /\b(miss|misses|drops?|declines?|falls?|downgrades?|losses?|weak|lower|negative|concerns?|risks?|bearish|warns?|warnings?|cuts?|layoffs?|lawsuits?|investigation|downside|pressure|recession|plunges?|slides?|tumbles?|crash|crashing|disappoints?|disappointing|shortfall|deficit|fears?|troubles?|struggles?|sell-off)\b/gi;

function scoreHeadline(title) {
  const bull = (title.match(BULLISH_RE) || []).length;
  const bear = (title.match(BEARISH_RE) || []).length;
  return { bull, bear, net: bull - bear };
}

function analyzeSentiment(news) {
  if (!news.length) return null;
  const scored = news.map(n => ({ ...scoreHeadline(n.title), title: n.title, source: n.source, time: n.time, url: n.url }));
  const totalNet = scored.reduce((s, v) => s + v.net, 0);
  const maxPossible = Math.max(scored.length * 2, 1);
  const score   = Math.min(100, Math.max(0, Math.round(50 + (totalNet / maxPossible) * 50)));
  const label   = score >= 62 ? 'Bullish' : score <= 38 ? 'Bearish' : 'Neutral';
  const strength = score >= 75 || score <= 25 ? 'Strong' : score >= 62 || score <= 38 ? 'Moderate' : 'Weak';
  return {
    score, label, strength,
    bullishCount: scored.filter(s => s.net > 0).length,
    bearishCount: scored.filter(s => s.net < 0).length,
    neutralCount: scored.filter(s => s.net === 0).length,
    topBullish:   scored.filter(s => s.net > 0).slice(0, 3),
    topBearish:   scored.filter(s => s.net < 0).slice(0, 3),
    total:        scored.length,
  };
}

function getSentimentStrategies(sentLabel, hvLevel) {
  if (sentLabel === 'Bullish')
    return hvLevel === 'high' ? ['bull_spread', 'iron_condor'] : ['long_call', 'bull_spread'];
  if (sentLabel === 'Bearish')
    return hvLevel === 'high' ? ['bear_spread', 'iron_condor'] : ['long_put', 'bear_spread'];
  return hvLevel === 'high' ? ['iron_condor', 'straddle'] : ['straddle', 'iron_condor'];
}

// ─── Rolling chart ────────────────────────────────────────────────────────────

function RollingChart({ data, loading, emptyMsg }) {
  const Tip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-mono space-y-0.5">
        <p className="text-gray-400">{d?.date}</p>
        {payload.map(p => {
          const v = p.value ?? 0;
          const color = p.dataKey === 'stockRet' ? '#9ca3af' : v >= 0 ? '#6366f1' : '#ef4444';
          return <p key={p.dataKey} style={{ color }}>{p.name}: {v >= 0 ? '+' : ''}{v.toFixed(2)}%</p>;
        })}
      </div>
    );
  };

  if (loading) return <div className="bg-[#111] rounded-lg animate-pulse h-44" />;
  if (!data.length) return <p className="text-gray-600 text-sm text-center py-8">{emptyMsg}</p>;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="date" hide />
        <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={44}
          tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`} />
        <ReferenceLine y={0} stroke="#3a3a3a" />
        <Tooltip content={<Tip />} />
        <Bar dataKey="stratRet" name="Strategy" isAnimationActive={false} radius={[2, 2, 0, 0]}>
          {data.map((e, i) => <Cell key={i} fill={e.stratRet >= 0 ? '#6366f1' : '#ef4444'} fillOpacity={0.85} />)}
        </Bar>
        <Line type="monotone" dataKey="stockRet" name="Stock" stroke="#9ca3af" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SignalBadge({ signal }) {
  const styles = {
    BUY:  'bg-green-500/15 text-green-400 border border-green-500/20',
    SELL: 'bg-red-500/15   text-red-400   border border-red-500/20',
    HOLD: 'bg-gray-500/15  text-gray-400  border border-gray-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[signal] ?? styles.HOLD}`}>
      {signal}
    </span>
  );
}

function StrengthBar({ value }) {
  const color = value >= 70 ? '#6366f1' : value >= 40 ? '#f59e0b' : '#6b7280';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 bg-[#2a2a2a] rounded-full h-1" style={{ maxWidth: 60 }}>
        <div className="h-1 rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-gray-500 text-[10px] font-mono w-8 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

function DayStratCard({ strategy, selected, signal, onClick }) {
  const Icon = strategy.icon;
  const sigColor = signal?.signal === 'BUY' ? 'text-green-400' : signal?.signal === 'SELL' ? 'text-red-400' : 'text-gray-400';
  const metricFmt = v => v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2);
  return (
    <button onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        selected ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#2a2a2a] bg-[#111] hover:border-indigo-500/40'
      }`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className={selected ? 'text-indigo-400' : 'text-gray-500'} />
        <span className={`text-xs font-semibold ${selected ? 'text-white' : 'text-gray-300'}`}>{strategy.label}</span>
      </div>
      <p className="text-gray-500 text-[10px] mb-2">{strategy.subtitle}</p>
      {signal && (
        <>
          <div className="flex items-center justify-between mb-1.5">
            <SignalBadge signal={signal.signal} />
            <span className={`text-[10px] font-mono font-semibold ${sigColor}`}>
              {metricFmt(signal.metric)}
            </span>
          </div>
          <StrengthBar value={signal.strength} />
        </>
      )}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Strategies() {
  const [symbol, setSymbol]                 = useState('AAPL');
  const [input,  setInput]                  = useState('');
  const [activeDayStrat, setActiveDayStrat] = useState('rsi');
  const [expiry, setExpiry]                 = useState('monthly');
  const [activeOptStrat, setActiveOptStrat] = useState(null);
  const [optRollWin, setOptRollWin]         = useState('30D');

  const { data: chart, loading }    = useChart(symbol, '1d', '2y');
  const { data: news = [], loading: newsLoading } = useNews(symbol, 20);
  const ohlcv  = chart?.ohlcv ?? [];
  const closes = useMemo(() => ohlcv.map(p => p.close), [ohlcv]);

  const daySignals = useMemo(
    () => Object.fromEntries(DAY_STRATEGIES.map(s => [s.id, computeSignalFromCloses(s.id, closes)])),
    [closes],
  );

  const hv       = useMemo(() => computeHV(ohlcv), [ohlcv]);
  const trendPct = useMemo(() => {
    if (ohlcv.length < 2) return 0;
    const slice = ohlcv.slice(-63);
    return (slice[slice.length - 1].close - slice[0].close) / slice[0].close * 100;
  }, [ohlcv]);
  const trend          = trendPct > 5 ? 'bullish' : trendPct < -5 ? 'bearish' : 'neutral';
  const hvLevel        = hv > 0.40 ? 'high' : hv > 0.20 ? 'medium' : 'low';
  const optSuggestions  = useMemo(() => suggestOptStrategies(trend, hvLevel, expiry), [trend, hvLevel, expiry]);
  const sentiment       = useMemo(() => analyzeSentiment(news), [news]);
  const sentStrategies  = useMemo(() => sentiment ? getSentimentStrategies(sentiment.label, hvLevel) : [], [sentiment, hvLevel]);

  useEffect(() => {
    setActiveOptStrat(s => optSuggestions.includes(s) ? s : optSuggestions[0]);
  }, [optSuggestions]);

  const optRolling = useMemo(
    () => computeOptStratRolling(ohlcv, activeOptStrat, OPT_ROLL_WINDOW_DAYS[optRollWin], hv),
    [ohlcv, activeOptStrat, optRollWin, hv],
  );

  function commit(sym) {
    const s = sym.trim().toUpperCase();
    if (s) { setSymbol(s); setInput(''); }
  }

  const activeDayMeta = DAY_STRATEGIES.find(s => s.id === activeDayStrat);
  const riskColor     = { Low: 'text-green-400', Medium: 'text-yellow-400', High: 'text-red-400' };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">

      {/* Header + symbol input */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
        <div>
          <h1 className="text-white text-2xl font-bold">Trading Strategies</h1>
          <p className="text-gray-500 text-sm mt-0.5">Day trading signals & options analyzer — live signals from real data</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && commit(input)}
            placeholder="Enter symbol…"
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 w-36 focus:outline-none focus:border-indigo-500 placeholder-gray-600 uppercase"
          />
          <button onClick={() => commit(input)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Go
          </button>
        </div>
      </div>

      {/* Symbol chips */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {POPULAR.map(s => (
          <button key={s} onClick={() => setSymbol(s)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
              symbol === s ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Active symbol bar */}
      {chart && (
        <div className="flex items-center gap-3 mb-6">
          <span className="text-white font-bold text-lg">{chart.name || symbol}</span>
          {chart.price != null && <span className="text-gray-300 font-mono">${chart.price.toFixed(2)}</span>}
          {chart.pct  != null && (
            <span className={`text-sm font-mono ${chart.pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {chart.pct >= 0 ? '+' : ''}{chart.pct.toFixed(2)}% today
            </span>
          )}
          <span className="text-gray-600 text-xs">· 2Y data · {ohlcv.length} trading days</span>
        </div>
      )}

      {/* ── Day Trading Strategies ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-indigo-400" />
          <h2 className="text-white font-semibold">Day Trading Strategies</h2>
          <span className="text-gray-500 text-xs">Live signals computed from real price data</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {DAY_STRATEGIES.map(s => (
            <DayStratCard
              key={s.id}
              strategy={s}
              selected={activeDayStrat === s.id}
              signal={closes.length ? daySignals[s.id] : null}
              onClick={() => setActiveDayStrat(s.id)}
            />
          ))}
        </div>

        {activeDayMeta && (
          <div className="flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a]">
            <Cpu size={13} className="text-indigo-400 shrink-0" />
            <p className="text-gray-400 text-xs flex-1">{activeDayMeta.desc}</p>
            <span className={`text-xs font-semibold shrink-0 ${riskColor[activeDayMeta.risk]}`}>
              Risk: {activeDayMeta.risk}
            </span>
            {daySignals[activeDayStrat]?.label && (
              <span className="text-gray-500 text-xs font-mono shrink-0">{daySignals[activeDayStrat].label}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Options Strategy Analyzer ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-indigo-400" />
          <h2 className="text-white font-semibold">Options Strategy Analyzer</h2>
          <span className="text-gray-500 text-xs">AI-recommended based on 2Y price action</span>
        </div>

        {!loading && ohlcv.length > 0 ? (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Zap size={13} className="text-yellow-400 shrink-0" />
              <span className="text-white text-sm font-semibold">Recommended for Current Conditions</span>
              <div className="flex items-center gap-2 ml-auto">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${trend === 'bullish' ? 'bg-green-500/10 text-green-400' : trend === 'bearish' ? 'bg-red-500/10 text-red-400' : 'bg-gray-500/10 text-gray-400'}`}>
                  {trend} {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}% (3M)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${hvLevel === 'high' ? 'bg-red-500/10 text-red-400' : hvLevel === 'medium' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                  HV {(hv * 100).toFixed(0)}% · {hvLevel} IV
                </span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-4">{getConditionRationale(trend, hvLevel, expiry)}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {EXPIRY_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setExpiry(opt.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    expiry === opt.id
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40'
                  }`}>
                  {opt.label}
                  <span className={`text-[10px] ${expiry === opt.id ? 'text-indigo-200' : 'text-gray-600'}`}>
                    {opt.dte}
                  </span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {optSuggestions.map((id, i) => {
                const s = OPTION_STRATEGIES.find(o => o.id === id);
                if (!s) return null;
                const dirColor = s.direction === 'bullish' ? 'text-green-400 bg-green-500/10'
                  : s.direction === 'bearish' ? 'text-red-400 bg-red-500/10'
                  : 'text-indigo-400 bg-indigo-500/10';
                const setupNote = EXPIRY_SETUP[expiry]?.[id] ?? '';
                const isActive  = activeOptStrat === id;
                return (
                  <button key={id} onClick={() => setActiveOptStrat(id)}
                    className={`text-left p-3 rounded-lg border transition-all ${
                      isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#2a2a2a] bg-[#0f0f0f] hover:border-indigo-500/40'
                    }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-yellow-400 shrink-0">
                        {i === 0 ? '★ Best Fit' : `#${i + 1}`}
                      </span>
                      <span className="text-white text-xs font-semibold">{s.name}</span>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${dirColor}`}>
                        {s.direction}
                      </span>
                    </div>
                    <p className="text-gray-400 text-[11px] leading-relaxed mb-1.5">{s.desc}</p>
                    {setupNote && (
                      <p className="text-gray-600 text-[10px] leading-relaxed border-t border-[#2a2a2a] pt-1.5">
                        {setupNote}
                      </p>
                    )}
                    <p className={`text-[10px] mt-1.5 ${s.riskColor}`}>Risk: {s.risk}</p>
                  </button>
                );
              })}
            </div>

            {/* Rolling returns */}
            <div className="border-t border-[#2a2a2a] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-white text-sm font-semibold">
                    {OPTION_STRATEGIES.find(o => o.id === activeOptStrat)?.name ?? '—'} — Rolling {optRollWin} Returns
                  </p>
                  <p className="text-gray-600 text-xs mt-0.5">
                    Bars: strategy P&L as % of cost · Line: underlying stock return · click a card above to switch
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {OPT_ROLL_WINDOWS.map(w => (
                    <button key={w} onClick={() => setOptRollWin(w)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        optRollWin === w ? 'bg-indigo-600 text-white' : 'bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white'
                      }`}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <RollingChart
                data={optRolling}
                loading={loading}
                emptyMsg="Not enough data — try a shorter window."
              />
            </div>
          </div>
        ) : loading ? (
          <div className="bg-[#111] rounded-lg animate-pulse h-32" />
        ) : (
          <p className="text-gray-600 text-sm text-center py-8">No data available</p>
        )}
      </div>

      {/* ── Social Sentiment Strategy Analyzer ── */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle size={16} className="text-indigo-400" />
          <h2 className="text-white font-semibold">Social Sentiment Strategy Analyzer</h2>
          <span className="text-gray-500 text-xs">News headline sentiment · last 20 articles</span>
        </div>

        {newsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="bg-[#111] rounded-lg animate-pulse h-10" />)}
          </div>
        ) : !sentiment ? (
          <p className="text-gray-600 text-sm text-center py-8">No news data available for {symbol}</p>
        ) : (
          <>
            {/* Score bar */}
            <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {sentiment.label === 'Bullish'
                    ? <TrendingUp size={14} className="text-green-400" />
                    : sentiment.label === 'Bearish'
                    ? <TrendingDown size={14} className="text-red-400" />
                    : <Minus size={14} className="text-gray-400" />}
                  <span className={`text-sm font-bold ${sentiment.label === 'Bullish' ? 'text-green-400' : sentiment.label === 'Bearish' ? 'text-red-400' : 'text-gray-300'}`}>
                    {sentiment.strength} {sentiment.label}
                  </span>
                </div>
                <span className="text-white font-mono font-bold text-sm">{sentiment.score}/100</span>
              </div>

              {/* Gauge bar */}
              <div className="relative h-3 bg-[#2a2a2a] rounded-full overflow-hidden mb-3">
                <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-500/40 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-green-500/40 to-transparent" />
                <div
                  className="absolute top-0 h-full w-1 bg-white rounded-full shadow-lg transition-all duration-500"
                  style={{ left: `calc(${sentiment.score}% - 2px)` }}
                />
              </div>

              {/* Breakdown pills */}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                  {sentiment.bullishCount} Bullish
                </span>
                <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {sentiment.bearishCount} Bearish
                </span>
                <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                  {sentiment.neutralCount} Neutral
                </span>
                <span className="ml-auto text-gray-600 text-[10px] self-center">{sentiment.total} headlines analyzed</span>
              </div>
            </div>

            {/* Headlines */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {sentiment.topBullish.length > 0 && (
                <div className="bg-[#0f0f0f] border border-green-500/10 rounded-xl p-3">
                  <p className="text-green-400 text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp size={11} /> Bullish Signals
                  </p>
                  <ul className="space-y-2">
                    {sentiment.topBullish.map((h, i) => (
                      <li key={i}>
                        <a href={h.url} target="_blank" rel="noreferrer"
                          className="flex items-start gap-2 rounded-lg p-1.5 hover:bg-green-500/5 transition-colors group">
                          <span className="text-green-500 text-[10px] mt-0.5 shrink-0">▲</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-300 text-[11px] leading-snug line-clamp-2 group-hover:text-white transition-colors">{h.title}</p>
                            <p className="text-gray-600 text-[10px] mt-0.5">{h.source} · {h.time}</p>
                          </div>
                          <ExternalLink size={10} className="text-gray-700 group-hover:text-green-400 transition-colors shrink-0 mt-0.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sentiment.topBearish.length > 0 && (
                <div className="bg-[#0f0f0f] border border-red-500/10 rounded-xl p-3">
                  <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingDown size={11} /> Bearish Signals
                  </p>
                  <ul className="space-y-2">
                    {sentiment.topBearish.map((h, i) => (
                      <li key={i}>
                        <a href={h.url} target="_blank" rel="noreferrer"
                          className="flex items-start gap-2 rounded-lg p-1.5 hover:bg-red-500/5 transition-colors group">
                          <span className="text-red-500 text-[10px] mt-0.5 shrink-0">▼</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-gray-300 text-[11px] leading-snug line-clamp-2 group-hover:text-white transition-colors">{h.title}</p>
                            <p className="text-gray-600 text-[10px] mt-0.5">{h.source} · {h.time}</p>
                          </div>
                          <ExternalLink size={10} className="text-gray-700 group-hover:text-red-400 transition-colors shrink-0 mt-0.5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {sentiment.topBullish.length === 0 && sentiment.topBearish.length === 0 && (
                <div className="sm:col-span-2 flex items-center gap-2 px-3 py-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl">
                  <Newspaper size={14} className="text-gray-600 shrink-0" />
                  <p className="text-gray-500 text-xs">No strong directional signals found in recent headlines.</p>
                </div>
              )}
            </div>

            {/* Sentiment-based strategy recommendations */}
            <div className="border-t border-[#2a2a2a] pt-4">
              <p className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
                <Zap size={13} className="text-yellow-400" />
                Sentiment-Driven Strategy Recommendations
              </p>
              <p className="text-gray-500 text-xs mb-3">
                Based on <span className={sentiment.label === 'Bullish' ? 'text-green-400' : sentiment.label === 'Bearish' ? 'text-red-400' : 'text-gray-300'}>{sentiment.strength.toLowerCase()} {sentiment.label.toLowerCase()}</span> sentiment · {hvLevel} IV environment
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sentStrategies.map((id, i) => {
                  const s = OPTION_STRATEGIES.find(o => o.id === id);
                  if (!s) return null;
                  const dirColor = s.direction === 'bullish' ? 'text-green-400 bg-green-500/10'
                    : s.direction === 'bearish' ? 'text-red-400 bg-red-500/10'
                    : 'text-indigo-400 bg-indigo-500/10';
                  return (
                    <div key={id} className="p-3 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-yellow-400 shrink-0">{i === 0 ? '★ Best Fit' : `#${i + 1}`}</span>
                        <span className="text-white text-xs font-semibold">{s.name}</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${dirColor}`}>{s.direction}</span>
                      </div>
                      <p className="text-gray-400 text-[11px] leading-relaxed mb-1.5">{s.desc}</p>
                      <p className={`text-[10px] ${s.riskColor}`}>Risk: {s.risk}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
