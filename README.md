# FinVision

A dark-themed financial dashboard built with React 19 and Vite. Covers stocks, ETFs, crypto, portfolio tracking, earnings calendars, and market education — all powered by real-time Yahoo Finance data.

---

## Features

### Pages & Routes

| Route | Description |
|---|---|
| `/` `/markets` | Live market overview — indices, top movers, sector heatmap |
| `/stock/:symbol` | Full stock detail: chart, fundamentals, news, institutional holdings |
| `/stocks` | Browse stocks grouped by sector with live quotes |
| `/etfs` | ETF explorer with holdings, sector weights, and fund metadata |
| `/crypto` | Real-time crypto prices with sparklines, filterable by category |
| `/portfolio` | Portfolio tracker — add positions, see P&L, allocation pie chart |
| `/news` | Live market news feed |
| `/screener` | Stock screener |
| `/performance` | Performance analytics |
| `/strategies` | Trading strategy templates |
| `/earnings` `/calendar` | Weekly earnings calendar + economic events calendar |
| `/education` | Curated learning resources, finance websites, and tools |

### Data & Caching

- **Real-time quotes** — bulk fetch via Yahoo Finance, 15-second in-memory cache
- **Chart / price history** — OHLCV data, 60-second cache, configurable interval & range
- **Fundamentals** — P/E, market cap, revenue, EPS, margins, 5-minute cache
- **Earnings** — quarterly financials per symbol, 5-minute cache
- **News** — per-symbol and market-wide, 5-minute cache
- **Institutional holdings** — 1-hour cache
- **Earnings calendar** — weekly schedule, 1-hour cache
- **Search autocomplete** — debounced, 30-second cache

All caching is module-level in-memory (clears on tab close, no localStorage overhead).

### ETF Coverage (60+)

- **Broad market**: SPY, QQQ, DIA, IWM, VTI, VOO, ARKK
- **SPDR Sector ETFs**: XLF, XLK, XLE, XLV, XLY, XLP, XLI, XLB, XLU, XLRE, XLC
- **Commodities**: GLD, SLV, IAU, USO, UNG, PDBC, DBC
- **Bonds**: AGG, TLT, HYG
- **Leveraged (3x bull)**: TQQQ, UPRO, SPXL, TECL, UDOW, TNA, SOXL, FNGU, FAS, LABU, NAIL, BULZ
- **Leveraged (3x bear)**: SQQQ, SPXU, SPXS, TECS, SDOW, TZA, SOXS, FNGD, FAZ, LABD
- **Volatility**: UVXY, SVXY
- **International (developed & emerging)**: EFA, EEM, VEU, VWO, IEFA, VGK, EWJ, EWZ, FXI, IEMG
- **Country-specific**: INDA, MCHI, EWY, EWA, EWT, KWEB
- **Crypto ETFs**: IBIT, FBTC, GBTC, BITB, BITO, ETHA, MSTR

Each ETF includes: full name, issuer, expense ratio, AUM, benchmark index, top 10 holdings with weights, and sector allocation breakdown.

### Crypto Coverage

BTC, ETH, SOL, BNB, XRP, ADA, AVAX, DOGE, DOT, LINK, MATIC, UNI, LTC, NEAR, ARB, OP, ATOM, SUI, APT, INJ — filterable by category (Layer 1/2/0, DeFi, Payment, Exchange, Meme, Oracle).

### Stock Coverage

Major US equities across all 12 sectors: Technology, Semiconductors, Communication Services, Financials, Healthcare, Consumer Discretionary, Consumer Staples, Energy, Industrials, Real Estate, Materials, Utilities.

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
| Data | Yahoo Finance (via proxy) |

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The dev server runs on `http://localhost:5173` by default.

---

## Project Structure

```
finvision/
├── public/
│   └── favicon.svg
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── AdvancedChart.jsx      # Full-featured price chart with range selector
│   │   ├── CompareBar.jsx         # Side-by-side symbol comparison
│   │   ├── Footer.jsx
│   │   ├── MarketBar.jsx          # Live scrolling market ticker
│   │   ├── Navbar.jsx             # Nav with live search autocomplete
│   │   ├── NewsCard.jsx
│   │   ├── PerformanceTab.jsx
│   │   ├── StockCard.jsx
│   │   ├── StockMiniChart.jsx     # Inline sparkline charts
│   │   └── StrategiesTab.jsx
│   ├── hooks/
│   │   ├── useCompareCharts.js    # Multi-symbol chart comparison hook
│   │   ├── usePersistedRange.js   # Persists selected time range across navigation
│   │   └── useYahoo.js            # Core data hooks (quotes, chart, news, earnings…)
│   ├── pages/
│   │   ├── Crypto.jsx
│   │   ├── Earnings.jsx           # Earnings + economic calendar
│   │   ├── Education.jsx          # Curated resources & tool links
│   │   ├── ETFs.jsx
│   │   ├── Markets.jsx
│   │   ├── News.jsx
│   │   ├── Performance.jsx
│   │   ├── Portfolio.jsx
│   │   ├── Screener.jsx
│   │   ├── StockDetail.jsx
│   │   ├── Stocks.jsx
│   │   ├── Strategies.jsx
│   │   └── Watchlist.jsx
│   ├── services/
│   │   ├── dataProvider.js        # Fetch layer (proxy routing, request handling)
│   │   ├── etfData.js             # Static ETF metadata (holdings, sectors, ratios)
│   │   ├── stockData.js           # Static stock metadata
│   │   └── yahooApi.js            # Response parsers and formatting utilities
│   ├── App.jsx                    # Route definitions
│   ├── index.css
│   └── main.jsx
├── index.html
├── tailwind.config.js
└── vite.config.js
```

---

## Design

- Dark theme (`#0a0a0a` background) throughout
- Responsive layout — works on desktop and tablet
- Skeleton loaders for async data states
- Color-coded price changes (green / red) across all views
- Sector colors consistent across ETF and stock pages

---

## Notes

- Yahoo Finance data is fetched via a CORS proxy configured in `vite.config.js`. No API key is required for the free tier endpoints used.
- ETF and stock metadata (holdings, sectors, descriptions) are static and embedded in `src/services/etfData.js` and `src/services/stockData.js` — live prices are fetched separately.
- The Portfolio page uses local component state; positions are not persisted between sessions.
