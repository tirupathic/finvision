import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ComposedChart, Bar, Line, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, Minus, BarChart2, Zap, RefreshCw, Layers, Activity,
  Cpu, MessageCircle, TrendingDown, Newspaper, ExternalLink, ChevronRight,
} from 'lucide-react';
import { useChart, useNews } from '../hooks/useYahoo';

// ─── Constants ────────────────────────────────────────────────────────────────

const POPULAR = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'META', 'AMZN', 'GOOGL', 'SPY', 'QQQ', 'AMD'];

const DAY_STRATEGIES = [
  { id: 'ma',       label: 'MA Crossover',   subtitle: '50/200-day SMA',       icon: TrendingUp, risk: 'Medium', minDays: 200,
    desc: 'Golden cross (50>200) = BUY; death cross = SELL. Classic long-term trend filter.' },
  { id: 'rsi',      label: 'RSI Reversion',  subtitle: 'RSI < 35 / > 65',      icon: RefreshCw,  risk: 'Medium', minDays: 16,
    desc: 'Oversold (RSI<35) = BUY; overbought (RSI>65) = SELL. Mean-reversion fade strategy.' },
  { id: 'momentum', label: 'Momentum',       subtitle: '20-day % change',       icon: Zap,        risk: 'High',   minDays: 21,
    desc: '>5% gain = BUY; >5% loss = SELL. Trend-following, rides existing price moves.' },
  { id: 'mean',     label: 'Mean Reversion', subtitle: '30-day Z-score',        icon: Minus,      risk: 'Low',    minDays: 30,
    desc: 'Z-score < -1.5 (cheap) = BUY; Z > 1.5 (expensive) = SELL.' },
  { id: 'macd',     label: 'MACD',           subtitle: '12/26/9 EMA histogram', icon: BarChart2,  risk: 'Medium', minDays: 35,
    desc: 'Histogram turns positive = BUY; turns negative = SELL. Momentum confirmation.' },
  { id: 'ema',      label: 'EMA Crossover',  subtitle: 'EMA9/20 + EMA50 filter', icon: Activity, risk: 'Low',    minDays: 50,
    desc: 'EMA9 > EMA20 and price > EMA50 = BUY. Triple trend confirmation.' },
];

const OPTION_STRATEGIES = [
  { id: 'long_call',   name: 'Long Call',        direction: 'bullish', ivPref: 'low',  risk: 'Limited (premium)', riskColor: 'text-yellow-400',
    desc: 'Buy ATM call. Profits from upside move with defined, limited risk.' },
  { id: 'bull_spread', name: 'Bull Call Spread',  direction: 'bullish', ivPref: 'any', risk: 'Limited (debit)',   riskColor: 'text-green-400',
    desc: 'Buy ATM call, sell 5% OTM call. Cheaper directional bet with capped upside.' },
  { id: 'long_put',    name: 'Long Put',           direction: 'bearish', ivPref: 'low',  risk: 'Limited (premium)', riskColor: 'text-yellow-400',
    desc: 'Buy ATM put. Profits from downside or as a hedge against long stock.' },
  { id: 'bear_spread', name: 'Bear Put Spread',    direction: 'bearish', ivPref: 'any', risk: 'Limited (debit)',   riskColor: 'text-green-400',
    desc: 'Buy ATM put, sell 5% OTM put. Cheaper bearish bet with capped downside capture.' },
  { id: 'straddle',    name: 'Long Straddle',      direction: 'neutral', ivPref: 'low',  risk: 'Limited (2× prem)', riskColor: 'text-yellow-400',
    desc: 'Buy ATM call + put. Profits from any large move in either direction.' },
  { id: 'iron_condor', name: 'Iron Condor',        direction: 'neutral', ivPref: 'high', risk: 'Limited (wings)',   riskColor: 'text-green-400',
    desc: 'Sell ±5% strangles, buy ±10% wings. Earns premium in calm, range-bound markets.' },
];

const EXPIRY_OPTIONS = [
  { id: 'weekly',    label: 'Weekly',    dte: '5–7 DTE'   },
  { id: 'biweekly',  label: '2 Weeks',  dte: '14 DTE'    },
  { id: 'monthly',   label: 'Monthly',  dte: '21–30 DTE' },
  { id: 'quarterly', label: 'Quarterly',dte: '60–90 DTE' },
  { id: 'leaps',     label: 'LEAPS',    dte: '180+ DTE'  },
];

const OPT_ROLL_WINDOWS     = ['7D', '14D', '30D', '90D'];
const OPT_ROLL_WINDOW_DAYS = { '7D': 7, '14D': 14, '30D': 30, '90D': 90 };

