// Realistic mock data service — mirrors Yahoo Finance data shapes

export const INDICES = [
  { symbol: '^GSPC', name: 'S&P 500',   price: 5287.76, change: 42.15, pct: 0.80 },
  { symbol: '^IXIC', name: 'NASDAQ',    price: 16428.82, change: -28.39, pct: -0.17 },
  { symbol: '^DJI',  name: 'DOW',       price: 39069.59, change: 172.13, pct: 0.44 },
  { symbol: '^RUT',  name: 'Russell 2K',price: 2082.34,  change: -11.20, pct: -0.54 },
  { symbol: '^VIX',  name: 'VIX',       price: 14.82,    change: -0.91, pct: -5.79 },
  { symbol: 'GC=F',  name: 'Gold',      price: 2389.40,  change: 8.30,  pct: 0.35 },
  { symbol: 'CL=F',  name: 'Crude Oil', price: 83.17,    change: -0.62, pct: -0.74 },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 63842.10, change: 1204.50, pct: 1.92 },
];

export const STOCKS = {
  AAPL: {
    symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology',
    price: 189.30, change: 1.45, pct: 0.77,
    open: 188.20, high: 190.10, low: 187.80, prevClose: 187.85,
    volume: 58_420_100, avgVolume: 61_200_000, marketCap: 2.93e12,
    pe: 30.2, eps: 6.27, week52High: 199.62, week52Low: 164.08,
    dividend: 0.96, yield: 0.51, beta: 1.29, forwardPE: 27.4,
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
    news: [
      { id:1, title:'Apple Hits $3T Milestone Again Amid AI Optimism', source:'Reuters', time:'2h ago', url:'#' },
      { id:2, title:'iPhone 16 Pro Demand Exceeds Expectations in Asia', source:'Bloomberg', time:'4h ago', url:'#' },
      { id:3, title:'Apple Vision Pro Sales Top 500K Units in First Quarter', source:'WSJ', time:'6h ago', url:'#' },
    ],
  },
  MSFT: {
    symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology',
    price: 415.60, change: -2.30, pct: -0.55,
    open: 418.50, high: 420.00, low: 414.20, prevClose: 417.90,
    volume: 22_100_000, avgVolume: 24_500_000, marketCap: 3.09e12,
    pe: 36.8, eps: 11.29, week52High: 430.82, week52Low: 309.45,
    dividend: 3.00, yield: 0.72, beta: 0.91, forwardPE: 31.2,
    description: 'Microsoft Corporation develops and supports software, services, devices, and solutions worldwide.',
    news: [
      { id:1, title:'Microsoft Azure Revenue Grows 31% in Q3', source:'CNBC', time:'1h ago', url:'#' },
      { id:2, title:'OpenAI Partnership Deepens with $2B New Investment', source:'FT', time:'3h ago', url:'#' },
    ],
  },
  NVDA: {
    symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology',
    price: 877.35, change: 23.60, pct: 2.77,
    open: 856.00, high: 882.40, low: 853.20, prevClose: 853.75,
    volume: 41_800_000, avgVolume: 45_000_000, marketCap: 2.16e12,
    pe: 72.4, eps: 12.12, week52High: 974.00, week52Low: 402.35,
    dividend: 0.16, yield: 0.02, beta: 1.68, forwardPE: 38.5,
    description: 'NVIDIA Corporation provides graphics and compute and networking solutions worldwide.',
    news: [
      { id:1, title:'NVIDIA Blackwell GPU Demand Outpaces Supply Through 2025', source:'Reuters', time:'30m ago', url:'#' },
      { id:2, title:'Jensen Huang Keynote Highlights AI Datacenter Boom', source:'Bloomberg', time:'2h ago', url:'#' },
    ],
  },
  TSLA: {
    symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical',
    price: 177.58, change: -4.20, pct: -2.31,
    open: 182.00, high: 183.40, low: 176.90, prevClose: 181.78,
    volume: 95_300_000, avgVolume: 102_000_000, marketCap: 565e9,
    pe: 47.3, eps: 3.75, week52High: 278.98, week52Low: 138.80,
    dividend: 0, yield: 0, beta: 2.31, forwardPE: 56.8,
    description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems.',
    news: [
      { id:1, title:'Tesla Deliveries Miss Q1 Estimates by 7%', source:'WSJ', time:'5h ago', url:'#' },
      { id:2, title:'Cybertruck Production Ramp Slower Than Expected', source:'CNBC', time:'8h ago', url:'#' },
    ],
  },
  AMZN: {
    symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical',
    price: 185.07, change: 2.15, pct: 1.18,
    open: 183.20, high: 186.30, low: 182.80, prevClose: 182.92,
    volume: 38_200_000, avgVolume: 42_000_000, marketCap: 1.93e12,
    pe: 52.1, eps: 3.55, week52High: 191.70, week52Low: 118.35,
    dividend: 0, yield: 0, beta: 1.15, forwardPE: 34.8,
    description: 'Amazon.com, Inc. engages in the retail sale of consumer products, advertising, and subscriptions service through online and physical stores.',
    news: [
      { id:1, title:'AWS Captures 32% of Cloud Market in Q1 2024', source:'Bloomberg', time:'2h ago', url:'#' },
    ],
  },
  GOOGL: {
    symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Communication Services',
    price: 173.72, change: 1.88, pct: 1.09,
    open: 172.10, high: 174.95, low: 171.60, prevClose: 171.84,
    volume: 25_800_000, avgVolume: 28_000_000, marketCap: 2.18e12,
    pe: 27.1, eps: 6.41, week52High: 180.25, week52Low: 115.83,
    dividend: 0, yield: 0, beta: 1.04, forwardPE: 21.5,
    description: 'Alphabet Inc. provides various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
    news: [
      { id:1, title:'Google I/O 2024: Gemini 1.5 Pro Available to All Developers', source:'TechCrunch', time:'1h ago', url:'#' },
    ],
  },
  META: {
    symbol: 'META', name: 'Meta Platforms', sector: 'Communication Services',
    price: 493.50, change: 8.60, pct: 1.77,
    open: 486.20, high: 496.80, low: 485.40, prevClose: 484.90,
    volume: 17_900_000, avgVolume: 20_500_000, marketCap: 1.26e12,
    pe: 26.3, eps: 18.77, week52High: 531.49, week52Low: 274.38,
    dividend: 0, yield: 0, beta: 1.23, forwardPE: 22.4,
    description: 'Meta Platforms, Inc. develops products that enable people to connect and share with friends and family through mobile devices, personal computers, virtual reality headsets.',
    news: [
      { id:1, title:'Meta AI Assistant Rolls Out to 1B WhatsApp Users', source:'Reuters', time:'3h ago', url:'#' },
    ],
  },
  JPM: {
    symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials',
    price: 196.62, change: -0.88, pct: -0.45,
    open: 197.80, high: 198.45, low: 195.90, prevClose: 197.50,
    volume: 9_100_000, avgVolume: 10_800_000, marketCap: 566e9,
    pe: 11.5, eps: 17.10, week52High: 205.88, week52Low: 135.19,
    dividend: 5.00, yield: 2.54, beta: 1.09, forwardPE: 12.1,
    description: 'JPMorgan Chase & Co. operates as a financial services company worldwide.',
    news: [],
  },
  NFLX: {
    symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services',
    price: 628.45, change: 12.30, pct: 1.99,
    open: 617.20, high: 631.80, low: 616.40, prevClose: 616.15,
    volume: 4_200_000, avgVolume: 5_100_000, marketCap: 271e9,
    pe: 48.7, eps: 12.90, week52High: 700.00, week52Low: 344.73,
    dividend: 0, yield: 0, beta: 1.31, forwardPE: 36.4,
    description: 'Netflix, Inc. provides entertainment services worldwide.',
    news: [],
  },
  AMD: {
    symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology',
    price: 162.30, change: 4.85, pct: 3.08,
    open: 158.20, high: 163.90, low: 157.80, prevClose: 157.45,
    volume: 51_200_000, avgVolume: 58_000_000, marketCap: 263e9,
    pe: 283.0, eps: 0.57, week52High: 227.30, week52Low: 93.12,
    dividend: 0, yield: 0, beta: 1.73, forwardPE: 30.8,
    description: 'Advanced Micro Devices, Inc. operates as a semiconductor company worldwide.',
    news: [],
  },
  // ── Technology ────────────────────────────────────────────────────────────────
  INTC:  { symbol: 'INTC',  name: 'Intel Corp.',           sector: 'Technology', beta: 0.97 },
  TSM:   { symbol: 'TSM',   name: 'Taiwan Semiconductor',  sector: 'Technology', beta: 1.12 },
  QCOM:  { symbol: 'QCOM',  name: 'Qualcomm Inc.',         sector: 'Technology', beta: 1.32 },
  AVGO:  { symbol: 'AVGO',  name: 'Broadcom Inc.',         sector: 'Technology', beta: 1.25 },
  TXN:   { symbol: 'TXN',   name: 'Texas Instruments',     sector: 'Technology', beta: 1.03 },
  MU:    { symbol: 'MU',    name: 'Micron Technology',     sector: 'Technology', beta: 1.62 },
  AMAT:  { symbol: 'AMAT',  name: 'Applied Materials',     sector: 'Technology', beta: 1.50 },
  LRCX:  { symbol: 'LRCX',  name: 'Lam Research',          sector: 'Technology', beta: 1.55 },
  KLAC:  { symbol: 'KLAC',  name: 'KLA Corp.',             sector: 'Technology', beta: 1.48 },
  MRVL:  { symbol: 'MRVL',  name: 'Marvell Technology',    sector: 'Technology', beta: 1.58 },
  ARM:   { symbol: 'ARM',   name: 'Arm Holdings',          sector: 'Technology', beta: 1.70 },
  ORCL:  { symbol: 'ORCL',  name: 'Oracle Corp.',          sector: 'Technology', beta: 1.11 },
  CRM:   { symbol: 'CRM',   name: 'Salesforce Inc.',       sector: 'Technology', beta: 1.25 },
  ADBE:  { symbol: 'ADBE',  name: 'Adobe Inc.',            sector: 'Technology', beta: 1.30 },
  NOW:   { symbol: 'NOW',   name: 'ServiceNow Inc.',       sector: 'Technology', beta: 1.20 },
  INTU:  { symbol: 'INTU',  name: 'Intuit Inc.',           sector: 'Technology', beta: 1.18 },
  CSCO:  { symbol: 'CSCO',  name: 'Cisco Systems',         sector: 'Technology', beta: 0.86 },
  IBM:   { symbol: 'IBM',   name: 'IBM Corp.',             sector: 'Technology', beta: 0.75 },
  DELL:  { symbol: 'DELL',  name: 'Dell Technologies',     sector: 'Technology', beta: 1.40 },
  HPQ:   { symbol: 'HPQ',   name: 'HP Inc.',               sector: 'Technology', beta: 0.92 },
  ACN:   { symbol: 'ACN',   name: 'Accenture PLC',         sector: 'Technology', beta: 1.14 },
  PANW:  { symbol: 'PANW',  name: 'Palo Alto Networks',    sector: 'Technology', beta: 1.35 },
  CRWD:  { symbol: 'CRWD',  name: 'CrowdStrike Holdings',  sector: 'Technology', beta: 1.40 },
  ZS:    { symbol: 'ZS',    name: 'Zscaler Inc.',          sector: 'Technology', beta: 1.50 },
  SNOW:  { symbol: 'SNOW',  name: 'Snowflake Inc.',        sector: 'Technology', beta: 1.55 },
  DDOG:  { symbol: 'DDOG',  name: 'Datadog Inc.',          sector: 'Technology', beta: 1.45 },
  NET:   { symbol: 'NET',   name: 'Cloudflare Inc.',       sector: 'Technology', beta: 1.60 },
  PLTR:  { symbol: 'PLTR',  name: 'Palantir Technologies', sector: 'Technology', beta: 1.80 },
  MSTR:  { symbol: 'MSTR',  name: 'MicroStrategy',         sector: 'Technology', beta: 3.50 },
  SHOP:  { symbol: 'SHOP',  name: 'Shopify Inc.',          sector: 'Technology', beta: 1.65 },
  TTD:   { symbol: 'TTD',   name: 'The Trade Desk',        sector: 'Technology', beta: 1.70 },

  // ── Healthcare ────────────────────────────────────────────────────────────────
  JNJ:   { symbol: 'JNJ',   name: 'Johnson & Johnson',     sector: 'Healthcare', beta: 0.55 },
  UNH:   { symbol: 'UNH',   name: 'UnitedHealth Group',    sector: 'Healthcare', beta: 0.73 },
  LLY:   { symbol: 'LLY',   name: 'Eli Lilly & Co.',       sector: 'Healthcare', beta: 0.51 },
  MRK:   { symbol: 'MRK',   name: 'Merck & Co.',           sector: 'Healthcare', beta: 0.37 },
  ABBV:  { symbol: 'ABBV',  name: 'AbbVie Inc.',           sector: 'Healthcare', beta: 0.64 },
  PFE:   { symbol: 'PFE',   name: 'Pfizer Inc.',           sector: 'Healthcare', beta: 0.62 },
  BMY:   { symbol: 'BMY',   name: 'Bristol-Myers Squibb',  sector: 'Healthcare', beta: 0.55 },
  AMGN:  { symbol: 'AMGN',  name: 'Amgen Inc.',            sector: 'Healthcare', beta: 0.47 },
  GILD:  { symbol: 'GILD',  name: 'Gilead Sciences',       sector: 'Healthcare', beta: 0.40 },
  MDT:   { symbol: 'MDT',   name: 'Medtronic PLC',         sector: 'Healthcare', beta: 0.76 },
  ABT:   { symbol: 'ABT',   name: 'Abbott Laboratories',   sector: 'Healthcare', beta: 0.81 },
  TMO:   { symbol: 'TMO',   name: 'Thermo Fisher Scientific', sector: 'Healthcare', beta: 0.95 },
  ISRG:  { symbol: 'ISRG',  name: 'Intuitive Surgical',    sector: 'Healthcare', beta: 0.91 },
  VRTX:  { symbol: 'VRTX',  name: 'Vertex Pharmaceuticals',sector: 'Healthcare', beta: 0.52 },
  REGN:  { symbol: 'REGN',  name: 'Regeneron Pharmaceuticals', sector: 'Healthcare', beta: 0.48 },
  MRNA:  { symbol: 'MRNA',  name: 'Moderna Inc.',          sector: 'Healthcare', beta: 1.65 },
  CVS:   { symbol: 'CVS',   name: 'CVS Health Corp.',      sector: 'Healthcare', beta: 0.58 },
  CI:    { symbol: 'CI',    name: 'Cigna Group',           sector: 'Healthcare', beta: 0.74 },
  HUM:   { symbol: 'HUM',   name: 'Humana Inc.',           sector: 'Healthcare', beta: 0.68 },
  ELV:   { symbol: 'ELV',   name: 'Elevance Health',       sector: 'Healthcare', beta: 0.71 },

  // ── Financials ────────────────────────────────────────────────────────────────
  BAC:   { symbol: 'BAC',   name: 'Bank of America',       sector: 'Financials', beta: 1.40 },
  WFC:   { symbol: 'WFC',   name: 'Wells Fargo & Co.',     sector: 'Financials', beta: 1.18 },
  GS:    { symbol: 'GS',    name: 'Goldman Sachs',         sector: 'Financials', beta: 1.38 },
  MS:    { symbol: 'MS',    name: 'Morgan Stanley',        sector: 'Financials', beta: 1.32 },
  BLK:   { symbol: 'BLK',   name: 'BlackRock Inc.',        sector: 'Financials', beta: 1.28 },
  V:     { symbol: 'V',     name: 'Visa Inc.',             sector: 'Financials', beta: 0.96 },
  MA:    { symbol: 'MA',    name: 'Mastercard Inc.',       sector: 'Financials', beta: 1.01 },
  AXP:   { symbol: 'AXP',   name: 'American Express',      sector: 'Financials', beta: 1.22 },
  PYPL:  { symbol: 'PYPL',  name: 'PayPal Holdings',       sector: 'Financials', beta: 1.55 },
  C:     { symbol: 'C',     name: 'Citigroup Inc.',        sector: 'Financials', beta: 1.54 },
  USB:   { symbol: 'USB',   name: 'U.S. Bancorp',          sector: 'Financials', beta: 0.93 },
  SCHW:  { symbol: 'SCHW',  name: 'Charles Schwab',        sector: 'Financials', beta: 1.08 },
  COF:   { symbol: 'COF',   name: 'Capital One Financial', sector: 'Financials', beta: 1.48 },
  CB:    { symbol: 'CB',    name: 'Chubb Ltd.',            sector: 'Financials', beta: 0.72 },
  PGR:   { symbol: 'PGR',   name: 'Progressive Corp.',     sector: 'Financials', beta: 0.50 },
  SPGI:  { symbol: 'SPGI',  name: 'S&P Global Inc.',       sector: 'Financials', beta: 1.10 },

  // ── Consumer Cyclical ─────────────────────────────────────────────────────────
  HD:    { symbol: 'HD',    name: 'Home Depot Inc.',       sector: 'Consumer Cyclical', beta: 1.10 },
  TGT:   { symbol: 'TGT',   name: 'Target Corp.',          sector: 'Consumer Cyclical', beta: 1.22 },
  NKE:   { symbol: 'NKE',   name: 'Nike Inc.',             sector: 'Consumer Cyclical', beta: 1.10 },
  SBUX:  { symbol: 'SBUX',  name: 'Starbucks Corp.',       sector: 'Consumer Cyclical', beta: 0.97 },
  MCD:   { symbol: 'MCD',   name: "McDonald's Corp.",      sector: 'Consumer Cyclical', beta: 0.74 },
  BKNG:  { symbol: 'BKNG',  name: 'Booking Holdings',      sector: 'Consumer Cyclical', beta: 1.30 },
  ABNB:  { symbol: 'ABNB',  name: 'Airbnb Inc.',           sector: 'Consumer Cyclical', beta: 1.55 },
  GM:    { symbol: 'GM',    name: 'General Motors',        sector: 'Consumer Cyclical', beta: 1.45 },
  F:     { symbol: 'F',     name: 'Ford Motor Co.',        sector: 'Consumer Cyclical', beta: 1.60 },
  RIVN:  { symbol: 'RIVN',  name: 'Rivian Automotive',     sector: 'Consumer Cyclical', beta: 2.10 },
  LVS:   { symbol: 'LVS',   name: 'Las Vegas Sands',       sector: 'Consumer Cyclical', beta: 1.58 },
  LOW:   { symbol: 'LOW',   name: "Lowe's Companies",      sector: 'Consumer Cyclical', beta: 1.15 },
  EBAY:  { symbol: 'EBAY',  name: 'eBay Inc.',             sector: 'Consumer Cyclical', beta: 1.20 },
  DASH:  { symbol: 'DASH',  name: 'DoorDash Inc.',         sector: 'Consumer Cyclical', beta: 1.70 },
  UBER:  { symbol: 'UBER',  name: 'Uber Technologies',     sector: 'Consumer Cyclical', beta: 1.55 },
  LYFT:  { symbol: 'LYFT',  name: 'Lyft Inc.',             sector: 'Consumer Cyclical', beta: 1.75 },

  // ── Consumer Defensive ────────────────────────────────────────────────────────
  WMT:   { symbol: 'WMT',   name: 'Walmart Inc.',          sector: 'Consumer Defensive', beta: 0.58 },
  COST:  { symbol: 'COST',  name: 'Costco Wholesale',      sector: 'Consumer Defensive', beta: 0.93 },
  PG:    { symbol: 'PG',    name: 'Procter & Gamble',      sector: 'Consumer Defensive', beta: 0.59 },
  KO:    { symbol: 'KO',    name: 'Coca-Cola Co.',         sector: 'Consumer Defensive', beta: 0.60 },
  PEP:   { symbol: 'PEP',   name: 'PepsiCo Inc.',          sector: 'Consumer Defensive', beta: 0.57 },
  PM:    { symbol: 'PM',    name: 'Philip Morris International', sector: 'Consumer Defensive', beta: 0.71 },
  MO:    { symbol: 'MO',    name: 'Altria Group',          sector: 'Consumer Defensive', beta: 0.70 },
  CL:    { symbol: 'CL',    name: 'Colgate-Palmolive',     sector: 'Consumer Defensive', beta: 0.55 },
  GIS:   { symbol: 'GIS',   name: 'General Mills',         sector: 'Consumer Defensive', beta: 0.23 },
  KHC:   { symbol: 'KHC',   name: 'Kraft Heinz Co.',       sector: 'Consumer Defensive', beta: 0.60 },

  // ── Communication Services ────────────────────────────────────────────────────
  DIS:   { symbol: 'DIS',   name: 'Walt Disney Co.',       sector: 'Communication Services', beta: 1.25 },
  T:     { symbol: 'T',     name: 'AT&T Inc.',             sector: 'Communication Services', beta: 0.61 },
  VZ:    { symbol: 'VZ',    name: 'Verizon Communications',sector: 'Communication Services', beta: 0.43 },
  CMCSA: { symbol: 'CMCSA', name: 'Comcast Corp.',         sector: 'Communication Services', beta: 0.82 },
  SNAP:  { symbol: 'SNAP',  name: 'Snap Inc.',             sector: 'Communication Services', beta: 1.60 },
  PINS:  { symbol: 'PINS',  name: 'Pinterest Inc.',        sector: 'Communication Services', beta: 1.35 },
  SPOT:  { symbol: 'SPOT',  name: 'Spotify Technology',    sector: 'Communication Services', beta: 1.45 },
  RBLX:  { symbol: 'RBLX',  name: 'Roblox Corp.',          sector: 'Communication Services', beta: 1.80 },
  WBD:   { symbol: 'WBD',   name: 'Warner Bros. Discovery',sector: 'Communication Services', beta: 1.40 },
  PARA:  { symbol: 'PARA',  name: 'Paramount Global',      sector: 'Communication Services', beta: 1.38 },

  // ── Industrials ───────────────────────────────────────────────────────────────
  BA:    { symbol: 'BA',    name: 'Boeing Co.',            sector: 'Industrials', beta: 1.42 },
  CAT:   { symbol: 'CAT',   name: 'Caterpillar Inc.',      sector: 'Industrials', beta: 1.21 },
  DE:    { symbol: 'DE',    name: 'Deere & Co.',           sector: 'Industrials', beta: 1.15 },
  GE:    { symbol: 'GE',    name: 'GE Aerospace',          sector: 'Industrials', beta: 1.47 },
  HON:   { symbol: 'HON',   name: 'Honeywell International', sector: 'Industrials', beta: 1.09 },
  UPS:   { symbol: 'UPS',   name: 'United Parcel Service', sector: 'Industrials', beta: 1.18 },
  FDX:   { symbol: 'FDX',   name: 'FedEx Corp.',           sector: 'Industrials', beta: 1.25 },
  LMT:   { symbol: 'LMT',   name: 'Lockheed Martin',       sector: 'Industrials', beta: 0.92 },
  RTX:   { symbol: 'RTX',   name: 'RTX Corp.',             sector: 'Industrials', beta: 0.98 },
  NOC:   { symbol: 'NOC',   name: 'Northrop Grumman',      sector: 'Industrials', beta: 0.89 },
  MMM:   { symbol: 'MMM',   name: '3M Co.',                sector: 'Industrials', beta: 0.90 },
  CSX:   { symbol: 'CSX',   name: 'CSX Corp.',             sector: 'Industrials', beta: 1.10 },
  UNP:   { symbol: 'UNP',   name: 'Union Pacific',         sector: 'Industrials', beta: 1.08 },

  // ── Energy ────────────────────────────────────────────────────────────────────
  XOM:   { symbol: 'XOM',   name: 'Exxon Mobil Corp.',     sector: 'Energy', beta: 1.15 },
  CVX:   { symbol: 'CVX',   name: 'Chevron Corp.',         sector: 'Energy', beta: 1.12 },
  COP:   { symbol: 'COP',   name: 'ConocoPhillips',        sector: 'Energy', beta: 1.38 },
  SLB:   { symbol: 'SLB',   name: 'SLB (Schlumberger)',    sector: 'Energy', beta: 1.43 },
  OXY:   { symbol: 'OXY',   name: 'Occidental Petroleum',  sector: 'Energy', beta: 1.73 },
  MPC:   { symbol: 'MPC',   name: 'Marathon Petroleum',    sector: 'Energy', beta: 1.42 },
  PSX:   { symbol: 'PSX',   name: 'Phillips 66',           sector: 'Energy', beta: 1.35 },
  VLO:   { symbol: 'VLO',   name: 'Valero Energy',         sector: 'Energy', beta: 1.48 },
  HAL:   { symbol: 'HAL',   name: 'Halliburton Co.',       sector: 'Energy', beta: 1.58 },

  // ── Materials ─────────────────────────────────────────────────────────────────
  LIN:   { symbol: 'LIN',   name: 'Linde PLC',             sector: 'Materials', beta: 0.85 },
  APD:   { symbol: 'APD',   name: 'Air Products & Chemicals', sector: 'Materials', beta: 0.92 },
  ECL:   { symbol: 'ECL',   name: 'Ecolab Inc.',           sector: 'Materials', beta: 0.85 },
  NEM:   { symbol: 'NEM',   name: 'Newmont Corp.',         sector: 'Materials', beta: 0.56 },
  FCX:   { symbol: 'FCX',   name: 'Freeport-McMoRan',      sector: 'Materials', beta: 1.97 },
  NUE:   { symbol: 'NUE',   name: 'Nucor Corp.',           sector: 'Materials', beta: 1.42 },
  DOW:   { symbol: 'DOW',   name: 'Dow Inc.',              sector: 'Materials', beta: 1.28 },

  // ── Real Estate ───────────────────────────────────────────────────────────────
  AMT:   { symbol: 'AMT',   name: 'American Tower',        sector: 'Real Estate', beta: 0.80 },
  PLD:   { symbol: 'PLD',   name: 'Prologis Inc.',         sector: 'Real Estate', beta: 1.20 },
  EQIX:  { symbol: 'EQIX',  name: 'Equinix Inc.',          sector: 'Real Estate', beta: 0.98 },
  SPG:   { symbol: 'SPG',   name: 'Simon Property Group',  sector: 'Real Estate', beta: 1.42 },
  O:     { symbol: 'O',     name: 'Realty Income Corp.',   sector: 'Real Estate', beta: 0.83 },
  WELL:  { symbol: 'WELL',  name: 'Welltower Inc.',        sector: 'Real Estate', beta: 0.73 },
  DLR:   { symbol: 'DLR',   name: 'Digital Realty Trust',  sector: 'Real Estate', beta: 0.95 },

  // ── Utilities ─────────────────────────────────────────────────────────────────
  NEE:   { symbol: 'NEE',   name: 'NextEra Energy',        sector: 'Utilities', beta: 0.50 },
  DUK:   { symbol: 'DUK',   name: 'Duke Energy Corp.',     sector: 'Utilities', beta: 0.40 },
  SO:    { symbol: 'SO',    name: 'Southern Co.',          sector: 'Utilities', beta: 0.33 },
  D:     { symbol: 'D',     name: 'Dominion Energy',       sector: 'Utilities', beta: 0.49 },
  AEP:   { symbol: 'AEP',   name: 'American Electric Power', sector: 'Utilities', beta: 0.38 },
  EXC:   { symbol: 'EXC',   name: 'Exelon Corp.',          sector: 'Utilities', beta: 0.52 },
  SRE:   { symbol: 'SRE',   name: 'Sempra Energy',         sector: 'Utilities', beta: 0.55 },
};

