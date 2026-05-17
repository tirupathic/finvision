# FinVision

A dark-themed financial dashboard built with React 19 and Vite. Covers stocks, ETFs, crypto, portfolio tracking, earnings calendars, screener, trading strategies, and market education — all powered by real-time NASDAQ data with Yahoo Finance supplemental fundamentals.

---

## Features

### Pages & Routes

| Route | Description |
|---|---|
| `/` `/markets` | Live market overview — indices, top movers, sector heatmap |
| `/stock/:symbol` | Full stock detail: chart, fundamentals, earnings, news, institutional holders |
| `/stocks` | Browse stocks grouped by sector with live quotes |
| `/etfs` | ETF explorer with holdings, sector weights, and fund metadata |
| `/crypto` | Real-time crypto prices with sparklines, filterable by category |
| `/portfolio` | Portfolio tracker — add positions, see P&L, allocation pie chart |
| `/news` | Live market news feed |
| `/screener` | Stock screener with preset scanners, advanced filters, and signal badges |
| `/performance` | Multi-symbol performance comparison with rolling return distribution |
| `/strategies` | AI-powered trade ideas with ATR-based setups, signals, and options plays |
| `/earnings` `/calendar` | Weekly earnings calendar + economic events |
| `/education` | Curated learning resources, finance websites, and tools |

### Symbol Tab Bar

Open multiple stock detail pages simultaneously — each visited symbol gets its own browser-style tab that persists across page navigation. Up to 10 tabs stored in `localStorage`. Clicking a tab switches instantly; closing the active tab navigates to the nearest remaining tab.

### Stock Screener (156 symbols, 11 sectors)

Six preset scanners:
- **Momentum Breakout** — 52W range ≥ 80% + volume surge + price up
- **Oversold Bounce** — 52W range ≤ 25% + down >1% today
- **Volume Surge** — volume ≥ 2× the 10-day average
- **Near 52W High** — within 3% of yearly high
- **Value Plays** — P/E < 20 with upward momentum
- **High Beta Movers** — beta > 1.5 with a strong daily move

Advanced filter bar: sector, market cap tier, % change, price range, P/E, beta, volume spike, 52W range band, trend direction. Signal badges per row: Breakout, Accumulation, Distribution, Momentum, Oversold, Reversal, High ATR, Vol×2, Deep Value, Value, Defensive. Inferred options strategy (Bull Call Spread, Iron Condor, etc.) displayed per row.

**Sectors covered:** Technology, Financials, Healthcare, Consumer Cyclical, Consumer Defensive, Communication Services, Industrials, Energy, Materials, Real Estate, Utilities.

### Stock Detail — Key Statistics

Live data per symbol:
- Previous Close, Open, Day Range, 52-Week Range
- Volume, Avg. Volume, Market Cap
- P/E (TTM), Forward P/E, EPS (TTM), Beta
- Dividend, Dividend Yield, Gross Margin, Profit Margin, ROE
- Analyst price target and recommendation

### Stock Detail — Earnings Tab

Quarterly financials table (last 4 quarters): Revenue, Revenue Growth YoY, Gross Profit, Gross Margin, Operating Income, Net Income, Net Margin, EPS. Latest quarter highlighted. Followed by EPS trend chart.

### Trade Ideas (Strategies Tab)

Per-symbol, data-driven trade setup:
- **Verdict banner** — BULLISH / LEAN BULLISH / NEUTRAL / LEAN BEARISH / BEARISH based on signal vote count
- **Technical signals** — RSI, MACD proxy, 50/200 MA cross, 52W range, volume ratio, HV
- **ATR-based equity setups** — Long and Short cards with Entry / Target / Stop (2:1 R:R, ATR(14) sizing)
- **Options ideas** — 3 strategy cards (directional spread, volatility play, premium capture) with reasoning
- **News sentiment** — compact feed with expandable article list

### Performance Tab

Compare up to 10 symbols on a single normalized chart (rebased to 100). Period return cards for 1D, 5D, 1M, 3M, 6M, 1Y, 2Y. Rolling return probability distribution. All state preserved when switching tabs — no re-fetch on tab re-entry.

### Compare Bar

