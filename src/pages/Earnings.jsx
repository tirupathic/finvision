import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, Zap, BarChart2, Clock, Info, Globe, HelpCircle, X } from 'lucide-react';
import { useEarningsCalendar, useChart, useEarnings, useSummary, useQuote } from '../hooks/useYahoo';
import { colorClass, fmt$, formatMarketCap } from '../services/yahooApi';

// ── Date helpers ──────────────────────────────────────────────────────────────

function getWeekDays(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      iso:     d.toISOString().slice(0, 10),
      label:   d.toLocaleDateString('en-US', { weekday: 'short' }),
      num:     d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      isToday: d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
    };
  });
}

// ── Economic Calendar data ────────────────────────────────────────────────────

const ECONOMIC_EVENTS = [
  // May 2026
  { date: '2026-05-05', time: '2:00 PM ET',  name: 'FOMC Meeting Day 1',          category: 'Fed Policy',   importance: 'High',   forecast: null,           previous: '4.25–4.50%' },
  { date: '2026-05-06', time: '2:00 PM ET',  name: 'FOMC Rate Decision',          category: 'Fed Policy',   importance: 'High',   forecast: '4.25–4.50%',   previous: '4.25–4.50%' },
  { date: '2026-05-06', time: '2:30 PM ET',  name: 'Fed Chair Press Conference',  category: 'Fed Policy',   importance: 'High',   forecast: null,           previous: null },
  { date: '2026-05-08', time: '8:30 AM ET',  name: 'Nonfarm Payrolls',            category: 'Employment',   importance: 'High',   forecast: '+185K',        previous: '+228K' },
  { date: '2026-05-08', time: '8:30 AM ET',  name: 'Unemployment Rate',           category: 'Employment',   importance: 'High',   forecast: '4.1%',         previous: '4.2%' },
  { date: '2026-05-08', time: '8:30 AM ET',  name: 'Avg Hourly Earnings (MoM)',   category: 'Employment',   importance: 'Medium', forecast: '+0.3%',        previous: '+0.3%' },
  { date: '2026-05-13', time: '8:30 AM ET',  name: 'CPI (MoM)',                   category: 'Inflation',    importance: 'High',   forecast: '+0.3%',        previous: '+0.2%' },
  { date: '2026-05-13', time: '8:30 AM ET',  name: 'Core CPI (YoY)',              category: 'Inflation',    importance: 'High',   forecast: '+3.1%',        previous: '+3.0%' },
  { date: '2026-05-14', time: '8:30 AM ET',  name: 'PPI (MoM)',                   category: 'Inflation',    importance: 'Medium', forecast: '+0.2%',        previous: '+0.1%' },
  { date: '2026-05-15', time: '8:30 AM ET',  name: 'Retail Sales (MoM)',          category: 'Consumer',     importance: 'Medium', forecast: '+0.4%',        previous: '+0.6%' },
  { date: '2026-05-15', time: '8:30 AM ET',  name: 'Initial Jobless Claims',      category: 'Employment',   importance: 'Medium', forecast: '215K',         previous: '220K' },
  { date: '2026-05-16', time: '10:00 AM ET', name: 'Consumer Sentiment (UoM)',    category: 'Consumer',     importance: 'Low',    forecast: '72.0',         previous: '71.5' },
  { date: '2026-05-22', time: '8:30 AM ET',  name: 'Initial Jobless Claims',      category: 'Employment',   importance: 'Medium', forecast: '213K',         previous: '215K' },
  { date: '2026-05-22', time: '10:00 AM ET', name: 'Existing Home Sales',         category: 'Housing',      importance: 'Low',    forecast: '4.10M',        previous: '4.02M' },
  { date: '2026-05-27', time: '10:00 AM ET', name: 'Consumer Confidence (CB)',    category: 'Consumer',     importance: 'Medium', forecast: '98.5',         previous: '97.2' },
  { date: '2026-05-27', time: '10:00 AM ET', name: 'New Home Sales',              category: 'Housing',      importance: 'Low',    forecast: '685K',         previous: '672K' },
  { date: '2026-05-29', time: '8:30 AM ET',  name: 'GDP (Q1 2nd Estimate)',       category: 'Growth',       importance: 'High',   forecast: '+2.2%',        previous: '+2.4%' },
  { date: '2026-05-30', time: '8:30 AM ET',  name: 'PCE Price Index (MoM)',       category: 'Inflation',    importance: 'High',   forecast: '+0.3%',        previous: '+0.3%' },
  { date: '2026-05-30', time: '8:30 AM ET',  name: 'Core PCE (YoY)',              category: 'Inflation',    importance: 'High',   forecast: '+2.6%',        previous: '+2.6%' },
  // June 2026
  { date: '2026-06-02', time: '10:00 AM ET', name: 'ISM Manufacturing PMI',       category: 'Manufacturing',importance: 'Medium', forecast: '49.5',         previous: '49.0' },
  { date: '2026-06-04', time: '10:00 AM ET', name: 'ISM Services PMI',            category: 'Services',     importance: 'Medium', forecast: '51.2',         previous: '50.8' },
  { date: '2026-06-05', time: '8:30 AM ET',  name: 'Nonfarm Payrolls',            category: 'Employment',   importance: 'High',   forecast: '+175K',        previous: '+185K' },
  { date: '2026-06-05', time: '8:30 AM ET',  name: 'Unemployment Rate',           category: 'Employment',   importance: 'High',   forecast: '4.1%',         previous: '4.1%' },
  { date: '2026-06-10', time: '8:30 AM ET',  name: 'CPI (MoM)',                   category: 'Inflation',    importance: 'High',   forecast: '+0.2%',        previous: '+0.3%' },
  { date: '2026-06-10', time: '8:30 AM ET',  name: 'Core CPI (YoY)',              category: 'Inflation',    importance: 'High',   forecast: '+3.0%',        previous: '+3.1%' },
  { date: '2026-06-11', time: '8:30 AM ET',  name: 'PPI (MoM)',                   category: 'Inflation',    importance: 'Medium', forecast: '+0.2%',        previous: '+0.2%' },
  { date: '2026-06-12', time: '8:30 AM ET',  name: 'Initial Jobless Claims',      category: 'Employment',   importance: 'Medium', forecast: '218K',         previous: '213K' },
  { date: '2026-06-16', time: '8:30 AM ET',  name: 'Retail Sales (MoM)',          category: 'Consumer',     importance: 'Medium', forecast: '+0.3%',        previous: '+0.4%' },
  { date: '2026-06-17', time: '2:00 PM ET',  name: 'FOMC Rate Decision',          category: 'Fed Policy',   importance: 'High',   forecast: '4.00–4.25%',   previous: '4.25–4.50%' },
  { date: '2026-06-17', time: '2:30 PM ET',  name: 'Fed Chair Press Conference',  category: 'Fed Policy',   importance: 'High',   forecast: null,           previous: null },
  { date: '2026-06-19', time: '8:30 AM ET',  name: 'Initial Jobless Claims',      category: 'Employment',   importance: 'Medium', forecast: '216K',         previous: '218K' },
  { date: '2026-06-24', time: '10:00 AM ET', name: 'Consumer Confidence (CB)',    category: 'Consumer',     importance: 'Medium', forecast: '99.0',         previous: '98.5' },
  { date: '2026-06-26', time: '8:30 AM ET',  name: 'GDP (Q1 3rd Estimate)',       category: 'Growth',       importance: 'Medium', forecast: '+2.1%',        previous: '+2.2%' },
  { date: '2026-06-27', time: '8:30 AM ET',  name: 'PCE Price Index (MoM)',       category: 'Inflation',    importance: 'High',   forecast: '+0.2%',        previous: '+0.3%' },
  { date: '2026-06-27', time: '8:30 AM ET',  name: 'Core PCE (YoY)',              category: 'Inflation',    importance: 'High',   forecast: '+2.5%',        previous: '+2.6%' },
  // July 2026
  { date: '2026-07-01', time: '10:00 AM ET', name: 'ISM Manufacturing PMI',       category: 'Manufacturing',importance: 'Medium', forecast: '50.0',         previous: '49.5' },
  { date: '2026-07-03', time: '10:00 AM ET', name: 'ISM Services PMI',            category: 'Services',     importance: 'Medium', forecast: '51.5',         previous: '51.2' },
  { date: '2026-07-10', time: '8:30 AM ET',  name: 'Nonfarm Payrolls',            category: 'Employment',   importance: 'High',   forecast: '+180K',        previous: '+175K' },
  { date: '2026-07-10', time: '8:30 AM ET',  name: 'Unemployment Rate',           category: 'Employment',   importance: 'High',   forecast: '4.0%',         previous: '4.1%' },
  { date: '2026-07-14', time: '8:30 AM ET',  name: 'CPI (MoM)',                   category: 'Inflation',    importance: 'High',   forecast: '+0.2%',        previous: '+0.2%' },
  { date: '2026-07-14', time: '8:30 AM ET',  name: 'Core CPI (YoY)',              category: 'Inflation',    importance: 'High',   forecast: '+2.9%',        previous: '+3.0%' },
  { date: '2026-07-15', time: '8:30 AM ET',  name: 'PPI (MoM)',                   category: 'Inflation',    importance: 'Medium', forecast: '+0.1%',        previous: '+0.2%' },
  { date: '2026-07-16', time: '8:30 AM ET',  name: 'Initial Jobless Claims',      category: 'Employment',   importance: 'Medium', forecast: '210K',         previous: '215K' },
  { date: '2026-07-17', time: '8:30 AM ET',  name: 'Retail Sales (MoM)',          category: 'Consumer',     importance: 'Medium', forecast: '+0.3%',        previous: '+0.3%' },
  { date: '2026-07-17', time: '10:00 AM ET', name: 'Consumer Sentiment (UoM)',    category: 'Consumer',     importance: 'Low',    forecast: '73.5',         previous: '72.0' },
  { date: '2026-07-25', time: '10:00 AM ET', name: 'Consumer Confidence (CB)',    category: 'Consumer',     importance: 'Medium', forecast: '100.0',        previous: '99.0' },
  { date: '2026-07-28', time: '2:00 PM ET',  name: 'FOMC Rate Decision',          category: 'Fed Policy',   importance: 'High',   forecast: '4.00–4.25%',   previous: '4.00–4.25%' },
  { date: '2026-07-28', time: '2:30 PM ET',  name: 'Fed Chair Press Conference',  category: 'Fed Policy',   importance: 'High',   forecast: null,           previous: null },
  { date: '2026-07-30', time: '8:30 AM ET',  name: 'GDP (Q2 Advance Estimate)',   category: 'Growth',       importance: 'High',   forecast: '+2.5%',        previous: '+2.1%' },
  { date: '2026-07-31', time: '8:30 AM ET',  name: 'PCE Price Index (MoM)',       category: 'Inflation',    importance: 'High',   forecast: '+0.2%',        previous: '+0.2%' },
  { date: '2026-07-31', time: '8:30 AM ET',  name: 'Core PCE (YoY)',              category: 'Inflation',    importance: 'High',   forecast: '+2.4%',        previous: '+2.5%' },
  // August 2026
  { date: '2026-08-05', time: '10:00 AM ET', name: 'ISM Services PMI',            category: 'Services',     importance: 'Medium', forecast: '51.8',         previous: '51.5' },
  { date: '2026-08-07', time: '8:30 AM ET',  name: 'Nonfarm Payrolls',            category: 'Employment',   importance: 'High',   forecast: '+190K',        previous: '+180K' },
  { date: '2026-08-07', time: '8:30 AM ET',  name: 'Unemployment Rate',           category: 'Employment',   importance: 'High',   forecast: '4.0%',         previous: '4.0%' },
  { date: '2026-08-12', time: '8:30 AM ET',  name: 'CPI (MoM)',                   category: 'Inflation',    importance: 'High',   forecast: '+0.2%',        previous: '+0.2%' },
  { date: '2026-08-12', time: '8:30 AM ET',  name: 'Core CPI (YoY)',              category: 'Inflation',    importance: 'High',   forecast: '+2.8%',        previous: '+2.9%' },
  { date: '2026-08-13', time: '8:30 AM ET',  name: 'PPI (MoM)',                   category: 'Inflation',    importance: 'Medium', forecast: '+0.1%',        previous: '+0.1%' },
  { date: '2026-08-14', time: '8:30 AM ET',  name: 'Initial Jobless Claims',      category: 'Employment',   importance: 'Medium', forecast: '208K',         previous: '210K' },
  { date: '2026-08-15', time: '8:30 AM ET',  name: 'Retail Sales (MoM)',          category: 'Consumer',     importance: 'Medium', forecast: '+0.4%',        previous: '+0.3%' },
  { date: '2026-08-27', time: '10:00 AM ET', name: 'Consumer Confidence (CB)',    category: 'Consumer',     importance: 'Medium', forecast: '101.0',        previous: '100.0' },
  { date: '2026-08-28', time: '8:30 AM ET',  name: 'GDP (Q2 2nd Estimate)',       category: 'Growth',       importance: 'Medium', forecast: '+2.4%',        previous: '+2.5%' },
  { date: '2026-08-29', time: '8:30 AM ET',  name: 'PCE Price Index (MoM)',       category: 'Inflation',    importance: 'High',   forecast: '+0.2%',        previous: '+0.2%' },
];