const EXPIRY_SETUP = {
  weekly:    { long_call: 'Needs a sharp move immediately — theta burns fastest at weekly expiry.', bull_spread: "Sell the spread at 5–7 DTE. Rapid theta decay favors the seller.", long_put: 'Needs a sharp drop fast — theta is the biggest enemy.', bear_spread: 'Sell at 5–7 DTE. IV crush accelerates profit quickly.', straddle: 'Enter 1 day before catalyst. Needs move > combined premium.', iron_condor: 'Ideal for weekly — theta decays rapidly and the profit zone is wide.' },
  biweekly:  { long_call: 'Buy ATM call at 14 DTE. Needs a move within 2 weeks.', bull_spread: 'Sell at 14 DTE. Theta starts accelerating, favoring sellers.', long_put: 'Buy ATM put at 14 DTE. Requires a clear catalyst.', bear_spread: 'Sell at 14 DTE. Good balance of premium and time.', straddle: 'Enter 1–2 days before catalyst. Exit quickly after the move.', iron_condor: 'Sell ±5% strikes at 14 DTE. Theta decay accelerates toward expiry.' },
  monthly:   { long_call: 'Buy ATM call 21–30 DTE. Balanced theta vs enough time to be right.', bull_spread: 'Buy ATM / sell 5% OTM call. Standard 21–30 DTE setup.', long_put: 'Buy ATM put 21–30 DTE. Standard hedge timeframe.', bear_spread: 'Buy ATM / sell 5% OTM put. Standard 21–30 DTE setup.', straddle: 'Enter 3–5 days before catalyst. Exit within 1–2 days after.', iron_condor: 'Sell ±5% strikes, buy ±10% wings. Target 21–30 DTE entry.' },
  quarterly: { long_call: 'Buy ATM or slightly OTM call 60–90 DTE. Ample time for thesis.', bull_spread: 'Wider spread works well at 60–90 DTE — lower theta pressure.', long_put: 'Buy ATM or slightly OTM put 60–90 DTE. Time on your side.', bear_spread: 'Wider spread at 60–90 DTE. Ride the move without excessive theta drag.', straddle: 'Lower daily theta cost — buy 60 DTE and adjust strikes if needed.', iron_condor: 'Use wider strikes at 60–90 DTE to give the stock room to move.' },
  leaps:     { long_call: 'Buy deep ITM or ATM call 180–365 DTE. Leveraged long stock exposure.', bull_spread: 'Wide vertical 180+ DTE. Minimal theta, maximum time to be right.', long_put: 'Buy deep ITM or ATM put 180–365 DTE. Effective long-term hedge.', bear_spread: 'Wide vertical 180+ DTE for a sustained downtrend thesis.', straddle: 'Expensive upfront but virtually no theta risk. Good for macro uncertainty.', iron_condor: 'Less effective at LEAPS — use only with high range-bound conviction.' },
};

// ─── Math helpers ─────────────────────────────────────────────────────────────

function computeSignalFromCloses(id, closes) {
  const n = closes.length;
  if (n < 2) return { signal: 'HOLD', strength: 0, metric: null, label: '' };
  const last = closes[n - 1];
  if (id === 'ma') {
    if (n < 200) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 200 days' };
    const ma50  = closes.slice(-50).reduce((s,v) => s+v, 0) / 50;
    const ma200 = closes.slice(-200).reduce((s,v) => s+v, 0) / 200;
    const diff  = (ma50 - ma200) / ma200 * 100;
    return { signal: ma50>ma200?'BUY':ma50<ma200*0.98?'SELL':'HOLD', strength: Math.min(Math.abs(diff)*10,100), metric: diff, label: `MA50/200: ${diff>=0?'+':''}${diff.toFixed(2)}%` };
  }
  if (id === 'rsi') {
    if (n < 16) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 16 days' };
    const changes = closes.slice(1).map((p,i) => p - closes[i]);
    const recent  = changes.slice(-14);
    const gains   = recent.filter(c=>c>0).reduce((s,c)=>s+c,0)/14;
    const losses  = recent.filter(c=>c<0).reduce((s,c)=>s-c,0)/14;
    const rsi     = losses===0 ? 100 : 100 - 100/(1+gains/losses);
    return { signal: rsi<35?'BUY':rsi>65?'SELL':'HOLD', strength: rsi<35?Math.min((35-rsi)/35*100,100):rsi>65?Math.min((rsi-65)/35*100,100):50, metric: rsi, label: `RSI(14): ${rsi.toFixed(1)}` };
  }
  if (id === 'momentum') {
    if (n < 22) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 21 days' };
    const mom = (last - closes[n-21]) / closes[n-21] * 100;
    return { signal: mom>5?'BUY':mom<-5?'SELL':'HOLD', strength: Math.min(Math.abs(mom)*5,100), metric: mom, label: `20D mom: ${mom>=0?'+':''}${mom.toFixed(2)}%` };
  }
  if (id === 'mean') {
    if (n < 30) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 30 days' };
    const slice = closes.slice(-30);
    const mean  = slice.reduce((s,v)=>s+v,0)/30;
    const sd    = Math.sqrt(slice.reduce((s,v)=>s+(v-mean)**2,0)/29);
    const z     = sd===0 ? 0 : (last-mean)/sd;
    return { signal: z<-1.5?'BUY':z>1.5?'SELL':'HOLD', strength: Math.min(Math.abs(z)*33.3,100), metric: z, label: `Z-score: ${z.toFixed(2)}` };
  }
  if (id === 'macd') {
    if (n < 35) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 35 days' };
    const k12=2/13, k26=2/27, k9=2/10;
    let e12=closes[0], e26=closes[0];
    const macdArr=[];
    for (let i=1;i<n;i++) { e12=closes[i]*k12+e12*(1-k12); e26=closes[i]*k26+e26*(1-k26); macdArr.push(e12-e26); }
    let sig=macdArr[0]; const histArr=[];
    for (const m of macdArr) { sig=m*k9+sig*(1-k9); histArr.push(m-sig); }
    const lh=histArr[histArr.length-1], ph=histArr[histArr.length-2]??0;
    return { signal: lh>0&&ph<=0?'BUY':lh<0&&ph>=0?'SELL':'HOLD', strength: Math.min(Math.abs(lh)*1000,100), metric: lh, label: `MACD hist: ${lh>=0?'+':''}${lh.toFixed(4)}` };
  }
  if (id === 'ema') {
    if (n < 50) return { signal: 'HOLD', strength: 0, metric: null, label: 'Need 50 days' };
    const k9=2/10, k20=2/21, k50=2/51;
    let e9=closes[0], e20=closes[0], e50=closes[0];
    for (let i=1;i<n;i++) { e9=closes[i]*k9+e9*(1-k9); e20=closes[i]*k20+e20*(1-k20); e50=closes[i]*k50+e50*(1-k50); }
    const spread=(e9-e20)/e20*100;
    return { signal: e9>e20&&last>e50?'BUY':e9<e20&&last<e50?'SELL':'HOLD', strength: Math.min(Math.abs(spread)*500,100), metric: spread, label: `EMA9/20: ${spread>=0?'+':''}${spread.toFixed(3)}%` };
  }
  return { signal: 'HOLD', strength: 0, metric: null, label: '' };
}

