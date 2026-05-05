// ─── Parsers ─────────────────────────────────────────────────────────────────
// Parse Yahoo Finance wire-format responses into clean application objects.
// Fetch functions live in dataProvider.js — swap that file to change backends.

export function parseChart(data) {
  const result = data?.chart?.result?.[0];
  if (!result) return null;

  const meta   = result.meta;
  const quote  = result.indicators?.quote?.[0] || {};
  const timestamps = result.timestamp || [];

  const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? 0;
  const price  = meta.regularMarketPrice ?? 0;
  const change = +(price - prevClose).toFixed(4);
  const pct    = prevClose ? +((change / prevClose) * 100).toFixed(4) : 0;

  const ohlcv = timestamps
    .map((ts, i) => {
      const close = quote.close?.[i];
      if (close == null) return null;
      return {
        date:   new Date(ts * 1000).toISOString().slice(0, 10),
        open:   quote.open?.[i]   ?? close,
        high:   quote.high?.[i]   ?? close,
        low:    quote.low?.[i]    ?? close,
        close,
        volume: quote.volume?.[i] ?? 0,
        price:  close,
      };
    })
    .filter(Boolean);

  return {
    symbol:    meta.symbol,
    name:      meta.longName || meta.shortName || meta.symbol,
    isETF:     meta.assetClass === 'etf',
    price,
    change,
    pct,
    prevClose,
    open:      meta.regularMarketOpen      ?? ohlcv[ohlcv.length - 1]?.open,
    high:      meta.regularMarketDayHigh,
    low:       meta.regularMarketDayLow,
    volume:    meta.regularMarketVolume,
    week52High: meta.fiftyTwoWeekHigh,
    week52Low:  meta.fiftyTwoWeekLow,
    currency:   meta.currency,
    exchange:   meta.fullExchangeName || meta.exchangeName,
    ohlcv,
  };
}

export function parseQuotes(data) {
  return (data?.quoteResponse?.result || []).map(q => ({
    symbol:    q.symbol,
    name:      q.shortName || q.longName || q.symbol,
    price:     q.regularMarketPrice  ?? 0,
    change:    q.regularMarketChange ?? 0,
    pct:       q.regularMarketChangePercent ?? 0,
    volume:    q.regularMarketVolume ?? 0,
    avgVolume: q.averageDailyVolume10Day ?? q.averageVolume ?? 0,
    marketCap: q.marketCap ?? 0,
    pe:        q.trailingPE ?? null,
    forwardPE: q.forwardPE  ?? null,
    eps:       q.epsTrailingTwelveMonths ?? null,
    beta:      q.beta       ?? null,
    week52High: q.fiftyTwoWeekHigh ?? 0,
    week52Low:  q.fiftyTwoWeekLow  ?? 0,
    dividend:   q.trailingAnnualDividendRate ?? 0,
    yield:      q.trailingAnnualDividendYield ? +(q.trailingAnnualDividendYield * 100).toFixed(2) : 0,
    exchange:   q.fullExchangeName || q.exchange,
    prevClose:  q.regularMarketPreviousClose ?? 0,
    open:       q.regularMarketOpen          ?? 0,
    high:       q.regularMarketDayHigh       ?? 0,
    low:        q.regularMarketDayLow        ?? 0,
  }));
}