export const ALL_SYMBOLS = Object.keys(STOCKS);

export const SECTORS = [
  { name: 'Technology',            change: 1.24, color: '#22c55e' },
  { name: 'Healthcare',            change: -0.38, color: '#ef4444' },
  { name: 'Financial Services',    change: 0.51, color: '#22c55e' },
  { name: 'Consumer Cyclical',     change: -1.12, color: '#ef4444' },
  { name: 'Industrials',           change: 0.76, color: '#22c55e' },
  { name: 'Communication Services',change: 0.93, color: '#22c55e' },
  { name: 'Energy',                change: -0.54, color: '#ef4444' },
  { name: 'Utilities',             change: 0.21, color: '#22c55e' },
  { name: 'Real Estate',           change: -0.67, color: '#ef4444' },
  { name: 'Materials',             change: 0.34, color: '#22c55e' },
  { name: 'Consumer Staples',      change: -0.15, color: '#ef4444' },
  { name: 'Semiconductors',        change: 2.41, color: '#22c55e' },
];

export const NEWS_FEED = [
  { id: 1,  title: 'Fed Holds Rates Steady, Signals Two Cuts in 2024', source: 'Reuters',      time: '10m ago', category: 'Economy',   img: null },
  { id: 2,  title: 'S&P 500 Inches Toward All-Time High as Tech Leads', source: 'Bloomberg',   time: '25m ago', category: 'Markets',   img: null },
  { id: 3,  title: 'NVIDIA Reports Record Revenue Driven by AI Chip Sales', source: 'CNBC',    time: '1h ago',  category: 'Earnings',  img: null },
  { id: 4,  title: 'Apple Wins Patent Battle Against Qualcomm in EU Court', source: 'FT',      time: '2h ago',  category: 'Tech',      img: null },
  { id: 5,  title: 'Oil Drops on Higher-Than-Expected Inventories Report', source: 'WSJ',      time: '2h ago',  category: 'Commodities',img: null },
  { id: 6,  title: 'Bitcoin Breaks $64K as ETF Inflows Hit Monthly Record', source: 'CoinDesk', time: '3h ago', category: 'Crypto',    img: null },
  { id: 7,  title: 'Amazon Web Services Expands Into 3 New Asian Markets', source: 'Reuters',   time: '4h ago',  category: 'Tech',      img: null },
  { id: 8,  title: 'Tesla Faces Increased Competition in Chinese EV Market', source: 'Bloomberg', time: '5h ago', category: 'Autos',   img: null },
  { id: 9,  title: 'JPMorgan Beats Q1 Profit Estimates on Trading Gains', source: 'CNBC',      time: '6h ago',  category: 'Earnings',  img: null },
  { id: 10, title: 'Meta Platforms Surges 7% After Strong Ad Revenue Beat', source: 'WSJ',     time: '7h ago',  category: 'Earnings',  img: null },
  { id: 11, title: 'US GDP Growth Slows to 1.6% in Q1, Below Expectations', source: 'FT',     time: '8h ago',  category: 'Economy',   img: null },
  { id: 12, title: 'Google Gemini Ultra Tops GPT-4 on Multiple Benchmarks', source: 'TechCrunch', time: '9h ago', category: 'AI',    img: null },
];