Shared `CompareBar` component used across Performance and Advanced Chart tabs:
- Live symbol/name search with dropdown suggestions (debounced 200ms)
- Comma-separated batch input — enter `AAPL, MSFT, SPY` to add all at once
- Last-token search: typing `AAPL, MS` shows Microsoft suggestions while keeping AAPL
- Invalid single-symbol validation against search API; batch input skips validation

### Data & Caching

| Data type | Source | Cache TTL |
|---|---|---|
| Real-time quotes (bulk) | NASDAQ `/api/quote/{sym}/info` | 15s |
| Chart / OHLCV | NASDAQ `/api/quote/{sym}/chart` | 60s |
| Fundamentals summary | NASDAQ `/api/quote/{sym}/summary` | 5 min |
| PE, EPS, Beta | Yahoo Finance v8 chart meta | 5 min |
| Quarterly financials | NASDAQ `/api/company/{sym}/financials` | 1 hr |
| Institutional holdings | NASDAQ `/api/company/{sym}/institutional-holdings` | 1 hr |
| News | Google News RSS | 5 min |
| Earnings calendar | NASDAQ `/api/calendar/earnings` | 1 hr |
| Search autocomplete | NASDAQ `/api/autocomplete/slookup` | 30s |
| Index quotes (VIX, yields, SPX…) | Yahoo Finance v8 | 1 min |

All caching is disk-based in `/tmp/finvision-nasdaq-cache` and shared across dev-server restarts. Stale cache is served as a fallback if the upstream call fails.

### ETF Coverage (60+)

- **Broad market**: SPY, QQQ, DIA, IWM, VTI, VOO, ARKK
- **SPDR Sector ETFs**: XLF, XLK, XLE, XLV, XLY, XLP, XLI, XLB, XLU, XLRE, XLC
- **Commodities**: GLD, SLV, IAU, USO, UNG, PDBC, DBC
- **Bonds**: AGG, TLT, HYG
- **Leveraged (bull)**: TQQQ, UPRO, SPXL, TECL, UDOW, TNA, SOXL, FNGU, FAS, LABU, NAIL, BULZ
- **Leveraged (bear)**: SQQQ, SPXU, SPXS, TECS, SDOW, TZA, SOXS, FNGD, FAZ, LABD
- **Volatility**: UVXY, SVXY
- **International**: EFA, EEM, VEU, VWO, IEFA, VGK, EWJ, EWZ, FXI, IEMG, INDA, MCHI, KWEB, EWY, EWA, EWT
- **Crypto ETFs**: IBIT, FBTC, GBTC, BITB, BITO, ETHA
- **Income / dividend**: JEPI, JEPQ, SCHD, VYM, HDV, QYLD, BND, SGOV

Each ETF includes: full name, issuer, expense ratio, AUM, benchmark index, top 10 holdings with weights, and sector allocation breakdown.

### Crypto Coverage

BTC, ETH, SOL, BNB, XRP, ADA, AVAX, DOGE, DOT, LINK, MATIC, UNI, LTC, NEAR, ARB, OP, ATOM, SUI, APT, INJ — filterable by category (Layer 1/2/0, DeFi, Payment, Exchange, Meme, Oracle).

---

## Tech Stack

| | |
|---|---|
| Framework | React 19 |
| Build tool | Vite 8 |
| Routing | React Router DOM 7 |
| Charts | Recharts 3 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Primary data | NASDAQ public API (via Vite dev-server proxy) |
| Supplemental data | Yahoo Finance v8 (PE, EPS, Beta, index quotes) |
| News | Google News RSS |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (includes NASDAQ proxy)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs on `http://localhost:5173` by default. The NASDAQ proxy runs inside Vite's plugin system — no separate server process required.

---

## Project Structure

