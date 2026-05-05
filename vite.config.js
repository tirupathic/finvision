import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'node:https';
import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

// ─── Disk cache ───────────────────────────────────────────────────────────────
const CACHE_DIR = '/tmp/finvision-nasdaq-cache';
try { mkdirSync(CACHE_DIR, { recursive: true }); } catch {}

function cacheKey(url) {
  return join(CACHE_DIR, createHash('md5').update(url).digest('hex') + '.json');
}
function cacheRead(url) {
  try {
    const { data, expiry } = JSON.parse(readFileSync(cacheKey(url), 'utf8'));
    return Date.now() < expiry ? { data, fresh: true } : { data, fresh: false };
  } catch { return null; }
}
function cacheWrite(url, data, ttlMs) {
  try { writeFileSync(cacheKey(url), JSON.stringify({ data, expiry: Date.now() + ttlMs })); } catch {}
}

// ─── NASDAQ fetch ─────────────────────────────────────────────────────────────
const NASDAQ_BASE = 'https://api.nasdaq.com';
const NASDAQ_HDR = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.nasdaq.com',
  'Referer': 'https://www.nasdaq.com/',
};

function rawFetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { headers }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ data, status: res.statusCode }));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function nasdaqFetch(path, ttlMs = 15_000) {
  const url = NASDAQ_BASE + path;
  const cached = cacheRead(url);
  if (cached?.fresh) return JSON.parse(cached.data);
  try {
    const r = await rawFetch(url, NASDAQ_HDR);
    if (r.status >= 400) throw new Error(`HTTP ${r.status}`);
    cacheWrite(url, r.data, ttlMs);
    return JSON.parse(r.data);
  } catch (err) {
    if (cached) {
      console.warn('[NASDAQ] Stale cache for', path.slice(0, 80));
      return JSON.parse(cached.data);
    }
    throw err;
  }
}

// ─── Asset class routing ──────────────────────────────────────────────────────
const ETF_SET    = new Set([
  'SPY','QQQ','DIA','IWM','GLD','USO','XLF','XLK','XLE','XLV','VTI','VOO','AGG','TLT','HYG','ARKK',
  'TQQQ','UPRO','SPXL','TECL','UDOW','TNA','SOXL','FNGU','FAS','LABU','NAIL','BULZ',
  'SQQQ','SPXU','SPXS','TECS','SDOW','TZA','SOXS','FNGD','FAZ','LABD',
  'UVXY','SVXY',
]);
const CRYPTO_SET = new Set(['BTC-USD','ETH-USD','BNB-USD','SOL-USD','XRP-USD','DOGE-USD','ADA-USD']);

function assetClass(sym) {
  if (CRYPTO_SET.has(sym)) return 'crypto';
  if (ETF_SET.has(sym))    return 'etf';
  return 'stocks';
}

