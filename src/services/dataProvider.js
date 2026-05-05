// ─── Data Provider ────────────────────────────────────────────────────────────
// All market data flows through this module.
// To swap providers: update BASE_URL or the individual endpoint builders below.
// The proxy in vite.config.js translates the active provider's wire format into
// the Yahoo Finance JSON shape expected by parsers.js.
//
// Current backend: NASDAQ public API (api.nasdaq.com) via Vite proxy.

const BASE = '/api/yahoo';

async function apiFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const PROVIDER_NAME = 'NASDAQ';

export const endpoints = {
  chart:    (symbol, interval, range) =>
              `${BASE}/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
  quotes:   (symbols) =>
              `${BASE}/quotes?symbols=${symbols.map(encodeURIComponent).join(',')}`,
  summary:  (symbol, modules) =>
              `${BASE}/summary/${encodeURIComponent(symbol)}?modules=${encodeURIComponent(modules)}`,
  earnings: (symbol) =>
              `${BASE}/earnings/${encodeURIComponent(symbol)}`,
  search:   (query, quotesCount, newsCount) =>
              `${BASE}/search?q=${encodeURIComponent(query)}&quotesCount=${quotesCount}&newsCount=${newsCount}`,
};

export function fetchChart(symbol, interval = '1d', range = '3mo') {
  return apiFetch(endpoints.chart(symbol, interval, range));
}

export function fetchQuotes(symbols) {
  return apiFetch(endpoints.quotes(symbols));
}

export function fetchSummary(symbol, modules = 'summaryDetail,defaultKeyStatistics,assetProfile,financialData') {
  return apiFetch(endpoints.summary(symbol, modules));
}

export function fetchEarnings(symbol) {
  return apiFetch(endpoints.earnings(symbol));
}

export function fetchSearch(query, quotesCount = 6, newsCount = 0) {
  return apiFetch(endpoints.search(query, quotesCount, newsCount));
}

export function fetchNews(symbol, newsCount = 8) {
  return apiFetch(endpoints.search(symbol, 0, newsCount));
}

export function fetchInstitutional(symbol) {
  return apiFetch(`${BASE}/institutional/${encodeURIComponent(symbol)}`);
}

export function fetchEarningsCalendar(date) {
  return apiFetch(`${BASE}/earnings-calendar?date=${encodeURIComponent(date)}`);
}