// Generate realistic candlestick / line chart data for given days back
export function generatePriceHistory(basePrice, days = 90, volatility = 0.015) {
  const data = [];
  let price = basePrice * (1 - (Math.random() * 0.15 + 0.05));
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86_400_000);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const change = (Math.random() - 0.48) * volatility;
    price = price * (1 + change);
    const open = price;
    const close = price * (1 + (Math.random() - 0.5) * volatility * 0.5);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.3);
    const low  = Math.min(open, close) * (1 - Math.random() * volatility * 0.3);
    const volume = Math.floor(Math.random() * 60_000_000 + 20_000_000);
    data.push({
      date: date.toISOString().slice(0, 10),
      open: +open.toFixed(2), close: +close.toFixed(2),
      high: +high.toFixed(2), low: +low.toFixed(2),
      volume,
      price: +close.toFixed(2),
    });
    price = close;
  }
  return data;
}

export function generateFinancials(baseRevenue = 120e9) {
  const quarters = ['Q1 2023', 'Q2 2023', 'Q3 2023', 'Q4 2023'];
  return quarters.map((q, i) => ({
    period: q,
    revenue: +(baseRevenue * (1 + i * 0.03 + Math.random() * 0.02) / 1e9).toFixed(1),
    netIncome: +(baseRevenue * 0.22 * (1 + i * 0.04) / 1e9).toFixed(1),
    eps: +(1.2 + i * 0.15 + Math.random() * 0.1).toFixed(2),
    grossMargin: +(42 + i * 0.5 + Math.random() * 1).toFixed(1),
  }));
}