const IMPORTANCE_CONFIG = {
  High:   { badge: 'text-red-400 bg-red-500/10 border border-red-500/20',    dot: 'bg-red-500',    label: 'High' },
  Medium: { badge: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20', dot: 'bg-yellow-500', label: 'Medium' },
  Low:    { badge: 'text-gray-400 bg-gray-500/10 border border-gray-500/20', dot: 'bg-gray-500',   label: 'Low' },
};

const CATEGORY_ICONS = {
  'Fed Policy':    '🏦',
  'Inflation':     '📈',
  'Employment':    '👥',
  'Growth':        '📊',
  'Consumer':      '🛒',
  'Manufacturing': '🏭',
  'Services':      '💼',
  'Housing':       '🏠',
};

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

// ── Strategy engine ───────────────────────────────────────────────────────────

function computeAnalysis(chart, earnings) {
  if (!chart?.ohlcv?.length) return null;
  const ohlcv  = chart.ohlcv;
  const price  = chart.price;

  const slice  = ohlcv.slice(-31);
  const logR   = slice.slice(1).map((pt, i) => Math.log(pt.close / slice[i].close));
  if (!logR.length) return null;
  const mean   = logR.reduce((s, v) => s + v, 0) / logR.length;
  const vari   = logR.reduce((s, v) => s + (v - mean) ** 2, 0) / logR.length;
  const hv30   = Math.sqrt(vari * 252) * 100;
  if (!isFinite(hv30) || isNaN(hv30)) return null;

  const expMovePct = (hv30 / Math.sqrt(252)) * 1.5;
  const expMoveAmt = price * expMovePct / 100;

  const trendPct = ((price - ohlcv[0].close) / ohlcv[0].close) * 100;
  const trend    = trendPct > 5 ? 'bullish' : trendPct < -5 ? 'bearish' : 'neutral';

  const ivBucket = hv30 > 40 ? 'high' : hv30 > 22 ? 'medium' : 'low';

  const beats    = (earnings || []).filter(e => e.eps != null && e.eps > 0).length;
  const total    = (earnings || []).filter(e => e.eps != null).length;
  const beatRate = total > 0 ? Math.round((beats / total) * 100) : null;

  return { hv30, expMovePct, expMoveAmt, trend, trendPct, ivBucket, beatRate, total, price };
}

const STRATEGIES = {
  ironCondor: {
    name: 'Iron Condor',
    emoji: '🦅',
    type: 'Neutral',
    risk: 'Low',
    color: '#10b981',
    when: 'High IV, no strong directional bias',
    setup: 'Sell OTM call spread + OTM put spread, both ~1 expected move from price. Use front-week expiry (5–7 DTE).',
    strikes: (p, move) =>
      `Sell ${fmt$(p + move)} call / Buy ${fmt$(p + move * 1.5)} call  •  Sell ${fmt$(p - move)} put / Buy ${fmt$(p - move * 1.5)} put`,
    maxProfit: 'Net credit received',
    maxLoss: 'Width of narrower spread − credit',
    pros: ['Defined risk on both sides', 'Profits from IV crush post-earnings', 'Wide profit zone'],
    cons: ['Capped upside', 'Requires 4 legs (higher commissions)'],
  },
  bullPutSpread: {
    name: 'Bull Put Spread',
    emoji: '📈',
    type: 'Bullish',
    risk: 'Low',
    color: '#22c55e',
    when: 'High IV + bullish bias. Strong beat history.',
    setup: 'Sell OTM put near 1 expected move below price, buy further OTM put 5–10 pts lower. Front-week expiry.',
    strikes: (p, move) =>
      `Sell ${fmt$(p - move)} put / Buy ${fmt$(p - move * 1.5)} put`,
    maxProfit: 'Net credit received',
    maxLoss: 'Spread width − credit',
    pros: ['Defined risk', 'Profits even if stock moves sideways or up', 'IV crush works in your favor'],
    cons: ['Capped profit', 'Stock must stay above short strike'],
  },
  bearCallSpread: {
    name: 'Bear Call Spread',
    emoji: '📉',
    type: 'Bearish',
    risk: 'Low',
    color: '#ef4444',
    when: 'High IV + bearish bias. History of misses.',
    setup: 'Sell OTM call near 1 expected move above price, buy further OTM call 5–10 pts higher. Front-week expiry.',
    strikes: (p, move) =>
      `Sell ${fmt$(p + move)} call / Buy ${fmt$(p + move * 1.5)} call`,
    maxProfit: 'Net credit received',
    maxLoss: 'Spread width − credit',
    pros: ['Defined risk', 'Profits if stock falls or stays flat', 'IV crush is additive'],
    cons: ['Capped profit', 'Stock must stay below short strike'],
  },
  longStraddle: {
    name: 'Long Straddle',
    emoji: '🎯',
    type: 'Volatility',
    risk: 'Medium',
    color: '#6366f1',
    when: 'Low IV — cheap options. Expecting a big move but unsure of direction.',
    setup: 'Buy ATM call + ATM put, same strike, same front-week expiry. Enter 1–2 days before earnings.',
    strikes: (p) =>
      `Buy ${fmt$(p)} call + Buy ${fmt$(p)} put (ATM)`,
    maxProfit: 'Unlimited (on the call side)',
    maxLoss: 'Total premium paid',
    pros: ['Profits from large move in either direction', 'Best when IV is cheap'],
    cons: ['Needs stock to move MORE than combined premium', 'Theta decay is fast'],
  },
  longStrangle: {
    name: 'Long Strangle',
    emoji: '↔️',
    type: 'Volatility',
    risk: 'Medium',
    color: '#8b5cf6',
    when: 'Medium/Low IV. Expecting big move, want cheaper entry than straddle.',
    setup: 'Buy slightly OTM call + OTM put, 1 strike out from ATM, same front-week expiry.',
    strikes: (p, move) =>
      `Buy ${fmt$(p + move * 0.5)} call + Buy ${fmt$(p - move * 0.5)} put`,
    maxProfit: 'Unlimited (on the call side)',
    maxLoss: 'Total premium paid (less than straddle)',
    pros: ['Cheaper than straddle', 'Profits from large move either way', 'Good when IV is low/medium'],
    cons: ['Needs even larger move to profit', 'Both options can expire worthless'],
  },
  bullCallSpread: {
    name: 'Bull Call Spread',
    emoji: '🚀',
    type: 'Bullish',
    risk: 'Medium',
    color: '#22c55e',
    when: 'Bullish thesis. Low/Medium IV. Strong beat history.',
    setup: 'Buy ATM call, sell OTM call 1 expected move above price. Front-week or 2-week expiry.',
    strikes: (p, move) =>
      `Buy ${fmt$(p)} call / Sell ${fmt$(p + move)} call`,
    maxProfit: 'Spread width − debit paid',
    maxLoss: 'Net debit paid',
    pros: ['Defined risk', 'Lower cost than long call', 'Profits significantly if stock moves up'],
    cons: ['Capped upside', 'Full debit lost if stock drops'],
  },
  bearPutSpread: {
    name: 'Bear Put Spread',
    emoji: '🐻',
    type: 'Bearish',
    risk: 'Medium',
    color: '#ef4444',
    when: 'Bearish thesis. Low/Medium IV. Consistent miss history or weak guidance expected.',
    setup: 'Buy ATM put, sell OTM put 1 expected move below price. Front-week or 2-week expiry.',
    strikes: (p, move) =>
      `Buy ${fmt$(p)} put / Sell ${fmt$(p - move)} put`,
    maxProfit: 'Spread width − debit paid',
    maxLoss: 'Net debit paid',
    pros: ['Defined risk', 'Lower cost than long put', 'Good risk/reward if stock drops'],
    cons: ['Capped downside capture', 'Full debit lost if stock rises'],
  },
  shortStrangle: {
    name: 'Short Strangle',
    emoji: '⚡',
    type: 'Neutral',
    risk: 'High',
    color: '#f59e0b',
    when: 'Very high IV. Experienced traders only. High-confidence neutral view.',
    setup: 'Sell OTM call + OTM put, ~1.5–2 expected moves out. Front-week expiry. MUST have a defined exit.',
    strikes: (p, move) =>
      `Sell ${fmt$(p + move * 1.5)} call + Sell ${fmt$(p - move * 1.5)} put`,
    maxProfit: 'Net premium received',
    maxLoss: 'Theoretically unlimited — always define a stop',
    pros: ['Maximum premium collection', 'Wider profit zone than iron condor', 'IV crush is very favorable'],
    cons: ['⚠️ Undefined risk', 'Large loss if stock gaps beyond strikes', 'Not for beginners'],
  },
};

function getRecommendedStrategies(analysis) {
  if (!analysis) return [];
  const { ivBucket, trend } = analysis;
  const picks = [];

  if (ivBucket === 'high') {
    if (trend === 'bullish')      picks.push('bullPutSpread', 'ironCondor', 'shortStrangle');
    else if (trend === 'bearish') picks.push('bearCallSpread', 'ironCondor', 'shortStrangle');
    else                          picks.push('ironCondor', 'bullPutSpread', 'shortStrangle');
  } else if (ivBucket === 'medium') {
    if (trend === 'bullish')      picks.push('bullCallSpread', 'longStraddle', 'bullPutSpread');
    else if (trend === 'bearish') picks.push('bearPutSpread', 'longStraddle', 'bearCallSpread');
    else                          picks.push('longStraddle', 'ironCondor', 'longStrangle');
  } else {
    if (trend === 'bullish')      picks.push('longStraddle', 'bullCallSpread', 'longStrangle');
    else if (trend === 'bearish') picks.push('longStraddle', 'bearPutSpread', 'longStrangle');
    else                          picks.push('longStraddle', 'longStrangle', 'bullCallSpread');
  }

  return picks.map(k => STRATEGIES[k]);
}

const RISK_COLOR = { Low: 'text-green-400 bg-green-500/10', Medium: 'text-yellow-400 bg-yellow-500/10', High: 'text-red-400 bg-red-500/10' };
const TYPE_COLOR = {
  Neutral:    'text-indigo-400 bg-indigo-500/10',
  Bullish:    'text-green-400 bg-green-500/10',
  Bearish:    'text-red-400 bg-red-500/10',
  Volatility: 'text-purple-400 bg-purple-500/10',
};

function Skeleton({ className = '' }) {
  return <div className={`bg-[#2a2a2a] rounded animate-pulse ${className}`} />;
}

// ── Economic Calendar Tab ─────────────────────────────────────────────────────

function EconomicCalendarTab() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterImportance, setFilterImportance] = useState('All');
  const [filterCategory,   setFilterCategory]   = useState('All');
  const [showHelp,         setShowHelp]         = useState(false);

  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const defaultDay = weekDays.find(d => d.iso >= todayIso)?.iso || weekDays[0].iso;
  const [selectedDay, setSelectedDay] = useState(defaultDay);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDay(weekDays.find(d => d.iso >= today)?.iso || weekDays[0].iso);
  }, [weekDays]);

  const weekLabel = (() => {
    const d0 = new Date(weekDays[0].iso);
    const d4 = new Date(weekDays[4].iso);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(d0)} – ${fmt(d4)}`;
  })();

  const allCategories = useMemo(() => {
    const cats = [...new Set(ECONOMIC_EVENTS.map(e => e.category))].sort();
    return ['All', ...cats];
  }, []);

  const dayEvents = useMemo(() => {
    let evts = ECONOMIC_EVENTS.filter(e => e.date === selectedDay);
    if (filterImportance !== 'All') evts = evts.filter(e => e.importance === filterImportance);
    if (filterCategory   !== 'All') evts = evts.filter(e => e.category   === filterCategory);
    return evts.sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDay, filterImportance, filterCategory]);

  const weekEventCounts = useMemo(() => {
    return weekDays.reduce((acc, d) => {
      acc[d.iso] = ECONOMIC_EVENTS.filter(e => e.date === d.iso && e.importance === 'High').length;
      return acc;
    }, {});
  }, [weekDays]);

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm">{weekLabel}</span>
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
          <button onClick={() => setWeekOffset(w => w + 1)}
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

          {/* Forecast / Previous / Actual legend */}
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

          {/* Importance levels */}
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

          {/* Per-indicator guide */}
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

      {/* Day selector */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {weekDays.map(day => (
          <button key={day.iso} onClick={() => setSelectedDay(day.iso)}
            className={`rounded-xl p-2.5 text-center transition-all border relative ${
              selectedDay === day.iso
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : day.isToday
                  ? 'bg-[#1a1a1a] border-indigo-500/40 text-indigo-300'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-gray-500 hover:text-white'
            }`}>
            <p className="text-xs font-medium">{day.label}</p>
            <p className="text-[11px] mt-0.5 opacity-80">{day.num}</p>
            {weekEventCounts[day.iso] > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </div>

      {/* Events */}
      {dayEvents.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Globe size={32} className="mx-auto mb-3 opacity-30" />
          <p>No economic events for {selectedDay}</p>
          <p className="text-xs mt-1 text-gray-600">Try adjusting the filters or checking another day</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {dayEvents.map((evt, i) => {
            const imp = IMPORTANCE_CONFIG[evt.importance];
            return (
              <div key={i}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4 hover:border-[#3a3a3a] transition-colors">
                {/* Importance dot */}
                <div className="flex flex-col items-center gap-1 shrink-0 w-14">
                  <span className={`w-2 h-2 rounded-full ${imp.dot}`} />
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${imp.badge}`}>
                    {imp.label}
                  </span>
                </div>

                {/* Category icon */}
                <span className="text-xl shrink-0 w-7 text-center">
                  {CATEGORY_ICONS[evt.category] || '📌'}
                </span>

                {/* Name & time */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{evt.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-gray-500 text-xs">{evt.time}</span>
                    <span className="text-gray-700 text-xs">·</span>
                    <span className="text-indigo-400 text-xs">{evt.category}</span>
                  </div>
                </div>

                {/* Forecast / Previous */}
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
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[#1a1a1a]">
        <p className="text-gray-700 text-[10px] uppercase tracking-wider">Importance:</p>
        {[['High', 'bg-red-500'], ['Medium', 'bg-yellow-500'], ['Low', 'bg-gray-500']].map(([label, cls]) => (
          <span key={label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className={`w-2 h-2 rounded-full ${cls}`} /> {label}
          </span>
        ))}
        <p className="text-gray-600 text-[10px] ml-auto">Red dot on day picker = High impact event</p>
      </div>
    </div>
  );
}

// ── Earnings Calendar Tab ─────────────────────────────────────────────────────

function CalendarTab() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const defaultDay = weekDays.find(d => d.iso >= todayIso)?.iso || weekDays[0].iso;
  const [selectedDay,    setSelectedDay]    = useState(defaultDay);
  const [showFilters,    setShowFilters]    = useState(false);
  const [filterTime,     setFilterTime]     = useState('All');
  const [filterEps,      setFilterEps]      = useState('All');
  const [filterSector,   setFilterSector]   = useState('All');
  const [searchSym,      setSearchSym]      = useState('');

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedDay(weekDays.find(d => d.iso >= today)?.iso || weekDays[0].iso);
  }, [weekDays]);

  const { data: rawStocks = [], loading } = useEarningsCalendar(selectedDay);

  const stocks = useMemo(() => {
    let r = rawStocks;
    if (filterTime !== 'All')   r = r.filter(s => s.time === filterTime);
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

  const bmo = stocks.filter(s => s.time === 'BMO');
  const amc = stocks.filter(s => s.time === 'AMC');
  const unk = stocks.filter(s => s.time === '?');

  const weekLabel = (() => {
    const d0 = new Date(weekDays[0].iso);
    const d4 = new Date(weekDays[4].iso);
    const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(d0)} – ${fmt(d4)}`;
  })();

  const activeFilterCount = [
    filterTime !== 'All',
    filterEps !== 'All',
    filterSector !== 'All',
    !!searchSym.trim(),
  ].filter(Boolean).length;

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="text-white font-semibold text-sm">{weekLabel}</span>
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
          <button onClick={() => setWeekOffset(w => w + 1)}
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

      {/* Day selector */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {weekDays.map(day => (
          <button key={day.iso} onClick={() => setSelectedDay(day.iso)}
            className={`rounded-xl p-2.5 text-center transition-all border ${
              selectedDay === day.iso
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : day.isToday
                  ? 'bg-[#1a1a1a] border-indigo-500/40 text-indigo-300'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-gray-500 hover:text-white'
            }`}>
            <p className="text-xs font-medium">{day.label}</p>
            <p className="text-[11px] mt-0.5 opacity-80">{day.num}</p>
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BarChart2 size={32} className="mx-auto mb-3 opacity-30" />
          <p>No earnings scheduled{filterSector !== 'All' ? ` for ${filterSector}` : ''} on {selectedDay}</p>
          {filterSector !== 'All' && (
            <button onClick={() => setFilterSector('All')} className="mt-2 text-indigo-400 text-xs hover:underline">
              Show all sectors
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {[
            { label: 'Before Market Open (BMO)', items: bmo, icon: '🌅' },
            { label: 'After Market Close (AMC)', items: amc, icon: '🌙' },
            { label: 'Time TBD',                 items: unk, icon: '❓' },
          ].filter(g => g.items.length > 0).map(group => (
            <div key={group.label}>
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>{group.icon}</span> {group.label}
                <span className="text-gray-600 font-normal normal-case tracking-normal">({group.items.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.items.map(stock => (
                  <Link key={stock.symbol} to={`/stock/${stock.symbol}`}
                    className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                          <span className="text-indigo-400 font-bold text-[10px]">{stock.symbol.slice(0, 3)}</span>
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{stock.symbol}</p>
                          <p className="text-gray-500 text-[10px] truncate max-w-[130px]">{stock.name}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${stock.time === 'BMO' ? 'bg-yellow-500/10 text-yellow-400' : stock.time === 'AMC' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {stock.time}
                      </span>
                    </div>
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
                    </div>
                    {stock.fiscalQuarterEnding && (
                      <p className="text-gray-600 text-[10px] mt-1">{stock.fiscalQuarterEnding}</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Strategy Advisor Tab ──────────────────────────────────────────────────────

const POPULAR_SYMS = ['AAPL', 'NVDA', 'TSLA', 'META', 'AMZN', 'GOOGL', 'MSFT', 'AMD', 'JPM', 'NFLX'];

function StrategyAdvisor() {
  const [symbol,   setSymbol]   = useState('AAPL');
  const [input,    setInput]    = useState('');
  const [expanded, setExpanded] = useState(null);

  function commit(s) {
    const sym = s.trim().toUpperCase();
    if (sym) { setSymbol(sym); setInput(''); setExpanded(null); }
  }

  const { data: chart,    loading: chartLoad }    = useChart(symbol, '1d', '3mo');
  const { data: earnings, loading: earningsLoad } = useEarnings(symbol);
  const { data: summary }                         = useSummary(symbol);
  const { data: quote }                           = useQuote(symbol);

  const analysis   = useMemo(() => computeAnalysis(chart, earnings), [chart, earnings]);
  const strategies = useMemo(() => getRecommendedStrategies(analysis), [analysis]);

  const isLoading = chartLoad || earningsLoad;

  const IV_LABEL = { high: 'High (>40%)', medium: 'Medium (22–40%)', low: 'Low (<22%)' };
  const IV_COLOR = { high: 'text-red-400', medium: 'text-yellow-400', low: 'text-green-400' };
  const TREND_COLOR = { bullish: 'text-green-400', bearish: 'text-red-400', neutral: 'text-gray-400' };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex gap-2 mb-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && commit(input)}
            placeholder="Enter symbol…"
            className="bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 w-36 focus:outline-none focus:border-indigo-500 placeholder-gray-600 uppercase"
          />
          <button onClick={() => commit(input)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Analyze
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_SYMS.map(s => (
            <button key={s} onClick={() => { setSymbol(s); setExpanded(null); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                symbol === s
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-indigo-500/40'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-20" />
          <Skeleton className="h-64" />
        </div>
      ) : !analysis ? (
        <div className="text-center py-16 text-gray-500">No data available for {symbol}</div>
      ) : (
        <>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={15} className="text-yellow-400" />
              <h2 className="text-white font-semibold">Earnings Analysis — {symbol}</h2>
              {quote && (
                <span className={`text-sm font-mono ml-auto ${colorClass(quote.pct)}`}>
                  {fmt$(quote.price)} ({quote.pct >= 0 ? '+' : ''}{quote.pct.toFixed(2)}%)
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#111] rounded-xl p-3">
                <p className="text-gray-500 text-[10px] mb-1">30-Day Hist. Vol.</p>
                <p className={`text-lg font-bold font-mono ${IV_COLOR[analysis.ivBucket]}`}>{analysis.hv30.toFixed(1)}%</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{IV_LABEL[analysis.ivBucket]}</p>
              </div>
              <div className="bg-[#111] rounded-xl p-3">
                <p className="text-gray-500 text-[10px] mb-1">Expected Move</p>
                <p className="text-lg font-bold font-mono text-white">±{fmt$(analysis.expMoveAmt)}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">±{analysis.expMovePct.toFixed(1)}%</p>
              </div>
              <div className="bg-[#111] rounded-xl p-3">
                <p className="text-gray-500 text-[10px] mb-1">3-Month Trend</p>
                <p className={`text-lg font-bold font-mono capitalize ${TREND_COLOR[analysis.trend]}`}>{analysis.trend}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{analysis.trendPct >= 0 ? '+' : ''}{analysis.trendPct.toFixed(1)}%</p>
              </div>
              <div className="bg-[#111] rounded-xl p-3">
                <p className="text-gray-500 text-[10px] mb-1">Beat Rate</p>
                {analysis.beatRate != null ? (
                  <>
                    <p className={`text-lg font-bold font-mono ${analysis.beatRate >= 60 ? 'text-green-400' : analysis.beatRate >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {analysis.beatRate}%
                    </p>
                    <p className="text-gray-600 text-[10px] mt-0.5">of {analysis.total} quarters</p>
                  </>
                ) : (
                  <p className="text-gray-500 text-lg font-bold">—</p>
                )}
              </div>
            </div>

            {summary && (
              <div className="flex flex-wrap gap-2 mt-4">
                {summary.sector && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400">{summary.sector}</span>
                )}
                {summary.marketCap && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{formatMarketCap(summary.marketCap)}</span>
                )}
                {summary.pe && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">P/E {summary.pe.toFixed(1)}</span>
                )}
              </div>
            )}
          </div>

          {earnings?.length > 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">EPS History</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {earnings.slice(-4).map(q => (
                  <div key={q.period} className="bg-[#111] rounded-lg p-3">
                    <p className="text-gray-500 text-[10px] mb-1">{q.period}</p>
                    <p className={`text-base font-bold font-mono ${q.eps != null && q.eps >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {q.eps != null ? `$${q.eps.toFixed(2)}` : '—'}
                    </p>
                    {q.revenueGrowthYoY != null && (
                      <p className={`text-[10px] mt-0.5 ${q.revenueGrowthYoY >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        Rev {q.revenueGrowthYoY >= 0 ? '+' : ''}{q.revenueGrowthYoY}% YoY
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <TrendingUp size={15} className="text-indigo-400" />
              Recommended Strategies
              <span className="text-gray-600 text-xs font-normal">ranked by fit for current conditions</span>
            </h3>
            <div className="space-y-3">
              {strategies.map((strat, i) => (
                <div key={strat.name}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-colors">
                  <button className="w-full flex items-center gap-3 p-4 text-left"
                    onClick={() => setExpanded(expanded === strat.name ? null : strat.name)}>
                    <span className="text-gray-500 text-sm w-5 shrink-0">{i + 1}.</span>
                    <span className="text-xl shrink-0">{strat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white font-semibold text-sm">{strat.name}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLOR[strat.type]}`}>
                          {strat.type}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${RISK_COLOR[strat.risk]}`}>
                          {strat.risk} Risk
                        </span>
                        {i === 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">
                            ★ Best Fit
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">{strat.when}</p>
                    </div>
                    <ChevronRight size={14} className={`text-gray-600 shrink-0 transition-transform ${expanded === strat.name ? 'rotate-90' : ''}`} />
                  </button>

                  {expanded === strat.name && (
                    <div className="px-4 pb-4 border-t border-[#2a2a2a] pt-4 space-y-4">
                      <div>
                        <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Setup</p>
                        <p className="text-gray-300 text-sm">{strat.setup}</p>
                      </div>
                      <div className="bg-[#111] rounded-lg p-3">
                        <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1">Example Strikes (based on current price)</p>
                        <p className="text-indigo-300 font-mono text-xs">
                          {strat.strikes(analysis.price, parseFloat(analysis.expMoveAmt))}
                        </p>
                        <p className="text-gray-600 text-[10px] mt-1">
                          Expected move: ±{fmt$(analysis.expMoveAmt)} (±{analysis.expMovePct.toFixed(1)}%) · For reference only — use actual option chain
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111] rounded-lg p-3">
                          <p className="text-green-500 text-[10px] mb-1">Max Profit</p>
                          <p className="text-white text-sm">{strat.maxProfit}</p>
                        </div>
                        <div className="bg-[#111] rounded-lg p-3">
                          <p className="text-red-500 text-[10px] mb-1">Max Loss</p>
                          <p className="text-white text-sm">{strat.maxLoss}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1.5">Pros</p>
                          <ul className="space-y-1">
                            {strat.pros.map(p => (
                              <li key={p} className="flex items-start gap-1.5 text-xs text-gray-300">
                                <span className="text-green-500 mt-0.5 shrink-0">✓</span>{p}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1.5">Cons</p>
                          <ul className="space-y-1">
                            {strat.cons.map(c => (
                              <li key={c} className="flex items-start gap-1.5 text-xs text-gray-300">
                                <span className="text-red-500 mt-0.5 shrink-0">✗</span>{c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-start gap-2 mt-4 p-3 bg-[#111] border border-[#2a2a2a] rounded-lg">
              <Info size={13} className="text-gray-600 mt-0.5 shrink-0" />
              <p className="text-gray-600 text-[10px] leading-relaxed">
                Strategies are generated algorithmically from historical volatility and price data. They are for educational purposes only and do not constitute financial advice. Always verify current IV, check the option chain, and size positions appropriately for your risk tolerance.
              </p>
            </div>
          </div>
        </>
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
        <p className="text-gray-500 text-sm">Economic events, earnings calendar, and AI-powered options strategy recommendations</p>
      </div>

      <div className="flex gap-1 border-b border-[#2a2a2a] mb-6">
        {[
          { id: 'economic',   label: 'Economic Calendar', icon: Globe },
          { id: 'calendar',   label: 'Earnings Calendar', icon: Clock },
          { id: 'strategies', label: 'Strategy Advisor',  icon: TrendingUp },
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
      {tab === 'strategies' && <StrategyAdvisor />}
    </div>
  );
}
