// ─── Yahoo Finance Provider ───────────────────────────────────────────────────
// Composes fetcher + parser into a clean async API.
// All methods resolve to parsed application objects — callers never touch wire format.

import * as fetcher from './fetcher';
import * as parser  from './parser';

const yahooProvider = {
  name: 'Yahoo Finance (NASDAQ proxy)',

  chart:            (symbol, interval = '1d', range = '3mo') =>
                      fetcher.fetchChart(symbol, interval, range).then(parser.parseChart),

  quotes:           (symbols) =>
                      fetcher.fetchQuotes(symbols).then(parser.parseQuotes),

  summary:          (symbol) =>
                      fetcher.fetchSummary(symbol).then(parser.parseSummary),

  earnings:         (symbol) =>
                      fetcher.fetchEarnings(symbol).then(parser.parseEarnings),

  search:           (query, quotesCount = 6, newsCount = 0) =>
                      fetcher.fetchSearch(query, quotesCount, newsCount).then(parser.parseSearchQuotes),

  news:             (symbol, newsCount = 8) =>
                      fetcher.fetchNews(symbol, newsCount).then(parser.parseNews),

  institutional:    (symbol) =>
                      fetcher.fetchInstitutional(symbol).then(parser.parseInstitutional),

  earningsCalendar: (date) =>
                      fetcher.fetchEarningsCalendar(date).then(parser.parseEarningsCalendar),
};

export default yahooProvider;