// ─── Number parsers ───────────────────────────────────────────────────────────
function parseNum(s) {
  if (s == null) return 0;
  const n = parseFloat(String(s).replace(/[$,%+]/g, '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseCap(s) {
  if (!s) return 0;
  const m = String(s).replace(/[$,\s]/g, '').match(/([\d.]+)([TBMKtbmk]?)/);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const mult = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 }[m[2].toUpperCase()] || 1;
  return v * mult;
}

// ─── NASDAQ → Yahoo Finance format converters ─────────────────────────────────

function nasdaqInfoToQuote(raw, sym) {
  const d  = raw?.data || {};
  const p  = d.primaryData || {};
  const ks = d.keyStats    || {};

  const price     = parseNum(p.lastSalePrice);
  const change    = parseNum(p.netChange);
  const pctStr    = String(p.percentageChange || '0').replace(/[+%]/g, '');
  const changePct = parseFloat(pctStr) || (price && change ? (change / (price - change)) * 100 : 0);
  const prev      = price - change;
  const vol       = parseNum(ks.volume?.value || p.volume);

  // NASDAQ format: "193.25 - 288.62" (low - high)
  const hwStr = String(ks.fiftyTwoWeekHighLow?.value || '0 - 0');
  const hwParts = hwStr.split(/\s*-\s*/);
  const l52 = parseNum(hwParts[0]);
  const h52 = parseNum(hwParts[1]);

  // NASDAQ day range: "278.37 - 287.21" (low - high)
  const drStr = String(ks.dayrange?.value || '0 - 0');
  const drParts = drStr.split(/\s*-\s*/);
  const dayLow  = parseNum(drParts[0]);
  const dayHigh = parseNum(drParts[1]);

  const cap = parseCap(ks.marketCap?.value);
  const pe  = parseNum(ks.peRatio?.value) || null;

  return {
    symbol:                     sym,
    shortName:                  d.companyName || sym,
    regularMarketPrice:         price,
    regularMarketChange:        +change.toFixed(4),
    regularMarketChangePercent: +changePct.toFixed(4),
    regularMarketVolume:        vol,
    regularMarketDayHigh:       dayHigh || +(price * 1.005).toFixed(2),
    regularMarketDayLow:        dayLow  || +(price * 0.995).toFixed(2),
    regularMarketOpen:          parseNum(ks.previousClose?.value) || +(prev * 1.002).toFixed(2),
    regularMarketPreviousClose: prev,
    marketCap:                  cap,
    trailingPE:                 pe,
    fiftyTwoWeekHigh:           h52,
    fiftyTwoWeekLow:            l52,
    fullExchangeName:           d.exchange || 'NASDAQ',
  };
}

function nasdaqChartToYF(raw, sym, ac = 'stocks') {
  const d        = raw?.data || {};
  const chartArr = d.chart   || [];
  const name     = d.companyName || sym;

  const timestamps = [], opens = [], highs = [], lows = [], closes = [], volumes = [];

  for (const pt of chartArr) {
    const ts = typeof pt.x === 'number'
      ? (pt.x > 1e10 ? Math.floor(pt.x / 1000) : pt.x)
      : Math.floor(new Date(pt.x).getTime() / 1000);

    // NASDAQ format: pt.z has OHLCV strings, pt.y is close as a number
    const z = pt.z || {};
    const c = parseNum(z.close ?? z.value) || (typeof pt.y === 'number' ? pt.y : 0);
    if (!c) continue;

    timestamps.push(ts);
    opens.push(parseNum(z.open)   || c);
    highs.push(parseNum(z.high)   || c);
    lows.push(parseNum(z.low)    || c);
    closes.push(c);
    volumes.push(Math.floor(parseNum(z.volume) || 0));
  }

  const price = closes.at(-1) || 0;
  const prev  = closes.at(-2) || price;

  return {
    chart: {
      result: [{
        meta: {
          symbol: sym, longName: name, shortName: name,
          regularMarketPrice:   price,
          chartPreviousClose:   prev,
          regularMarketVolume:  volumes.at(-1) || 0,
          regularMarketDayHigh: highs.at(-1)   || price,
          regularMarketDayLow:  lows.at(-1)    || price,
          regularMarketOpen:    opens.at(-1)   || price,
          fullExchangeName: 'NASDAQ', currency: 'USD', assetClass: ac,
        },
        timestamp:  timestamps,
        indicators: { quote: [{ open: opens, high: highs, low: lows, close: closes, volume: volumes }] },
      }],
      error: null,
    },
  };
}

function nasdaqSummaryToYF(raw) {
  const d  = raw?.data || {};
  const ks = d.keyStats || {};

  const price = parseNum(d.primaryData?.lastSalePrice);
  const cap   = parseCap(ks.marketCap?.value);
  const pe    = parseNum(ks.peRatio?.value)       || null;
  const beta  = parseNum(ks.beta?.value)          || null;
  const eps   = parseNum(ks.eps?.value)           || null;
  const divY  = parseNum(ks.dividendYield?.value) || null;

  const hwStr  = String(ks.fiftyTwoWeekHighLow?.value || '0 - 0');
  const hwParts = hwStr.split(/\s*-\s*/);
  const l52raw = hwParts[0];
  const h52raw = hwParts[1];

  return {
    quoteSummary: {
      result: [{
        summaryDetail: {
          marketCap:      { raw: cap  },
          trailingPE:     { raw: pe   },
          forwardPE:      { raw: null },
          dividendYield:  { raw: divY ? divY / 100 : null },
          beta:           { raw: beta },
          fiftyTwoWeekHigh: { raw: parseNum(h52raw) },
          fiftyTwoWeekLow:  { raw: parseNum(l52raw) },
          averageVolume:    { raw: parseNum(ks.averagevolume?.value) },
          regularMarketVolume: { raw: parseNum(d.primaryData?.volume) },
        },
        defaultKeyStatistics: {
          trailingEps:     { raw: eps  },
          forwardEps:      { raw: null },
          bookValue:       { raw: null },
          priceToBook:     { raw: null },
          sharesOutstanding: { raw: cap && price ? Math.round(cap / price) : null },
        },
        assetProfile: {
          longBusinessSummary: '',
          sector:   d.stockType || '',
          industry: '',
          website:  '',
          fullTimeEmployees: null,
        },
        financialData: {
          currentPrice:    { raw: price },
          revenueGrowth:   { raw: null },
          grossMargins:    { raw: null },
          operatingMargins:{ raw: null },
          profitMargins:   { raw: null },
          returnOnEquity:  { raw: null },
          totalDebt:       { raw: null },
          totalRevenue:    { raw: null },
          earningsGrowth:  { raw: null },
        },
      }],
      error: null,
    },
  };
}

// NASDAQ income-statement → Yahoo Finance earnings format
// NASDAQ values are in thousands: "$416,161,000" = $416.161B
function nasdaqFinancialsToYF(raw) {
  const emptyYF = {
    quoteSummary: {
      result: [{ incomeStatementHistoryQuarterly: { incomeStatementHistory: [] }, earningsHistory: { history: [] } }],
      error: null,
    },
  };
  const tbl = raw?.data?.incomeStatementTable;
  if (!tbl?.headers || !tbl?.rows?.length) return emptyYF;

  // Extract period dates (value2-5 in headers)
  const hdrs = tbl.headers;
  const periods = ['value2', 'value3', 'value4', 'value5']
    .map(k => hdrs[k]).filter(Boolean);
  if (!periods.length) return emptyYF;

  // Build row lookup: normalised title → object with value2-5
  const byTitle = {};
  for (const row of tbl.rows) {
    const key = (row.value1 || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!byTitle[key]) byTitle[key] = row;
  }

  // Parse "$416,161,000" (in thousands) to raw dollars
  function parseFin(str) {
    if (!str || str === '--' || str === 'N/A') return null;
    const neg = str.startsWith('-') || (str.startsWith('(') && str.endsWith(')'));
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? null : (neg ? -1 : 1) * num * 1000; // thousands → dollars
  }

  function getRow(...titles) {
    for (const t of titles) {
      const key = t.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (byTitle[key]) return byTitle[key];
    }
    return {};
  }

  const revRow = getRow('Total Revenue', 'Net Revenue', 'Revenue');
  const niRow  = getRow('Net Income Applicable to Common Shareholders', 'Net Income', 'Net Income-Cont. Operations');
  const gpRow  = getRow('Gross Profit');
  const opRow  = getRow('Operating Income');

  const history = periods.map((period, i) => {
    const vk = `value${i + 2}`;
    return {
      endDate:         { fmt: period },
      totalRevenue:    { raw: parseFin(revRow[vk]) },
      netIncome:       { raw: parseFin(niRow[vk])  },
      grossProfit:     { raw: parseFin(gpRow[vk])  },
      operatingIncome: { raw: parseFin(opRow[vk])  },
      dilutedEps:      { raw: null },
    };
  });

  return {
    quoteSummary: {
      result: [{ incomeStatementHistoryQuarterly: { incomeStatementHistory: history }, earningsHistory: { history: [] } }],
      error: null,
    },
  };
}

// NASDAQ autocomplete → Yahoo Finance search quotes format
function nasdaqSearchToYF(raw) {
  // NASDAQ returns data as a direct array
  const items = Array.isArray(raw?.data) ? raw.data : (raw?.data?.suggestions || raw?.data?.items || []);
  return {
    quotes: items.slice(0, 8).map(s => ({
      symbol:       s.symbol || s.value || '',
      longname:     s.name   || s.symbol || '',
      shortname:    s.name   || s.symbol || '',
      exchDisp:     s.exchange || 'NASDAQ',
      quoteType:    'EQUITY',
      isYahooFinance: true,
    })),
  };
}

// ─── Date range helper ────────────────────────────────────────────────────────
function dateRange(range) {
  const to   = new Date();
  const from = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  if (range === 'ytd') {
    from.setMonth(0, 1);
    return { from: fmt(from), to: fmt(to) };
  }
  const days = { '1d': 5, '5d': 7, '1mo': 35, '3mo': 95, '6mo': 185, '1y': 370, '2y': 740, '3y': 1100, '5y': 1830 };
  from.setDate(from.getDate() - (days[range] || 95));
  return { from: fmt(from), to: fmt(to) };
}

// ─── Crypto (NASDAQ doesn't cover crypto) ────────────────────────────────────
const CRYPTO_MOCK = {
  'BTC-USD': { name: 'Bitcoin USD',   price: 93450, ch: 1230,  h52: 108000, l52: 52000, vol: 28e9 },
  'ETH-USD': { name: 'Ethereum USD',  price:  3280, ch:  -45,  h52:   4100, l52:  1500, vol: 12e9 },
};

function cryptoQuote(sym) {
  const m    = CRYPTO_MOCK[sym] || { name: sym, price: 1, ch: 0, h52: 1, l52: 1, vol: 0 };
  const prev = m.price - m.ch;
  return {
    symbol: sym, shortName: m.name,
    regularMarketPrice:         m.price,
    regularMarketChange:        m.ch,
    regularMarketChangePercent: +((m.ch / prev) * 100).toFixed(4),
    regularMarketVolume:        m.vol,
    regularMarketDayHigh:       +(m.price * 1.02).toFixed(2),
    regularMarketDayLow:        +(m.price * 0.98).toFixed(2),
    regularMarketOpen:          prev,
    regularMarketPreviousClose: prev,
    marketCap: 0, trailingPE: null,
    fiftyTwoWeekHigh: m.h52, fiftyTwoWeekLow: m.l52,
    fullExchangeName: 'CCC',
  };
}

function cryptoChart(sym, range) {
  const m    = CRYPTO_MOCK[sym] || { price: 1, ch: 0, name: sym };
  const days = { '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365 };
  const n    = days[range] || 90;
  let price  = m.price * 0.85;
  const now  = Math.floor(Date.now() / 1000);
  const timestamps = [], opens = [], highs = [], lows = [], closes = [], volumes = [];
  for (let i = n; i >= 0; i--) {
    price = price * (1 + (Math.random() - 0.48) * 0.025);
    timestamps.push(now - i * 86400);
    closes.push(+price.toFixed(2));
    opens.push(+(price * (1 - Math.random() * 0.01)).toFixed(2));
    highs.push(+(price * (1 + Math.random() * 0.015)).toFixed(2));
    lows.push(+(price * (1 - Math.random() * 0.015)).toFixed(2));
    volumes.push(Math.floor(m.vol * (0.7 + Math.random() * 0.6)));
  }
  const lastClose = closes.at(-1);
  return {
    chart: {
      result: [{
        meta: {
          symbol: sym, longName: m.name, shortName: m.name,
          regularMarketPrice: lastClose, chartPreviousClose: closes.at(-2) || lastClose,
          regularMarketVolume: volumes.at(-1) || 0,
          regularMarketDayHigh: highs.at(-1) || lastClose,
          regularMarketDayLow:  lows.at(-1)  || lastClose,
          regularMarketOpen:    opens.at(-1) || lastClose,
          fullExchangeName: 'CCC', currency: 'USD',
        },
        timestamp:  timestamps,
        indicators: { quote: [{ open: opens, high: highs, low: lows, close: closes, volume: volumes }] },
      }],
      error: null,
    },
  };
}

// ─── Bulk quotes (parallel NASDAQ calls) ─────────────────────────────────────
async function fetchBulkQuotes(symbols) {
  const results = await Promise.allSettled(
    symbols.map(async sym => {
      if (CRYPTO_SET.has(sym)) return cryptoQuote(sym);
      const ac  = assetClass(sym);
      const raw = await nasdaqFetch(`/api/quote/${encodeURIComponent(sym)}/info?assetclass=${ac}`, 15_000);
      return nasdaqInfoToQuote(raw, sym);
    })
  );
  const result = results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return [r.value];
    console.warn('[NASDAQ] Quote failed:', symbols[i], r.reason?.message);
    return [];
  });
  return { quoteResponse: { result, error: null } };
}

