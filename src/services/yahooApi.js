// ─── Backward-compat facade ───────────────────────────────────────────────────
// All parser and formatting exports are now in their canonical locations:
//   Parsers:    src/services/providers/yahoo/parser.js
//   Formatting: src/services/formatting.js
//
// This file re-exports everything so existing imports continue to work unchanged.

export {
  parseChart,
  parseQuotes,
  parseSummary,
  parseEarnings,
  parseSearchQuotes,
  parseNews,
  parseInstitutional,
  parseEarningsCalendar,
} from './providers/yahoo/parser';

export {
  fmt$,
  formatMarketCap,
  formatVolume,
  colorClass,
  signStr,
} from './formatting';