function computeHV(ohlcv, n=60) {
  const slice = ohlcv.slice(-Math.min(n+1, ohlcv.length));
  if (slice.length < 5) return 0.3;
  const rets = slice.slice(1).map((pt,i) => Math.log(pt.close/slice[i].close));
  const mean = rets.reduce((s,r)=>s+r,0)/rets.length;
  const variance = rets.reduce((s,r)=>s+(r-mean)**2,0)/(rets.length-1);
  return Math.sqrt(variance*252);
}

function normCDF(x) {
  const t=1/(1+0.2316419*Math.abs(x)), d=0.3989423*Math.exp(-x*x/2);
  const p=d*t*(0.3193815+t*(-0.3565638+t*(1.7814779+t*(-1.821256+t*1.3302744))));
  return x>0?1-p:p;
}
function bsCall(S,K,T,sigma,r=0.05) {
  if (T<=0) return Math.max(0,S-K);
  const sq=sigma*Math.sqrt(T), d1=(Math.log(S/K)+(r+sigma*sigma/2)*T)/sq;
  return S*normCDF(d1)-K*Math.exp(-r*T)*normCDF(d1-sq);
}
function bsPut(S,K,T,sigma,r=0.05) {
  if (T<=0) return Math.max(0,K-S);
  const sq=sigma*Math.sqrt(T), d1=(Math.log(S/K)+(r+sigma*sigma/2)*T)/sq;
  return K*Math.exp(-r*T)*normCDF(-(d1-sq))-S*normCDF(-d1);
}

function computeOptStratRolling(ohlcv, strategyId, windowDays, hv) {
  if (!ohlcv||ohlcv.length<=windowDays||hv<=0) return [];
  const T=windowDays/252, r=0.05;
  return ohlcv.slice(0, ohlcv.length-windowDays).map((_, i) => {
    const S0=ohlcv[i].close, S1=ohlcv[i+windowDays].close;
    const stockRet=+((S1-S0)/S0*100).toFixed(2);
    let stratRet=0;
    if (strategyId==='long_call') { const p=bsCall(S0,S0,T,hv,r); stratRet=p>0.01?+((Math.max(0,S1-S0)-p)/p*100).toFixed(2):0; }
    else if (strategyId==='bull_spread') { const K2=S0*1.05, cost=bsCall(S0,S0,T,hv,r)-bsCall(S0,K2,T,hv,r); stratRet=cost>0.01?+((Math.max(0,Math.min(S1-S0,K2-S0))-cost)/cost*100).toFixed(2):0; }
    else if (strategyId==='long_put')   { const p=bsPut(S0,S0,T,hv,r); stratRet=p>0.01?+((Math.max(0,S0-S1)-p)/p*100).toFixed(2):0; }
    else if (strategyId==='bear_spread'){ const K1=S0*0.95, cost=bsPut(S0,S0,T,hv,r)-bsPut(S0,K1,T,hv,r); stratRet=cost>0.01?+((Math.max(0,Math.min(S0-S1,S0-K1))-cost)/cost*100).toFixed(2):0; }
    else if (strategyId==='straddle')   { const cost=bsCall(S0,S0,T,hv,r)+bsPut(S0,S0,T,hv,r); stratRet=cost>0.01?+((Math.abs(S1-S0)-cost)/cost*100).toFixed(2):0; }
    else if (strategyId==='iron_condor'){ const Kpc=S0*0.95,Kpp=S0*0.90,Kcc=S0*1.05,Kcp=S0*1.10; const credit=(bsPut(S0,Kpc,T,hv,r)-bsPut(S0,Kpp,T,hv,r))+(bsCall(S0,Kcc,T,hv,r)-bsCall(S0,Kcp,T,hv,r)); let pnl=credit; if(S1<Kpc) pnl-=Math.min(Kpc-S1,Kpc-Kpp); if(S1>Kcc) pnl-=Math.min(S1-Kcc,Kcp-Kcc); const maxLoss=S0*0.05-credit; stratRet=maxLoss>0.01?+((pnl/maxLoss)*100).toFixed(2):0; }
    return { date: ohlcv[i+windowDays].date, stratRet, stockRet };
  });
}

// Suggest strategies based on conditions
function suggestOptStrategies(trend, hvLevel, expiry) {
  const base = {
    weekly:    { bullish: hvLevel==='high'?['bull_spread','iron_condor']:['bull_spread','straddle'], bearish: hvLevel==='high'?['bear_spread','iron_condor']:['bear_spread','straddle'], neutral: ['iron_condor','straddle'] },
    biweekly:  { bullish: hvLevel==='high'?['bull_spread','iron_condor']:['bull_spread','long_call'], bearish: hvLevel==='high'?['bear_spread','iron_condor']:['bear_spread','long_put'], neutral: ['straddle','iron_condor'] },
    monthly:   { bullish: hvLevel==='low'?['long_call','bull_spread']:['bull_spread','long_call'], bearish: hvLevel==='low'?['long_put','bear_spread']:['bear_spread','long_put'], neutral: hvLevel==='high'?['iron_condor','straddle']:['straddle','iron_condor'] },
    quarterly: { bullish: hvLevel==='high'?['bull_spread','long_call']:['long_call','bull_spread'], bearish: hvLevel==='high'?['bear_spread','long_put']:['long_put','bear_spread'], neutral: hvLevel==='high'?['iron_condor','straddle']:['straddle','long_call'] },
    leaps:     { bullish: ['long_call','bull_spread'], bearish: ['long_put','bear_spread'], neutral: ['straddle','long_call'] },
  };
  return base[expiry]?.[trend] ?? base.monthly[trend] ?? ['straddle','iron_condor'];
}