export function parseSummary(data) {
  const r = data?.quoteSummary?.result?.[0];
  if (!r) return null;

  const sd = r.summaryDetail       || {};
  const ks = r.defaultKeyStatistics || {};
  const ap = r.assetProfile        || {};
  const fd = r.financialData       || {};

  return {
    pe:             sd.trailingPE?.raw    ?? null,
    forwardPE:      sd.forwardPE?.raw     ?? null,
    marketCap:      sd.marketCap?.raw     ?? null,
    beta:           ks.beta?.raw          ?? null,
    eps:            ks.trailingEps?.raw   ?? null,
    dividend:       sd.dividendRate?.raw  ?? 0,
    dividendYield:  sd.dividendYield?.raw ? +(sd.dividendYield.raw * 100).toFixed(2) : 0,
    avgVolume:      sd.averageVolume?.raw ?? null,
    week52High:     sd.fiftyTwoWeekHigh?.raw ?? null,
    week52Low:      sd.fiftyTwoWeekLow?.raw  ?? null,
    description:    ap.longBusinessSummary ?? '',
    sector:         ap.sector    ?? '',
    industry:       ap.industry  ?? '',
    employees:      ap.fullTimeEmployees ?? null,
    website:        ap.website   ?? '',
    revenueGrowth:  fd.revenueGrowth?.raw          ? +(fd.revenueGrowth.raw * 100).toFixed(1) : null,
    grossMargins:   fd.grossMargins?.raw          ? +(fd.grossMargins.raw * 100).toFixed(1) : null,
    profitMargins:  fd.profitMargins?.raw         ? +(fd.profitMargins.raw * 100).toFixed(1) : null,
    currentPrice:   fd.currentPrice?.raw          ?? null,
    targetMeanPrice:   fd.targetMeanPrice?.raw      ?? null,
    targetHighPrice:   fd.targetHighPrice?.raw     ?? null,
    targetLowPrice:    fd.targetLowPrice?.raw      ?? null,
    targetMedianPrice: fd.targetMedianPrice?.raw   ?? null,
    numAnalysts:       fd.numberOfAnalystOpinions?.raw ?? null,
    recommendationMean: fd.recommendationMean?.raw ?? null,
    recommendation: fd.recommendationKey          ?? null,
    totalCash:      fd.totalCash?.raw             ?? null,
    totalDebt:      fd.totalDebt?.raw             ?? null,
    freeCashflow:   fd.freeCashflow?.raw          ?? null,
    revenuePerShare: fd.revenuePerShare?.raw      ?? null,
    returnOnEquity:  fd.returnOnEquity?.raw        ? +(fd.returnOnEquity.raw * 100).toFixed(1) : null,
    earningsGrowth:  fd.earningsGrowth?.raw        ? +(fd.earningsGrowth.raw * 100).toFixed(1) : null,
  };
}

export function parseEarnings(data) {
  const r = data?.quoteSummary?.result?.[0];
  if (!r) return [];

  const history = r.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
  const rows = history.map(q => {
    const rev = q.totalRevenue?.raw ?? null;
    const gp  = q.grossProfit?.raw  ?? null;
    const ni  = q.netIncome?.raw    ?? null;
    const op  = q.operatingIncome?.raw ?? null;
    return {
      period:          q.endDate?.fmt ?? '',
      revenue:         rev != null ? +(rev / 1e9).toFixed(2) : null,
      netIncome:       ni  != null ? +(ni  / 1e9).toFixed(2) : null,
      grossProfit:     gp  != null ? +(gp  / 1e9).toFixed(2) : null,
      operatingIncome: op  != null ? +(op  / 1e9).toFixed(2) : null,
      eps:             q.dilutedEps?.raw ?? null,
      grossMargin:     gp && rev ? +((gp / rev) * 100).toFixed(1) : null,
      netMargin:       ni && rev ? +((ni / rev) * 100).toFixed(1) : null,
    };
  }).filter(q => q.revenue != null).reverse();

  // Compute YoY revenue growth (compare to same quarter 4 rows back)
  return rows.map((q, i) => ({
    ...q,
    revenueGrowthYoY: i >= 4 && rows[i - 4].revenue
      ? +((q.revenue / rows[i - 4].revenue - 1) * 100).toFixed(1)
      : null,
  }));
}

export function parseSearchQuotes(data) {
  return (data?.quotes || [])
    .filter(q => q.quoteType === 'EQUITY' && q.isYahooFinance)
    .map(q => ({
      symbol:   q.symbol,
      name:     q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp || q.exchange,
      sector:   q.sectorDisp || q.sector || '',
    }));
}

function inferCategory(title = '') {
  if (/earn|revenue|eps|profit|quarter|guidance/i.test(title))  return 'Earnings';
  if (/fed|inflation|gdp|rate|economy|recession|cpi|ppi/i.test(title)) return 'Economy';
  if (/crypto|bitcoin|ethereum|btc|eth|coinbase|defi|nft/i.test(title)) return 'Crypto';
  if (/\bai\b|artificial intelligence|chatgpt|openai|llm|gemini|claude/i.test(title)) return 'AI';
  if (/oil|gold|silver|commodity|crude|wheat|copper|natural gas/i.test(title)) return 'Commodities';
  if (/\bev\b|electric vehicle|ford|gm|toyota|tesla.*car|rivian|lucid/i.test(title)) return 'Autos';
  if (/apple|microsoft|google|meta|amazon|nvidia|samsung|chip|semiconductor/i.test(title)) return 'Tech';
  return 'Markets';
}