export function generateOptionsChain(price) {
  const strikes = Array.from({ length: 9 }, (_, i) => Math.round(price * (0.85 + i * 0.04)));
  return strikes.map(strike => {
    const diff = (price - strike) / price;
    const callIV  = +(22 + Math.random() * 8 + Math.abs(diff) * 30).toFixed(1);
    const putIV   = +(callIV + Math.random() * 4 - 1).toFixed(1);
    const callBid = +(Math.max(price - strike, 0) + Math.random() * 3).toFixed(2);
    const putBid  = +(Math.max(strike - price, 0) + Math.random() * 3).toFixed(2);
    return {
      strike,
      callBid, callAsk: +(callBid + 0.05 + Math.random() * 0.15).toFixed(2),
      callIV, callOI: Math.floor(Math.random() * 15000 + 500),
      callDelta: +(0.5 + diff + Math.random() * 0.1).toFixed(2),
      putBid,  putAsk:  +(putBid  + 0.05 + Math.random() * 0.15).toFixed(2),
      putIV,  putOI:  Math.floor(Math.random() * 12000 + 500),
      putDelta: +(-0.5 + diff - Math.random() * 0.1).toFixed(2),
      itm: price > strike,
    };
  });
}

export function searchStocks(query) {
  const q = query.toLowerCase();
  return Object.values(STOCKS).filter(
    s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  );
}