// Payoff at expiry (per share, contracts multiplied by caller)
function expiryPnl(id, S, S0, hv, T) {
  const r=0.05;
  if (id==='long_call')   { const p=bsCall(S0,S0,T,hv,r); return Math.max(0,S-S0)-p; }
  if (id==='bull_spread') { const K2=S0*1.05, cost=bsCall(S0,S0,T,hv,r)-bsCall(S0,K2,T,hv,r); return Math.max(0,Math.min(S-S0,K2-S0))-cost; }
  if (id==='long_put')    { const p=bsPut(S0,S0,T,hv,r); return Math.max(0,S0-S)-p; }
  if (id==='bear_spread') { const K1=S0*0.95, cost=bsPut(S0,S0,T,hv,r)-bsPut(S0,K1,T,hv,r); return Math.max(0,Math.min(S0-S,S0-K1))-cost; }
  if (id==='straddle')    { const cost=bsCall(S0,S0,T,hv,r)+bsPut(S0,S0,T,hv,r); return Math.abs(S-S0)-cost; }
  if (id==='iron_condor') {
    const Kpc=S0*0.95,Kpp=S0*0.90,Kcc=S0*1.05,Kcp=S0*1.10;
    const credit=(bsPut(S0,Kpc,T,hv,r)-bsPut(S0,Kpp,T,hv,r))+(bsCall(S0,Kcc,T,hv,r)-bsCall(S0,Kcp,T,hv,r));
    let pnl=credit; if(S<Kpc) pnl-=Math.min(Kpc-S,Kpc-Kpp); if(S>Kcc) pnl-=Math.min(S-Kcc,Kcp-Kcc);
    return pnl;
  }
  return 0;
}

// Sentiment helpers
const BULL_RE = /\b(beat|beats|surges?|upgrades?|growth|strong|rally|profits?|gains?|exceeds?|bullish|breakout|momentum|positive|upside|soars?|jumps?|rises?|boosts?|rebounds?|record-high)\b/gi;
const BEAR_RE = /\b(miss|misses|drops?|declines?|falls?|downgrades?|losses?|weak|lower|negative|concerns?|risks?|bearish|warns?|cuts?|layoffs?|lawsuits?|downside|pressure|plunges?|slides?|tumbles?|disappoints?)\b/gi;

function scoreHeadline(title) {
  return { bull: (title.match(BULL_RE)||[]).length, bear: (title.match(BEAR_RE)||[]).length };
}
function analyzeSentiment(news) {
  if (!news.length) return null;
  const scored = news.map(n => { const {bull,bear}=scoreHeadline(n.title); return {...n, bull, bear, net: bull-bear}; });
  const totalNet = scored.reduce((s,v)=>s+v.net,0);
  const score = Math.min(100, Math.max(0, Math.round(50+(totalNet/Math.max(scored.length*2,1))*50)));
  const label = score>=62?'Bullish':score<=38?'Bearish':'Neutral';
  const strength = score>=75||score<=25?'Strong':score>=62||score<=38?'Moderate':'Weak';
  return { score, label, strength,
    bullishCount: scored.filter(s=>s.net>0).length,
    bearishCount: scored.filter(s=>s.net<0).length,
    neutralCount: scored.filter(s=>s.net===0).length,
    topBullish: scored.filter(s=>s.net>0).slice(0,3),
    topBearish: scored.filter(s=>s.net<0).slice(0,3),
    total: scored.length };
}
function getSentimentStrategies(label, hvLevel) {
  if (label==='Bullish') return hvLevel==='high'?['bull_spread','iron_condor']:['long_call','bull_spread'];
  if (label==='Bearish') return hvLevel==='high'?['bear_spread','iron_condor']:['long_put','bear_spread'];
  return hvLevel==='high'?['iron_condor','straddle']:['straddle','iron_condor'];
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function SignalBadge({ signal }) {
  const cls = { BUY: 'bg-green-500/15 text-green-400 border-green-500/20', SELL: 'bg-red-500/15 text-red-400 border-red-500/20', HOLD: 'bg-gray-500/15 text-gray-400 border-gray-500/20' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cls[signal]??cls.HOLD}`}>{signal}</span>;
}

function StrengthBar({ value }) {
  const color = value>=70?'#6366f1':value>=40?'#f59e0b':'#6b7280';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#2a2a2a] rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width:`${value}%`, background: color }} />
      </div>
      <span className="text-[10px] text-gray-500 font-mono w-7 text-right">{value.toFixed(0)}%</span>
    </div>
  );
}

function RollingChart({ data, loading }) {
  const Tip = ({ active, payload }) => {
    if (!active||!payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-mono space-y-0.5">
        <p className="text-gray-400">{d?.date}</p>
        {payload.map(p => { const v=p.value??0; const color=p.dataKey==='stockRet'?'#9ca3af':v>=0?'#6366f1':'#ef4444'; return <p key={p.dataKey} style={{color}}>{p.name}: {v>=0?'+':''}{v.toFixed(2)}%</p>; })}
      </div>
    );
  };
  if (loading) return <div className="bg-[#111] rounded-lg animate-pulse h-44" />;
  if (!data.length) return <p className="text-gray-600 text-sm text-center py-8">Not enough data — try a shorter window</p>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={data} margin={{ top:4, right:0, bottom:0, left:0 }}>
        <XAxis dataKey="date" hide />
        <YAxis tick={{ fill:'#6b7280', fontSize:10 }} axisLine={false} tickLine={false} width={44}
          tickFormatter={v=>`${v>=0?'+':''}${v.toFixed(0)}%`} />
        <ReferenceLine y={0} stroke="#3a3a3a" />
        <Tooltip content={<Tip />} />
        <Bar dataKey="stratRet" name="Strategy" isAnimationActive={false} radius={[2,2,0,0]}>
          {data.map((e,i) => <Cell key={i} fill={e.stratRet>=0?'#6366f1':'#ef4444'} fillOpacity={0.85} />)}
        </Bar>
        <Line type="monotone" dataKey="stockRet" name="Stock" stroke="#9ca3af" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PayoffChart({ points }) {
  if (!points?.length) return null;
  const W=400, H=100;
  const prices=points.map(d=>d.price), pnls=points.map(d=>d.pnl);
  const minP=prices[0], maxP=prices[prices.length-1];
  const minPnl=Math.min(...pnls), maxPnl=Math.max(...pnls);
  const rangeP=maxP-minP||1, rangePnl=maxPnl-minPnl||1;
  const px=p=>((p-minP)/rangeP)*W, py=pnl=>H-((pnl-minPnl)/rangePnl)*H;
  const z=py(0);
  const line=points.map((d,i)=>`${i===0?'M':'L'}${px(d.price).toFixed(1)},${py(d.pnl).toFixed(1)}`).join(' ');
  const pf=`M${px(minP).toFixed(1)},${z.toFixed(1)} `+points.map(d=>`L${px(d.price).toFixed(1)},${Math.min(py(d.pnl),z).toFixed(1)}`).join(' ')+` L${px(maxP).toFixed(1)},${z.toFixed(1)}Z`;
  const lf=`M${px(minP).toFixed(1)},${z.toFixed(1)} `+points.map(d=>`L${px(d.price).toFixed(1)},${Math.max(py(d.pnl),z).toFixed(1)}`).join(' ')+` L${px(maxP).toFixed(1)},${z.toFixed(1)}Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:80}} preserveAspectRatio="none">
      <path d={lf} fill="rgba(239,68,68,0.15)" />
      <path d={pf} fill="rgba(34,197,94,0.15)" />
      <line x1="0" y1={z.toFixed(1)} x2={W} y2={z.toFixed(1)} stroke="#333" strokeWidth="1" />
      <path d={line} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Tab components ───────────────────────────────────────────────────────────

