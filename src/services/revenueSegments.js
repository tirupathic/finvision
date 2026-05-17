// ─── Revenue Segment Data ─────────────────────────────────────────────────────
// Hardcoded segment breakdown for major companies.
// Update periodically from company 10-K / earnings press releases.

const C = {
  indigo:  '#6366f1',
  green:   '#22c55e',
  amber:   '#f59e0b',
  pink:    '#ec4899',
  teal:    '#14b8a6',
  sky:     '#38bdf8',
  orange:  '#f97316',
  violet:  '#a78bfa',
  rose:    '#fb7185',
  lime:    '#a3e635',
  cyan:    '#22d3ee',
  yellow:  '#fbbf24',
  slate:   '#94a3b8',
};

export const REVENUE_SEGMENTS = {
  AAPL: {
    period: 'FY 2024',
    segments: [
      { name: 'iPhone',             pct: 51.8, color: C.indigo  },
      { name: 'Services',           pct: 22.9, color: C.green   },
      { name: 'Mac',                pct:  8.0, color: C.amber   },
      { name: 'Wearables & Home',   pct:  9.0, color: C.teal    },
      { name: 'iPad',               pct:  6.5, color: C.pink    },
      { name: 'Other',              pct:  1.8, color: C.slate   },
    ],
  },
  MSFT: {
    period: 'FY 2024',
    segments: [
      { name: 'Intelligent Cloud',           pct: 43.3, color: C.indigo },
      { name: 'Productivity & Business',     pct: 33.5, color: C.green  },
      { name: 'Personal Computing',          pct: 23.2, color: C.amber  },
    ],
  },
  GOOGL: {
    period: 'FY 2024',
    segments: [
      { name: 'Google Search & Other', pct: 57.0, color: C.indigo },
      { name: 'Google Cloud',          pct: 12.5, color: C.green  },
      { name: 'YouTube Ads',           pct: 10.2, color: C.rose   },
      { name: 'Google Network',        pct:  8.7, color: C.amber  },
      { name: 'Google Subscriptions',  pct:  7.4, color: C.teal   },
      { name: 'Other Bets',            pct:  0.5, color: C.slate  },
      { name: 'Hedging',               pct:  3.7, color: C.violet },
    ],
  },
  GOOG: {
    period: 'FY 2024',
    segments: [
      { name: 'Google Search & Other', pct: 57.0, color: C.indigo },
      { name: 'Google Cloud',          pct: 12.5, color: C.green  },
      { name: 'YouTube Ads',           pct: 10.2, color: C.rose   },
      { name: 'Google Network',        pct:  8.7, color: C.amber  },
      { name: 'Google Subscriptions',  pct:  7.4, color: C.teal   },
      { name: 'Other Bets',            pct:  0.5, color: C.slate  },
      { name: 'Hedging',               pct:  3.7, color: C.violet },
    ],
  },
  AMZN: {
    period: 'FY 2024',
    segments: [
      { name: 'AWS',                      pct: 17.2, color: C.amber  },
      { name: 'Online Stores',            pct: 38.4, color: C.indigo },
      { name: 'Third-party Seller Svcs',  pct: 24.1, color: C.green  },
      { name: 'Advertising',              pct:  8.9, color: C.rose   },
      { name: 'Subscription Services',    pct:  7.0, color: C.teal   },
      { name: 'Physical Stores',          pct:  3.5, color: C.violet },
      { name: 'Other',                    pct:  0.9, color: C.slate  },
    ],
  },
  META: {
    period: 'FY 2024',
    segments: [
      { name: 'Advertising (Family of Apps)', pct: 98.1, color: C.indigo },
      { name: 'Reality Labs',                 pct:  1.9, color: C.rose   },
    ],
  },
  NVDA: {
    period: 'FY 2025',
    segments: [
      { name: 'Data Center',         pct: 88.1, color: C.green  },
      { name: 'Gaming',              pct:  7.9, color: C.indigo },
      { name: 'Professional Viz',    pct:  2.3, color: C.amber  },
      { name: 'Automotive & OEM',    pct:  1.7, color: C.teal   },
    ],
  },
  TSLA: {
    period: 'FY 2024',
    segments: [
      { name: 'Automotive',               pct: 77.8, color: C.rose   },
      { name: 'Energy Generation & Storage', pct: 12.5, color: C.amber  },
      { name: 'Services & Other',         pct:  9.7, color: C.indigo },
    ],
  },
  NFLX: {
    period: 'FY 2024',
    segments: [
      { name: 'US & Canada',              pct: 43.1, color: C.rose   },
      { name: 'Europe, ME & Africa',      pct: 31.4, color: C.indigo },
      { name: 'Latin America',            pct: 13.5, color: C.amber  },
      { name: 'Asia Pacific',             pct: 12.0, color: C.green  },
    ],
  },
  MSFT: {
    period: 'FY 2024',
    segments: [
      { name: 'Intelligent Cloud',       pct: 43.3, color: C.indigo },
      { name: 'Productivity & Business', pct: 33.5, color: C.green  },
      { name: 'Personal Computing',      pct: 23.2, color: C.amber  },
    ],
  },
  INTC: {
    period: 'FY 2024',
    segments: [
      { name: 'Client Computing',   pct: 52.3, color: C.indigo },
      { name: 'Data Center & AI',   pct: 28.7, color: C.green  },
      { name: 'Network & Edge',     pct: 11.3, color: C.amber  },
      { name: 'Mobileye',           pct:  5.1, color: C.teal   },
      { name: 'Intel Foundry',      pct:  2.6, color: C.slate  },
    ],
  },
  AMD: {
    period: 'FY 2024',
    segments: [
      { name: 'Data Center', pct: 51.8, color: C.green  },
      { name: 'Client',      pct: 29.0, color: C.indigo },
      { name: 'Gaming',      pct: 12.6, color: C.rose   },
      { name: 'Embedded',    pct:  6.6, color: C.amber  },
    ],
  },
  CRM: {
    period: 'FY 2025',
    segments: [
      { name: 'Subscription & Support', pct: 93.9, color: C.indigo },
      { name: 'Professional Services',  pct:  6.1, color: C.green  },
    ],
  },
  ORCL: {
    period: 'FY 2024',
    segments: [
      { name: 'Cloud & License',        pct: 73.4, color: C.indigo },
      { name: 'Cloud Infrastructure',   pct: 16.5, color: C.green  },
      { name: 'Hardware',               pct:  6.2, color: C.amber  },
      { name: 'Services',               pct:  3.9, color: C.slate  },
    ],
  },
  ADBE: {
    period: 'FY 2024',
    segments: [
      { name: 'Digital Media',      pct: 75.2, color: C.rose   },
      { name: 'Digital Experience', pct: 23.0, color: C.indigo },
      { name: 'Publishing & Other', pct:  1.8, color: C.slate  },
    ],
  },
  WMT: {
    period: 'FY 2025',
    segments: [
      { name: 'Walmart US',          pct: 66.7, color: C.indigo },
      { name: 'International',       pct: 23.0, color: C.green  },
      { name: "Sam's Club",          pct: 10.3, color: C.amber  },
    ],
  },
  COST: {
    period: 'FY 2024',
    segments: [
      { name: 'US',                  pct: 72.8, color: C.indigo },
      { name: 'Canada',              pct: 15.5, color: C.rose   },
      { name: 'Other International', pct: 11.7, color: C.amber  },
    ],
  },
  DIS: {
    period: 'FY 2024',
    segments: [
      { name: 'Entertainment', pct: 38.7, color: C.indigo },
      { name: 'Sports',        pct: 22.6, color: C.rose   },
      { name: 'Experiences',   pct: 38.7, color: C.amber  },
    ],
  },
  JPM: {
    period: 'FY 2024',
    segments: [
      { name: 'Consumer & Community Banking', pct: 41.2, color: C.indigo },
      { name: 'Corporate & Investment Bank',  pct: 34.7, color: C.green  },
      { name: 'Commercial Banking',           pct: 14.5, color: C.amber  },
      { name: 'Asset & Wealth Mgmt',          pct:  9.6, color: C.teal   },
    ],
  },
  BAC: {
    period: 'FY 2024',
    segments: [
      { name: 'Consumer Banking',       pct: 36.1, color: C.indigo },
      { name: 'Global Banking',         pct: 26.4, color: C.green  },
      { name: 'Global Markets',         pct: 22.9, color: C.amber  },
      { name: 'Global Wealth & Invest', pct: 14.6, color: C.teal   },
    ],
  },
  V: {
    period: 'FY 2024',
    segments: [
      { name: 'Service Charges',     pct: 35.0, color: C.indigo },
      { name: 'Data Processing',     pct: 34.5, color: C.green  },
      { name: 'International',       pct: 25.0, color: C.amber  },
      { name: 'Other',               pct:  5.5, color: C.slate  },
    ],
  },
  MA: {
    period: 'FY 2024',
    segments: [
      { name: 'Payment Network',      pct: 51.7, color: C.rose   },
      { name: 'Value-Added Services', pct: 48.3, color: C.indigo },
    ],
  },
  UNH: {
    period: 'FY 2024',
    segments: [
      { name: 'UnitedHealthcare', pct: 78.4, color: C.indigo },
      { name: 'Optum Health',     pct: 12.0, color: C.green  },
      { name: 'Optum Rx',         pct:  5.8, color: C.amber  },
      { name: 'Optum Insight',    pct:  3.8, color: C.teal   },
    ],
  },
  JNJ: {
    period: 'FY 2024',
    segments: [
      { name: 'Innovative Medicine', pct: 62.3, color: C.rose   },
      { name: 'MedTech',             pct: 37.7, color: C.indigo },
    ],
  },
  PFE: {
    period: 'FY 2024',
    segments: [
      { name: 'Primary Care',  pct: 38.5, color: C.indigo },
      { name: 'Specialty Care',pct: 28.0, color: C.green  },
      { name: 'Hospital',      pct: 20.0, color: C.amber  },
      { name: 'Oncology',      pct: 13.5, color: C.rose   },
    ],
  },
  SBUX: {
    period: 'FY 2024',
    segments: [
      { name: 'North America',   pct: 74.3, color: C.green  },
      { name: 'International',   pct: 13.5, color: C.indigo },
      { name: 'Channel Dev.',    pct:  6.4, color: C.amber  },
      { name: 'Corporate',       pct:  5.8, color: C.slate  },
    ],
  },
  PYPL: {
    period: 'FY 2024',
    segments: [
      { name: 'Transaction Revenues', pct: 88.5, color: C.indigo },
      { name: 'Other Value Added',    pct: 11.5, color: C.green  },
    ],
  },
  BRKB: {
    period: 'FY 2023',
    segments: [
      { name: 'Insurance',     pct: 27.5, color: C.indigo },
      { name: 'BNSF Railroad', pct: 21.3, color: C.amber  },
      { name: 'Manufacturing', pct: 18.9, color: C.green  },
      { name: 'Berkshire Energy', pct: 14.2, color: C.yellow },
      { name: 'Service/Retail',  pct: 18.1, color: C.slate  },
    ],
  },
  BRK_B: {
    period: 'FY 2023',
    segments: [
      { name: 'Insurance',     pct: 27.5, color: C.indigo },
      { name: 'BNSF Railroad', pct: 21.3, color: C.amber  },
      { name: 'Manufacturing', pct: 18.9, color: C.green  },
      { name: 'Berkshire Energy', pct: 14.2, color: C.yellow },
      { name: 'Service/Retail',  pct: 18.1, color: C.slate  },
    ],
  },
};

// Normalize ticker (handles "BRK-B" → "BRK_B" etc.)
export function getSegments(symbol) {
  const key = symbol?.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  return REVENUE_SEGMENTS[key] ?? REVENUE_SEGMENTS[symbol?.toUpperCase()] ?? null;
}