export function parseNews(data) {
  const now = Date.now() / 1000;
  return (data?.news || []).map(n => {
    const age = now - (n.providerPublishTime || now);
    let timeAgo;
    if (age < 3600)       timeAgo = `${Math.round(age / 60)}m ago`;
    else if (age < 86400) timeAgo = `${Math.round(age / 3600)}h ago`;
    else                  timeAgo = `${Math.round(age / 86400)}d ago`;
    return {
      id:        n.uuid,
      title:     n.title,
      source:    n.publisher,
      url:       n.link,
      time:      timeAgo,
      thumbnail: n.thumbnail?.resolutions?.[0]?.url ?? null,
      tickers:   n.relatedTickers || [],
      category:  inferCategory(n.title),
    };
  });
}

export function parseInstitutional(data) {
  const d = data?.data;
  if (!d) return null;

  const os = d.ownershipSummary || {};
  const summary = {
    instPct:        os.SharesOutstandingPCT?.value    || null,
    sharesOut:      os.ShareoutstandingTotal?.value   || null,
    holdingsValue:  os.TotalHoldingsValue?.value      || null,
  };

  const activeRows = d.activePositions?.rows || [];
  const activity = {};
  for (const row of activeRows) {
    const pos = (row.positions || '').toLowerCase();
    if (pos.includes('increased'))      activity.increased = { holders: row.holders, shares: row.shares };
    else if (pos.includes('decreased')) activity.decreased = { holders: row.holders, shares: row.shares };
    else if (pos.includes('new pos'))   activity.newPos    = { holders: row.holders, shares: row.shares };
  }
  const nspRows = d.newSoldOutPositions?.rows || [];
  for (const row of nspRows) {
    const pos = (row.positions || '').toLowerCase();
    if (pos.includes('new pos'))    activity.newPos    = { holders: row.holders, shares: row.shares };
    if (pos.includes('sold out'))   activity.soldOut   = { holders: row.holders, shares: row.shares };
  }

  const tableRows = d.holdingsTransactions?.table?.rows || [];
  const holders = tableRows.slice(0, 10).map(row => ({
    name:      row.ownerName   || '',
    date:      row.date        || '',
    shares:    row.sharesHeld  || '',
    change:    row.sharesChange || '',
    changePct: row.sharesChangePCT || '',
    value:     row.marketValue || '',
  })).filter(h => h.name);

  const totalHolders = d.holdingsTransactions?.institutionalHolders || null;
  const sharesHeld   = d.holdingsTransactions?.sharesHeld           || null;

  return { summary, activity, holders, totalHolders, sharesHeld };
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function fmt$(val, decimals = 2) {
  if (val == null) return '—';
  return `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatMarketCap(val) {
  if (val == null || val === 0) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val}`;
}

export function formatVolume(val) {
  if (val == null || val === 0) return '—';
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K`;
  return String(val);
}

export function colorClass(val) {
  if (val == null) return 'text-gray-400';
  return val >= 0 ? 'text-green-400' : 'text-red-400';
}

export function signStr(val, decimals = 2) {
  if (val == null) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(decimals)}`;
}

export function parseEarningsCalendar(raw) {
  const rows = raw?.data?.rows || [];
  return rows
    .filter(r => r.symbol)
    .map(r => {
      const timeRaw = (r.time || '').toLowerCase();
      const time = timeRaw.includes('after') ? 'AMC'
        : timeRaw.includes('pre') || timeRaw.includes('before') ? 'BMO'
        : '?';
      const stripDollar = s => s ? parseFloat(String(s).replace(/[^0-9.-]/g, '')) || null : null;
      return {
        symbol:               r.symbol,
        name:                 r.name || r.symbol,
        time,
        epsForecast:          stripDollar(r.epsForecast),
        lastYearEPS:          stripDollar(r.lastYearEPS),
        fiscalQuarterEnding:  r.fiscalQuarterEnding || '',
        numEstimates:         parseInt(r.noOfEsts) || 0,
        lastYearDate:         r.lastYearRptDt || '',
      };
    });
}