function DayTradingTab({ closes, ohlcv, loading }) {
  const [active, setActive] = useState('rsi');
  const [rollWin, setRollWin] = useState('30D');

  const signals = useMemo(
    () => Object.fromEntries(DAY_STRATEGIES.map(s => [s.id, computeSignalFromCloses(s.id, closes)])),
    [closes],
  );
  const activeMeta = DAY_STRATEGIES.find(s => s.id === active);
  const signal     = signals[active];

  const rollDays = OPT_ROLL_WINDOW_DAYS[rollWin];
  const rollData = useMemo(() => {
    if (!ohlcv?.length || ohlcv.length <= rollDays) return [];
    return ohlcv.slice(0, ohlcv.length - rollDays).map((_, i) => {
      const slice = ohlcv.slice(0, i + 1).map(p => p.close);
      const sig = computeSignalFromCloses(active, slice);
      const S0 = ohlcv[i].close, S1 = ohlcv[i + rollDays].close;
      const stockRet = +((S1 - S0) / S0 * 100).toFixed(2);
      const stratRet = sig.signal === 'BUY'
        ? stockRet
        : sig.signal === 'SELL'
        ? -stockRet
        : 0;
      return { date: ohlcv[i + rollDays].date, stratRet: +stratRet.toFixed(2), stockRet };
    });
  }, [ohlcv, active, rollDays]);

  const riskColor = { Low: 'text-green-400', Medium: 'text-yellow-400', High: 'text-red-400' };

  return (
    <div className="space-y-5">
      {/* Strategy cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {DAY_STRATEGIES.map(s => {
          const sig = closes.length ? signals[s.id] : null;
          const Icon = s.icon;
          const isActive = active === s.id;
          const sigColor = sig?.signal==='BUY'?'text-green-400':sig?.signal==='SELL'?'text-red-400':'text-gray-400';
          return (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`text-left p-3 rounded-xl border transition-all ${
                isActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-[#2a2a2a] bg-[#111] hover:border-indigo-500/40'
              }`}>
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={13} className={isActive ? 'text-indigo-400' : 'text-gray-500'} />
                <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-gray-300'}`}>{s.label}</span>
              </div>
              <p className="text-gray-600 text-[10px] mb-2">{s.subtitle}</p>
              {sig ? (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <SignalBadge signal={sig.signal} />
                    <span className={`text-[10px] font-mono font-semibold ${sigColor}`}>
                      {sig.metric != null ? (sig.metric>=0?'+':'')+sig.metric.toFixed(2) : '—'}
                    </span>
                  </div>
                  <StrengthBar value={sig.strength} />
                </>
              ) : (
                <div className="h-8 bg-[#1a1a1a] rounded animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Active strategy detail */}
      {activeMeta && signal && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2 flex-1">
              <Cpu size={13} className="text-indigo-400" />
              <span className="text-white font-semibold text-sm">{activeMeta.label}</span>
              <SignalBadge signal={signal.signal} />
              <span className={`text-xs font-semibold ${riskColor[activeMeta.risk]}`}>{activeMeta.risk} Risk</span>
            </div>
            <span className="text-gray-500 text-xs font-mono">{signal.label}</span>
          </div>
          <p className="text-gray-400 text-xs leading-relaxed">{activeMeta.desc}</p>
        </div>
      )}

      {/* Rolling performance chart */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-white font-semibold text-sm">{activeMeta?.label} — Simulated Rolling Returns</p>
            <p className="text-gray-600 text-xs mt-0.5">Bars: strategy P&L · Line: stock return · signals computed at each bar</p>
          </div>
          <div className="flex gap-1.5">
            {OPT_ROLL_WINDOWS.map(w => (
              <button key={w} onClick={() => setRollWin(w)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  rollWin===w ? 'bg-indigo-600 text-white' : 'bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>
                {w}
              </button>
            ))}
          </div>
        </div>
        <RollingChart data={rollData} loading={loading} />
      </div>
    </div>
  );
}

function OptionsTab({ ohlcv, hv, trend, hvLevel, loading }) {
  const [expiry,       setExpiry]       = useState('monthly');
  const [activeStrat,  setActiveStrat]  = useState(null);
  const [rollWin,      setRollWin]      = useState('30D');
  const [contracts,    setContracts]    = useState(1);

  const suggestions = useMemo(() => suggestOptStrategies(trend, hvLevel, expiry), [trend, hvLevel, expiry]);
  useEffect(() => { setActiveStrat(s => suggestions.includes(s) ? s : suggestions[0]); }, [suggestions]);

  const price   = ohlcv[ohlcv.length - 1]?.close ?? 0;
  const trendPct = ohlcv.length > 63 ? (price - ohlcv[ohlcv.length-64].close) / ohlcv[ohlcv.length-64].close * 100 : 0;

  const rollDays = OPT_ROLL_WINDOW_DAYS[rollWin];
  const rollData = useMemo(
    () => computeOptStratRolling(ohlcv, activeStrat, rollDays, hv),
    [ohlcv, activeStrat, rollDays, hv],
  );

  // Build payoff chart for active strategy
  const payoffPoints = useMemo(() => {
    if (!activeStrat || !price || !hv) return [];
    const expiryDTE = { weekly:7, biweekly:14, monthly:28, quarterly:75, leaps:252 }[expiry] ?? 28;
    const T = expiryDTE / 252;
    const range = price * 0.25;
    return Array.from({ length: 61 }, (_, i) => {
      const S = price - range + (i / 60) * range * 2;
      return { price: S, pnl: expiryPnl(activeStrat, S, price, hv, T) * 100 * contracts };
    });
  }, [activeStrat, price, hv, expiry, contracts]);

  const builderStats = useMemo(() => {
    if (!payoffPoints.length) return null;
    const pnls = payoffPoints.map(d => d.pnl);
    const maxProfit = Math.max(...pnls), maxLoss = Math.min(...pnls);
    const breakevens = [];
    for (let i = 1; i < payoffPoints.length; i++) {
      if (Math.sign(payoffPoints[i-1].pnl) !== Math.sign(payoffPoints[i].pnl))
        breakevens.push((payoffPoints[i-1].price + payoffPoints[i].price) / 2);
    }
    const rr = maxLoss < 0 ? (maxProfit / Math.abs(maxLoss)).toFixed(2) : '∞';
    return { maxProfit, maxLoss, breakevens, rr };
  }, [payoffPoints]);

  const fmt = v => `$${Math.abs(v).toFixed(2)}`;
  const fmtK = v => v >= 1000 ? `$${(v/1000).toFixed(1)}K` : `$${v.toFixed(0)}`;

  const dirColor = id => {
    const s = OPTION_STRATEGIES.find(o => o.id === id);
    return s?.direction==='bullish'?'text-green-400 bg-green-500/10':s?.direction==='bearish'?'text-red-400 bg-red-500/10':'text-indigo-400 bg-indigo-500/10';
  };

  return (
    <div className="space-y-5">
      {/* Market conditions banner */}
      {ohlcv.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-yellow-400" />
            <span className="text-white text-sm font-semibold">Market Conditions</span>
          </div>
          <div className="flex flex-wrap gap-2 ml-auto">
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${trend==='bullish'?'bg-green-500/10 text-green-400':trend==='bearish'?'bg-red-500/10 text-red-400':'bg-gray-500/10 text-gray-400'}`}>
              {trend} {trendPct>=0?'+':''}{trendPct.toFixed(1)}% (3M)
            </span>
            <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${hvLevel==='high'?'bg-red-500/10 text-red-400':hvLevel==='medium'?'bg-yellow-500/10 text-yellow-400':'bg-green-500/10 text-green-400'}`}>
              HV {(hv*100).toFixed(0)}% · {hvLevel} IV
            </span>
          </div>
        </div>
      )}

      {/* Expiry selector */}
      <div className="flex flex-wrap gap-2">
        {EXPIRY_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => setExpiry(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              expiry===opt.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40'
            }`}>
            {opt.label}
            <span className={`text-[10px] ${expiry===opt.id?'text-indigo-200':'text-gray-600'}`}>{opt.dte}</span>
          </button>
        ))}
      </div>

      {/* Strategy cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="h-32 bg-[#111] rounded-xl animate-pulse" />
          <div className="h-32 bg-[#111] rounded-xl animate-pulse" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestions.map((id, i) => {
            const s = OPTION_STRATEGIES.find(o => o.id === id);
            if (!s) return null;
            const isActive = activeStrat === id;
            const setup = EXPIRY_SETUP[expiry]?.[id] ?? '';
            return (
              <button key={id} onClick={() => setActiveStrat(id)}
                className={`text-left p-4 rounded-xl border transition-all ${
                  isActive ? 'border-indigo-500 bg-indigo-500/8 ring-1 ring-indigo-500/20' : 'border-[#2a2a2a] bg-[#111] hover:border-indigo-500/30'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-yellow-400">{i===0?'★ Best Fit':`#${i+1}`}</span>
                  <span className="text-white text-sm font-semibold">{s.name}</span>
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${dirColor(id)}`}>{s.direction}</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed mb-2">{s.desc}</p>
                {setup && <p className="text-gray-600 text-[10px] leading-relaxed border-t border-[#2a2a2a] pt-2">{setup}</p>}
                <p className={`text-[10px] mt-2 ${s.riskColor}`}>Risk: {s.risk}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Payoff builder */}
      {activeStrat && builderStats && price > 0 && (
        <div className="bg-[#1a1a1a] border border-indigo-500/25 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-semibold text-sm flex items-center gap-2">
              <BarChart2 size={14} className="text-indigo-400" />
              {OPTION_STRATEGIES.find(o=>o.id===activeStrat)?.name} — Payoff at Expiry
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Contracts</span>
              <input type="number" min="1" max="50" value={contracts}
                onChange={e => setContracts(Math.max(1, parseInt(e.target.value)||1))}
                className="bg-[#111] border border-[#2a2a2a] text-white text-sm rounded-lg px-2 py-1 w-14 text-center focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-[#111] rounded-xl p-3">
              <p className="text-gray-600 text-[10px] mb-1">Entry at {price>0?`$${price.toFixed(2)}`:''}</p>
              <p className="text-white text-sm font-bold font-mono">ATM Strikes</p>
              <p className="text-gray-600 text-[10px] mt-0.5">HV {(hv*100).toFixed(0)}% proxy IV</p>
            </div>
            <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
              <p className="text-green-700 text-[10px] mb-1">Max Profit</p>
              <p className="text-green-400 text-lg font-bold font-mono">
                {!isFinite(builderStats.maxProfit)?'∞':fmtK(builderStats.maxProfit)}
              </p>
              <p className="text-gray-700 text-[10px]">{contracts}× contract</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
              <p className="text-red-700 text-[10px] mb-1">Max Loss</p>
              <p className="text-red-400 text-lg font-bold font-mono">
                {!isFinite(builderStats.maxLoss)?'-∞':fmtK(Math.abs(builderStats.maxLoss))}
              </p>
              <p className="text-gray-700 text-[10px]">{contracts}× contract</p>
            </div>
            <div className="bg-[#111] rounded-xl p-3">
              <p className="text-gray-600 text-[10px] mb-1">Reward / Risk</p>
              <p className="text-white text-lg font-bold font-mono">{builderStats.rr}×</p>
              {builderStats.breakevens.length > 0 && (
                <p className="text-gray-700 text-[10px] mt-0.5 font-mono">
                  BE: {builderStats.breakevens.map(b=>`$${b.toFixed(0)}`).join(' / ')}
                </p>
              )}
            </div>
          </div>

          <div className="bg-[#111] rounded-xl p-3">
            <div className="flex justify-between text-[10px] text-gray-600 mb-1">
              <span className="flex items-center gap-1 text-green-400"><span className="w-2 h-1 bg-green-500/50 rounded-full inline-block" /> Profit</span>
              <span className="text-gray-600">← stock price at expiry →</span>
              <span className="flex items-center gap-1 text-red-400"><span className="w-2 h-1 bg-red-500/50 rounded-full inline-block" /> Loss</span>
            </div>
            <PayoffChart points={payoffPoints} />
            <div className="flex justify-between text-[9px] text-gray-700 mt-1 font-mono">
              <span>${payoffPoints[0]?.price.toFixed(0)}</span>
              <span>${payoffPoints[Math.floor(payoffPoints.length/2)]?.price.toFixed(0)} (current)</span>
              <span>${payoffPoints[payoffPoints.length-1]?.price.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Rolling returns */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-white text-sm font-semibold">
              {OPTION_STRATEGIES.find(o=>o.id===activeStrat)?.name ?? '—'} — Rolling {rollWin} Returns
            </p>
            <p className="text-gray-600 text-xs mt-0.5">Bars: strategy P&L as % of cost · Line: stock return</p>
          </div>
          <div className="flex gap-1.5">
            {OPT_ROLL_WINDOWS.map(w => (
              <button key={w} onClick={() => setRollWin(w)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  rollWin===w ? 'bg-indigo-600 text-white' : 'bg-[#111] border border-[#2a2a2a] text-gray-400 hover:text-white'
                }`}>
                {w}
              </button>
            ))}
          </div>
        </div>
        <RollingChart data={rollData} loading={loading} />
      </div>
    </div>
  );
}