```
finvision/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── AdvancedChart.jsx             # Full-featured OHLCV chart with indicators
│   │   ├── CompareBar.jsx                # Multi-symbol compare input with live search
│   │   ├── Footer.jsx
│   │   ├── MarketBar.jsx                 # Scrolling live market ticker
│   │   ├── Navbar.jsx                    # Global nav with search autocomplete + tab open
│   │   ├── NewsCard.jsx
│   │   ├── PerformanceTab.jsx            # Normalized multi-symbol chart + return cards
│   │   ├── RollingReturnProbability.jsx  # Rolling return distribution histogram
│   │   ├── StockCard.jsx
│   │   ├── StockMiniChart.jsx            # Inline sparkline
│   │   ├── StrategiesTab.jsx             # Trade ideas: verdict, signals, ATR setups, options
│   │   └── SymbolTabBar.jsx              # Browser-style symbol tabs
│   ├── context/
│   │   └── TabsContext.jsx               # Open symbol tabs — global state + localStorage
│   ├── hooks/
│   │   ├── useCompareCharts.js           # Parallel chart fetch for multiple symbols
│   │   ├── usePersistedRange.js          # Remembers selected time range across navigation
│   │   └── useYahoo.js                   # Core hooks: useQuote, useChart, useSummary, useNews…
│   ├── pages/
│   │   ├── Crypto.jsx
│   │   ├── Earnings.jsx                  # Earnings + economic event calendar
│   │   ├── Education.jsx
│   │   ├── ETFs.jsx
│   │   ├── Markets.jsx
│   │   ├── News.jsx
│   │   ├── Performance.jsx
│   │   ├── Portfolio.jsx
│   │   ├── Screener.jsx                  # 156-symbol screener with presets + filters
│   │   ├── StockDetail.jsx               # Full stock page (9 tabs)
│   │   ├── Stocks.jsx
│   │   ├── Strategies.jsx
│   │   └── Watchlist.jsx
│   ├── services/
│   │   ├── etfData.js                    # Static ETF metadata (holdings, sectors, ratios)
│   │   ├── revenueSegments.js            # Revenue segment breakdown per symbol
│   │   ├── stockData.js                  # 156 stock definitions (sector, beta)
│   │   ├── yahooApi.js                   # Formatting utilities (formatMarketCap, fmt$…)
│   │   └── providers/
│   │       └── yahoo/
│   │           ├── fetcher.js            # HTTP calls against /api/yahoo/* proxy routes
│   │           ├── index.js              # Provider facade (chart, quotes, summary, search…)
│   │           └── parser.js             # Wire-format → app-object transformers
│   ├── App.jsx                           # Route definitions + TabsProvider wrapper
│   ├── index.css
│   └── main.jsx
├── index.html
├── tailwind.config.js
└── vite.config.js                        # NASDAQ proxy plugin + disk cache + YF supplemental
```

---

## Architecture Notes

### Data proxy (`vite.config.js`)

All market data flows through a Vite dev-server middleware acting as a CORS proxy. It:
- Translates `/api/yahoo/*` calls into NASDAQ API requests
- Writes responses to a disk cache at `/tmp/finvision-nasdaq-cache`
- Serves stale cache as a fallback when NASDAQ is unreachable
- Fetches PE, EPS, and Beta from Yahoo Finance v8 chart meta in parallel with the NASDAQ summary call
- Fetches index quotes (VIX, SPX, yields) directly from Yahoo Finance

### Tab state preservation

The three stateful tabs in `StockDetail` (Performance, Trade Ideas, Rolling Return) are mounted inside `hidden` divs so their React state survives tab switches without triggering a re-fetch.

### Symbol tabs

`TabsContext` maintains a global list of open symbols (max 10) in both React state and `localStorage`. Every `StockDetail` page registers itself on mount via `addTab(symbol)`. `SymbolTabBar` renders a tab strip at the top of the stock page; `Navbar` calls `addTab` when navigating via search.

---

## Design

- Dark theme (`#0a0a0a` background) throughout
- Responsive layout — desktop and tablet optimized
- Skeleton loaders for all async data states
- Color-coded price changes (green / red) consistent across all views
- Sector colors consistent across ETF, Screener, and Stocks pages

---

## Notes

- No API key required — all data sources used are public/unauthenticated endpoints.
- ETF and stock metadata (holdings, sectors, descriptions) are static and embedded in `src/services/` — live prices are fetched separately.
- The Portfolio page uses local component state; positions are not persisted between sessions.
- Crypto prices are partially mocked (NASDAQ does not cover crypto pairs); chart data is simulated.
