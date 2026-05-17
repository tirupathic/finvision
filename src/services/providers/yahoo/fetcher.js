// ─── Yahoo / NASDAQ Fetcher ───────────────────────────────────────────────────
// Raw HTTP calls against the Vite proxy at /api/yahoo.
// Swap this file (or add a sibling provider dir) to change the data backend.

const BASE = '/api/yahoo';

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function fetchChart(symbol, interval = '1d', range = '3mo') {
  return apiFetch(`${BASE}/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`);
}

export function fetchQuotes(symbols) {
  return apiFetch(`${BASE}/quotes?symbols=${symbols.map(encodeURIComponent).join(',')}`);
}

export function fetchSummary(symbol, modules = 'summaryDetail,defaultKeyStatistics,assetProfile,financialData') {
  return apiFetch(`${BASE}/summary/${encodeURIComponent(symbol)}?modules=${encodeURIComponent(modules)}`);
}

export function fetchEarnings(symbol) {
  return apiFetch(`${BASE}/earnings/${encodeURIComponent(symbol)}`);
}

export function fetchSearch(query, quotesCount = 6, newsCount = 0) {
  return apiFetch(`${BASE}/search?q=${encodeURIComponent(query)}&quotesCount=${quotesCount}&newsCount=${newsCount}`);
}

export function fetchNews(symbol, newsCount = 8) {
  return apiFetch(`${BASE}/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=${newsCount}`);
}

export function fetchInstitutional(symbol) {
  return apiFetch(`${BASE}/institutional/${encodeURIComponent(symbol)}`);
}

export function fetchEarningsCalendar(date) {
  return apiFetch(`${BASE}/earnings-calendar?date=${encodeURIComponent(date)}`);
}