// ─── Google News RSS → news items ────────────────────────────────────────────

function parseRSS(xml, limit) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < limit) {
    const body = m[1];
    const tag  = (name) => {
      const r = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`);
      const mm = body.match(r);
      return mm ? mm[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };
    const rawTitle = tag('title');
    // Google News appends " - Publisher" to the title
    const dashIdx  = rawTitle.lastIndexOf(' - ');
    const title    = dashIdx > 0 ? rawTitle.slice(0, dashIdx).trim() : rawTitle;
    const publisher = tag('source') || (dashIdx > 0 ? rawTitle.slice(dashIdx + 3).trim() : 'News');
    const link     = tag('link') || tag('guid');
    const pubDate  = tag('pubDate');
    const ts       = pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000);

    if (!title || !link) continue;
    items.push({
      uuid:                createHash('md5').update(link).digest('hex').slice(0, 16),
      title,
      publisher,
      link,
      providerPublishTime: ts,
      relatedTickers:      [],
      thumbnail:           null,
    });
  }
  return items;
}

async function fetchGoogleNews(query, limit = 12) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const cached = cacheRead(url);
  if (cached?.fresh) return JSON.parse(cached.data);

  const r = await rawFetch(url, {
    'User-Agent': NASDAQ_HDR['User-Agent'],
    'Accept': 'application/rss+xml, application/xml, text/xml',
  });
  if (r.status >= 400) throw new Error(`Google News HTTP ${r.status}`);

  const items  = parseRSS(r.data, limit);
  const result = JSON.stringify({ news: items });
  cacheWrite(url, result, 300_000);
  return JSON.parse(result);
}

// ─── Vite plugin ──────────────────────────────────────────────────────────────
function nasdaqProxy() {
  return {
    name: 'nasdaq-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/yahoo/')) return next();
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Access-Control-Allow-Origin', '*');
        try {
          const { pathname, searchParams } = new URL(req.url, 'http://localhost');

          // ── Chart ──────────────────────────────────────────────────────────
          if (pathname.startsWith('/api/yahoo/chart/')) {
            const sym   = decodeURIComponent(pathname.replace('/api/yahoo/chart/', ''));
            const range = searchParams.get('range') || '3mo';
            if (CRYPTO_SET.has(sym)) {
              return res.end(JSON.stringify(cryptoChart(sym, range)));
            }
            const { from, to } = dateRange(range);
            const ac  = assetClass(sym);
            const raw = await nasdaqFetch(
              `/api/quote/${encodeURIComponent(sym)}/chart?assetclass=${ac}&fromdate=${from}&todate=${to}`,
              60_000,
            );
            return res.end(JSON.stringify(nasdaqChartToYF(raw, sym, ac)));
          }

          // ── Bulk quotes ────────────────────────────────────────────────────
          if (pathname === '/api/yahoo/quotes') {
            const symbols = (searchParams.get('symbols') || '').split(',').filter(Boolean);
            const data    = await fetchBulkQuotes(symbols);
            return res.end(JSON.stringify(data));
          }

          // ── Summary (fundamentals) ─────────────────────────────────────────
          if (pathname.startsWith('/api/yahoo/summary/')) {
            const sym = decodeURIComponent(pathname.replace('/api/yahoo/summary/', ''));
            if (CRYPTO_SET.has(sym)) {
              const q = cryptoQuote(sym);
              return res.end(JSON.stringify({
                quoteSummary: { result: [{ summaryDetail: {}, defaultKeyStatistics: {}, assetProfile: {}, financialData: { currentPrice: { raw: q.regularMarketPrice } } }], error: null },
              }));
            }
            const ac  = assetClass(sym);
            const raw = await nasdaqFetch(`/api/quote/${encodeURIComponent(sym)}/summary?assetclass=${ac}`, 300_000);
            return res.end(JSON.stringify(nasdaqSummaryToYF(raw)));
          }

          // ── Earnings ───────────────────────────────────────────────────────
          if (pathname.startsWith('/api/yahoo/earnings/')) {
            const eSym = pathname.split('/').pop();
            if (ETF_SET.has(eSym) || CRYPTO_SET.has(eSym)) {
              return res.end(JSON.stringify({
                quoteSummary: { result: [{ incomeStatementHistoryQuarterly: { incomeStatementHistory: [] }, earningsHistory: { history: [] } }], error: null },
              }));
            }
            const raw = await nasdaqFetch(`/api/company/${encodeURIComponent(eSym)}/financials?type=income-statement`, 3_600_000);
            return res.end(JSON.stringify(nasdaqFinancialsToYF(raw)));
          }

          // ── Earnings calendar ─────────────────────────────────────────────
          if (pathname === '/api/yahoo/earnings-calendar') {
            const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
            try {
              const raw = await nasdaqFetch(`/api/calendar/earnings?date=${date}`, 3_600_000);
              return res.end(JSON.stringify(raw));
            } catch {
              return res.end(JSON.stringify({ data: { rows: [], totalRecords: 0 } }));
            }
          }

          // ── Institutional ownership ────────────────────────────────────────
          if (pathname.startsWith('/api/yahoo/institutional/')) {
            const iSym = decodeURIComponent(pathname.replace('/api/yahoo/institutional/', ''));
            if (ETF_SET.has(iSym) || CRYPTO_SET.has(iSym)) {
              return res.end(JSON.stringify({ data: null }));
            }
            try {
              const raw = await nasdaqFetch(
                `/api/company/${encodeURIComponent(iSym)}/institutional-holdings?limit=15&type=TOTAL&sortColumn=marketValue&sortOrder=DESC`,
                3_600_000,
              );
              return res.end(JSON.stringify(raw));
            } catch {
              return res.end(JSON.stringify({ data: null }));
            }
          }

          // ── Search / news ──────────────────────────────────────────────────
          if (pathname === '/api/yahoo/search') {
            const q          = searchParams.get('q')           || '';
            const newsCount  = Number(searchParams.get('newsCount')  || '0');
            const quotesCount = Number(searchParams.get('quotesCount') || '0');

            if (newsCount > 0) {
              const query = q && q !== 'stock market'
                ? `${q} stock`
                : 'stock market finance Wall Street';
              const data = await fetchGoogleNews(query, newsCount);
              return res.end(JSON.stringify(data));
            }

            if (q && quotesCount > 0) {
              const raw  = await nasdaqFetch(`/api/autocomplete/slookup/10?search=${encodeURIComponent(q)}`, 30_000);
              return res.end(JSON.stringify(nasdaqSearchToYF(raw)));
            }

            return res.end(JSON.stringify({ quotes: [] }));
          }

          res.statusCode = 404;
          res.end('{"error":"unknown route"}');
        } catch (err) {
          console.error('[NASDAQ Proxy]', err.message);
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), nasdaqProxy()],
});