function SentimentTab({ news, newsLoading, hvLevel, symbol }) {
  const sentiment      = useMemo(() => analyzeSentiment(news), [news]);
  const sentStrategies = useMemo(() => sentiment ? getSentimentStrategies(sentiment.label, hvLevel) : [], [sentiment, hvLevel]);

  if (newsLoading) {
    return <div className="space-y-3">{[...Array(4)].map((_,i)=><div key={i} className="h-10 bg-[#111] rounded-lg animate-pulse" />)}</div>;
  }
  if (!sentiment) {
    return <p className="text-gray-600 text-sm text-center py-12">No news data for {symbol}</p>;
  }

  return (
    <div className="space-y-5">
      {/* Score card */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {sentiment.label==='Bullish' ? <TrendingUp size={16} className="text-green-400" /> : sentiment.label==='Bearish' ? <TrendingDown size={16} className="text-red-400" /> : <Minus size={16} className="text-gray-400" />}
            <span className={`text-lg font-bold ${sentiment.label==='Bullish'?'text-green-400':sentiment.label==='Bearish'?'text-red-400':'text-gray-300'}`}>
              {sentiment.strength} {sentiment.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-white font-bold font-mono text-xl">{sentiment.score}</p>
            <p className="text-gray-600 text-[10px]">/ 100</p>
          </div>
        </div>

        <div className="relative h-3 bg-[#2a2a2a] rounded-full overflow-hidden mb-3">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-red-500/40 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-green-500/40 to-transparent" />
          <div className="absolute top-0 h-full w-1 bg-white rounded-full shadow transition-all duration-500" style={{ left:`calc(${sentiment.score}% - 2px)` }} />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-green-500/10 text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />{sentiment.bullishCount} Bullish</span>
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{sentiment.bearishCount} Bearish</span>
          <span className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />{sentiment.neutralCount} Neutral</span>
          <span className="ml-auto text-gray-600 text-[10px] self-center">{sentiment.total} headlines</span>
        </div>
      </div>

      {/* Headlines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sentiment.topBullish.length > 0 && (
          <div className="bg-[#111] border border-green-500/10 rounded-xl p-4">
            <p className="text-green-400 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingUp size={11} /> Bullish Signals</p>
            <ul className="space-y-2">
              {sentiment.topBullish.map((h,i) => (
                <li key={i}>
                  <a href={h.url} target="_blank" rel="noreferrer"
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-green-500/5 transition-colors group">
                    <span className="text-green-500 text-[10px] mt-0.5 shrink-0">▲</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-300 text-[11px] leading-snug line-clamp-2 group-hover:text-white transition-colors">{h.title}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{h.source}</p>
                    </div>
                    <ExternalLink size={10} className="text-gray-700 group-hover:text-green-400 transition-colors shrink-0 mt-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {sentiment.topBearish.length > 0 && (
          <div className="bg-[#111] border border-red-500/10 rounded-xl p-4">
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"><TrendingDown size={11} /> Bearish Signals</p>
            <ul className="space-y-2">
              {sentiment.topBearish.map((h,i) => (
                <li key={i}>
                  <a href={h.url} target="_blank" rel="noreferrer"
                    className="flex items-start gap-2 p-2 rounded-lg hover:bg-red-500/5 transition-colors group">
                    <span className="text-red-500 text-[10px] mt-0.5 shrink-0">▼</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-300 text-[11px] leading-snug line-clamp-2 group-hover:text-white transition-colors">{h.title}</p>
                      <p className="text-gray-600 text-[10px] mt-0.5">{h.source}</p>
                    </div>
                    <ExternalLink size={10} className="text-gray-700 group-hover:text-red-400 transition-colors shrink-0 mt-0.5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!sentiment.topBullish.length && !sentiment.topBearish.length && (
          <div className="sm:col-span-2 flex items-center gap-2 p-4 bg-[#111] border border-[#2a2a2a] rounded-xl">
            <Newspaper size={14} className="text-gray-600 shrink-0" />
            <p className="text-gray-500 text-xs">No strong directional signals in recent headlines.</p>
          </div>
        )}
      </div>

      {/* Sentiment-driven recommendations */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
        <p className="text-white text-sm font-semibold mb-1 flex items-center gap-2">
          <Zap size={13} className="text-yellow-400" />
          Sentiment-Driven Strategy Picks
        </p>
        <p className="text-gray-500 text-xs mb-4">
          Based on <span className={sentiment.label==='Bullish'?'text-green-400':sentiment.label==='Bearish'?'text-red-400':'text-gray-300'}>{sentiment.strength.toLowerCase()} {sentiment.label.toLowerCase()}</span> sentiment
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sentStrategies.map((id, i) => {
            const s = OPTION_STRATEGIES.find(o => o.id === id);
            if (!s) return null;
            const dirColor = s.direction==='bullish'?'text-green-400 bg-green-500/10':s.direction==='bearish'?'text-red-400 bg-red-500/10':'text-indigo-400 bg-indigo-500/10';
            return (
              <div key={id} className="p-3 rounded-lg border border-[#2a2a2a] bg-[#0f0f0f]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-yellow-400">{i===0?'★ Best Fit':`#${i+1}`}</span>
                  <span className="text-white text-xs font-semibold">{s.name}</span>
                  <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded-full ${dirColor}`}>{s.direction}</span>
                </div>
                <p className="text-gray-400 text-[11px] leading-relaxed mb-1.5">{s.desc}</p>
                <p className={`text-[10px] ${s.riskColor}`}>Risk: {s.risk}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'day',       label: 'Day Trading',   icon: Activity },
  { id: 'options',   label: 'Options',       icon: Layers },
  { id: 'sentiment', label: 'Sentiment',     icon: MessageCircle },
];

export default function Strategies() {
  const [symbol, setSymbol] = useState('AAPL');
  const [input,  setInput]  = useState('');
  const [tab,    setTab]    = useState('day');

  const { data: chart, loading }                      = useChart(symbol, '1d', '2y');
  const { data: news = [], loading: newsLoading }     = useNews(symbol, 20);
  const ohlcv  = chart?.ohlcv ?? [];
  const closes = useMemo(() => ohlcv.map(p => p.close), [ohlcv]);

  const hv       = useMemo(() => computeHV(ohlcv), [ohlcv]);
  const trendPct = useMemo(() => {
    if (ohlcv.length < 64) return 0;
    return (ohlcv[ohlcv.length-1].close - ohlcv[ohlcv.length-64].close) / ohlcv[ohlcv.length-64].close * 100;
  }, [ohlcv]);
  const trend   = trendPct > 5 ? 'bullish' : trendPct < -5 ? 'bearish' : 'neutral';
  const hvLevel = hv > 0.40 ? 'high' : hv > 0.20 ? 'medium' : 'low';

  function commit(sym) {
    const s = sym.trim().toUpperCase();
    if (s) { setSymbol(s); setInput(''); }
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Trading Strategies</h1>
          <p className="text-gray-500 text-sm mt-0.5">Live signals, options analysis & sentiment — all from real market data</p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <input value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key==='Enter' && commit(input)}
            placeholder="Symbol…"
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 w-28 focus:outline-none focus:border-indigo-500 placeholder-gray-600 uppercase font-mono"
          />
          <button onClick={() => commit(input)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors font-medium">
            Analyze
          </button>
        </div>
      </div>

      {/* Symbol chips + active symbol bar */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {POPULAR.map(s => (
          <button key={s} onClick={() => setSymbol(s)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
              symbol===s ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {chart && (
        <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-[#111] border border-[#2a2a2a] rounded-xl">
          <span className="text-white font-bold">{chart.name || symbol}</span>
          {chart.price != null && <span className="text-gray-200 font-mono text-sm">${chart.price.toFixed(2)}</span>}
          {chart.pct  != null && (
            <span className={`text-sm font-mono ${chart.pct>=0?'text-green-400':'text-red-400'}`}>
              {chart.pct>=0?'+':''}{chart.pct.toFixed(2)}%
            </span>
          )}
          <span className="text-gray-600 text-xs">· {ohlcv.length} trading days</span>
          <div className="flex gap-2 ml-auto">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${trend==='bullish'?'bg-green-500/10 text-green-400':trend==='bearish'?'bg-red-500/10 text-red-400':'bg-gray-500/10 text-gray-400'}`}>
              {trend} {trendPct>=0?'+':''}{trendPct.toFixed(1)}%
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${hvLevel==='high'?'bg-red-500/10 text-red-400':hvLevel==='medium'?'bg-yellow-500/10 text-yellow-400':'bg-green-500/10 text-green-400'}`}>
              HV {(hv*100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2a2a2a] mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab===id ? 'border-indigo-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab==='day'       && <DayTradingTab closes={closes} ohlcv={ohlcv} loading={loading} />}
      {tab==='options'   && <OptionsTab    ohlcv={ohlcv} hv={hv} trend={trend} hvLevel={hvLevel} loading={loading} />}
      {tab==='sentiment' && <SentimentTab  news={news} newsLoading={newsLoading} hvLevel={hvLevel} symbol={symbol} />}
    </div>
  );
}
