import { useState, useMemo } from 'react';
import { ExternalLink, BookOpen, Globe, Star, Search, Rss, Activity, BarChart2, Zap, Shield, TrendingUp, Clock } from 'lucide-react';

// ── Websites ─────────────────────────────────────────────────────────────────

const WEBSITES = [
  { name: 'Yahoo Finance',       url: 'https://finance.yahoo.com',               cat: 'News & Data',          color: '#6366f1', desc: 'Free real-time quotes, financials, news, and portfolio tools. The go-to free data source.' },
  { name: 'Bloomberg',           url: 'https://bloomberg.com/markets',            cat: 'News & Data',          color: '#f59e0b', desc: 'World-class financial journalism, market data, and macroeconomic analysis.' },
  { name: 'Reuters',             url: 'https://reuters.com/finance',              cat: 'News & Data',          color: '#ef4444', desc: 'Breaking financial news and wire service coverage of global markets.' },
  { name: 'MarketWatch',         url: 'https://marketwatch.com',                  cat: 'News & Data',          color: '#22c55e', desc: 'Real-time market data, news, stock screener, and commentary from Dow Jones.' },
  { name: 'CNBC Markets',        url: 'https://cnbc.com/markets',                 cat: 'News & Data',          color: '#3b82f6', desc: 'Live market coverage, earnings analysis, and investor news from CNBC.' },
  { name: "Barron's",            url: 'https://barrons.com',                      cat: 'News & Data',          color: '#8b5cf6', desc: 'In-depth stock research and market insights from a trusted publication since 1921.' },
  { name: 'Wall Street Journal', url: 'https://wsj.com',                          cat: 'News & Data',          color: '#64748b', desc: 'Premium financial journalism covering markets, business, and the economy.' },
  { name: 'The Motley Fool',     url: 'https://fool.com',                         cat: 'News & Data',          color: '#10b981', desc: 'Long-term investing ideas, stock picks, and educational content for individual investors.' },
  { name: 'Finviz',              url: 'https://finviz.com',                        cat: 'Charting & Screening', color: '#06b6d4', desc: 'Powerful free stock screener, heatmaps, and technical chart analysis. Essential for traders.' },
  { name: 'TradingView',         url: 'https://tradingview.com',                  cat: 'Charting & Screening', color: '#2563eb', desc: 'Industry-leading charting platform with hundreds of indicators, screeners, and social features.' },
  { name: 'StockCharts',         url: 'https://stockcharts.com',                  cat: 'Charting & Screening', color: '#7c3aed', desc: 'Professional charting tools with a strong focus on technical analysis education.' },
  { name: 'Barchart',            url: 'https://barchart.com',                     cat: 'Charting & Screening', color: '#16a34a', desc: 'Free futures, options, and stock data with advanced charting and screener tools.' },
  { name: 'Morningstar',         url: 'https://morningstar.com',                  cat: 'Research',             color: '#f97316', desc: 'Independent investment research, star ratings, and deep fundamental analysis.' },
  { name: 'Seeking Alpha',       url: 'https://seekingalpha.com',                 cat: 'Research',             color: '#eab308', desc: 'Crowd-sourced stock analysis, earnings call transcripts, and quant ratings.' },
  { name: 'Zacks',               url: 'https://zacks.com',                        cat: 'Research',             color: '#dc2626', desc: 'Earnings estimates, Zacks Rank system, and research reports used by institutions.' },
  { name: 'Macroaxis',           url: 'https://macroaxis.com',                    cat: 'Research',             color: '#0891b2', desc: 'Quantitative financial analysis, portfolio optimization, and risk management tools.' },
  { name: 'Simply Wall St',      url: 'https://simplywall.st',                    cat: 'Research',             color: '#0d9488', desc: 'Visual fundamental analysis using infographics. Great for quick company health checks.' },
  { name: 'Options Profit Calc', url: 'https://optionsprofitcalculator.com',      cat: 'Options',              color: '#7c3aed', desc: 'Free visual options P&L calculator. Essential for planning entries and exits.' },
  { name: 'Market Chameleon',    url: 'https://marketchameleon.com',              cat: 'Options',              color: '#be185d', desc: 'IV rank, options flow, earnings volatility, and calendar data for options traders.' },
  { name: 'Unusual Whales',      url: 'https://unusualwhales.com',                cat: 'Options',              color: '#9333ea', desc: 'Real-time unusual options flow detection and dark pool activity tracking.' },
  { name: 'Barchart Options',    url: 'https://barchart.com/options',             cat: 'Options',              color: '#15803d', desc: 'Free options chains, volume leaders, and implied volatility rankings.' },
  { name: 'Investopedia',        url: 'https://investopedia.com',                 cat: 'Learning',             color: '#1d4ed8', desc: 'The definitive financial dictionary and investing tutorial resource. Start here for any concept.' },
  { name: 'SEC EDGAR',           url: 'https://sec.gov/edgar',                    cat: 'Learning',             color: '#92400e', desc: 'Official SEC filings — 10-K, 10-Q, 8-K, and proxy statements for all public companies.' },
  { name: 'FRED',                url: 'https://fred.stlouisfed.org',              cat: 'Learning',             color: '#155e75', desc: 'Federal Reserve economic data: interest rates, inflation, GDP, and 800,000+ economic series.' },
  { name: 'Earnings Whispers',   url: 'https://earningswhispers.com',             cat: 'Learning',             color: '#065f46', desc: 'Earnings calendar with whisper numbers, historical surprises, and pre-earnings IV data.' },
  { name: 'Koyfin',              url: 'https://koyfin.com',                       cat: 'Tools',                color: '#7c3aed', desc: 'Bloomberg-like terminal for retail investors: earnings, valuation, and global data.' },
  { name: 'Quiver Quant',        url: 'https://quiverquant.com',                  cat: 'Tools',                color: '#0f766e', desc: 'Congressional trading data, lobbying disclosures, and alternative data for retail investors.' },
  { name: 'Stockanalysis.io',    url: 'https://stockanalysis.io',                 cat: 'Tools',                color: '#1e40af', desc: 'Clean, fast fundamentals: income statement, balance sheet, cash flow, and IPO data.' },
  { name: 'Mercury',             url: 'https://mercury.com',                      cat: 'Tools',                color: '#4f46e5', desc: 'Modern financial platform with AI-powered analytics and market insights.' },
  // More News & Data
  { name: 'Financial Times',     url: 'https://ft.com/markets',                   cat: 'News & Data',          color: '#f97316', desc: 'Gold standard for global financial journalism and economic analysis. Essential for macro investors.' },
  { name: "Investor's Business Daily", url: 'https://investors.com',              cat: 'News & Data',          color: '#dc2626', desc: 'Home of the CAN SLIM growth methodology. Best daily paper for growth and momentum traders.' },
  { name: 'TheStreet',           url: 'https://thestreet.com',                    cat: 'News & Data',          color: '#0ea5e9', desc: 'Real-time market analysis and commentary. Jim Cramer\'s platform with active ratings and alerts.' },
  { name: 'Nasdaq.com',          url: 'https://nasdaq.com',                       cat: 'News & Data',          color: '#3b82f6', desc: 'Official Nasdaq exchange data: quotes, earnings calendar, IPO pipeline, and company filings.' },
  { name: 'Benzinga',            url: 'https://benzinga.com',                     cat: 'News & Data',          color: '#22c55e', desc: 'Fast-moving financial news with a focus on options flow, pre-market movers, and earnings.' },
  // More Charting & Screening
  { name: 'TC2000',              url: 'https://tc2000.com',                       cat: 'Charting & Screening', color: '#8b5cf6', desc: 'Professional charting and scanning platform favored by IBD-style growth and momentum traders.' },
  { name: 'ChartMill',           url: 'https://chartmill.com',                    cat: 'Charting & Screening', color: '#06b6d4', desc: 'Smart stock screener with technical setups, fundamentals, and earnings filters combined.' },
  { name: 'Macrotrends',         url: 'https://macrotrends.net',                  cat: 'Charting & Screening', color: '#10b981', desc: 'Long-term historical charts for stocks, commodities, and economic data going back decades.' },
  // More Research
  { name: 'Gurufocus',           url: 'https://gurufocus.com',                    cat: 'Research',             color: '#f59e0b', desc: 'Deep value investing platform: guru portfolios, DCF tools, and Warren Buffett-style analysis.' },
  { name: 'TIKR Terminal',       url: 'https://tikr.com',                         cat: 'Research',             color: '#6366f1', desc: 'Bloomberg-quality financial data for free: global financials, estimates, and ownership data.' },
  { name: 'Dataroma',            url: 'https://dataroma.com',                     cat: 'Research',             color: '#eab308', desc: 'Track what top value investors (Buffett, Ackman, Einhorn) are buying via 13F filings.' },
  { name: 'WhaleWisdom',         url: 'https://whalewisdom.com',                  cat: 'Research',             color: '#0891b2', desc: 'Comprehensive 13F hedge fund tracking and institutional position monitoring tool.' },
  { name: 'OpenInsider',         url: 'https://openinsider.com',                  cat: 'Research',             color: '#7c3aed', desc: 'Real-time SEC Form 4 insider trading activity. Follow executives buying their own stock.' },
  // More Options
  { name: 'tastylive',           url: 'https://tastylive.com',                    cat: 'Options',              color: '#f59e0b', desc: 'Financial network built around options trading. Best free options education and research platform.' },
  { name: 'Options Alpha',       url: 'https://optionsalpha.com',                 cat: 'Options',              color: '#8b5cf6', desc: 'Automated options trading platform with backtesting and data-driven strategy tools.' },
  { name: 'CBOE Options Institute', url: 'https://cboe.com/education',            cat: 'Options',              color: '#1d4ed8', desc: 'Official CBOE education: options concepts, VIX explained, and professional certification prep.' },
  // More Learning
  { name: 'Khan Academy Finance', url: 'https://khanacademy.org/economics-finance-domain', cat: 'Learning',   color: '#16a34a', desc: 'Free world-class courses on stocks, options, banking, and financial markets. Best free starting point.' },
  { name: 'MIT OpenCourseWare Finance', url: 'https://ocw.mit.edu/courses/finance', cat: 'Learning',         color: '#94a3b8', desc: 'Free MIT finance courses: derivatives, corporate finance, and financial markets from top professors.' },
  // More Tools
  { name: 'Portfolio Visualizer', url: 'https://portfoliovisualizer.com',         cat: 'Tools',                color: '#0f766e', desc: 'Best free portfolio backtesting, Monte Carlo simulation, and factor analysis tool available.' },
  { name: 'ETF Database',        url: 'https://etfdb.com',                        cat: 'Tools',                color: '#0284c7', desc: 'Comprehensive ETF research: screener, comparisons, expense ratios, holdings, and flows.' },
  { name: 'Portfolio Charts',    url: 'https://portfoliocharts.com',              cat: 'Tools',                color: '#be185d', desc: 'Beautiful long-term portfolio performance charts: drawdowns, safe withdrawal rates, heat maps.' },
  { name: 'SentimentTrader',     url: 'https://sentimenttrader.com',              cat: 'Tools',                color: '#7c3aed', desc: 'Market sentiment data, breadth indicators, and backtested sentiment-based trading signals.' },
];

const WEBSITE_CATS = ['All', 'News & Data', 'Charting & Screening', 'Research', 'Options', 'Learning', 'Tools'];

// ── Books ─────────────────────────────────────────────────────────────────────

const BOOKS = [
  { title: 'The Intelligent Investor',                      author: 'Benjamin Graham',              year: 1949, cat: 'Value Investing', color: '#f59e0b', level: 'Beginner',     desc: 'The bible of value investing. Buffett calls it "by far the best book on investing ever written." Introduces Mr. Market and margin of safety.',           amzn: 'https://www.amazon.com/s?k=The+Intelligent+Investor+Graham' },
  { title: 'Security Analysis',                             author: 'Benjamin Graham & David Dodd', year: 1934, cat: 'Value Investing', color: '#d97706', level: 'Advanced',     desc: 'The foundational academic text on analyzing stocks and bonds. Deep dive into intrinsic value methodology.',                                               amzn: 'https://www.amazon.com/s?k=Security+Analysis+Graham+Dodd' },
  { title: 'Common Stocks and Uncommon Profits',            author: 'Philip Fisher',                year: 1958, cat: 'Value Investing', color: '#10b981', level: 'Intermediate', desc: "Fisher's scuttlebutt approach to qualitative research. Focus on management quality and growth potential.",                                                 amzn: 'https://www.amazon.com/s?k=Common+Stocks+Uncommon+Profits+Fisher' },
  { title: 'The Essays of Warren Buffett',                  author: 'Lawrence Cunningham',          year: 1997, cat: 'Value Investing', color: '#6366f1', level: 'Beginner',     desc: "Buffett's annual shareholder letters organized thematically. Priceless wisdom on business and investing.",                                               amzn: 'https://www.amazon.com/s?k=Essays+of+Warren+Buffett+Cunningham' },
  { title: 'One Up On Wall Street',                         author: 'Peter Lynch',                  year: 1989, cat: 'Value Investing', color: '#22c55e', level: 'Beginner',     desc: 'How everyday investors can beat professionals by investing in what they know. Fun, practical, and timeless.',                                             amzn: 'https://www.amazon.com/s?k=One+Up+On+Wall+Street+Lynch' },
  { title: 'The Little Book That Beats the Market',         author: 'Joel Greenblatt',              year: 2005, cat: 'Value Investing', color: '#f97316', level: 'Beginner',     desc: 'Introduces the "Magic Formula" — buying above-average companies at below-average prices.',                                                               amzn: 'https://www.amazon.com/s?k=Little+Book+That+Beats+Market+Greenblatt' },
  { title: 'You Can Be a Stock Market Genius',              author: 'Joel Greenblatt',              year: 1997, cat: 'Value Investing', color: '#ef4444', level: 'Intermediate', desc: 'Special situation investing: spinoffs, mergers, restructurings, and risk arbitrage strategies.',                                                           amzn: 'https://www.amazon.com/s?k=You+Can+Be+Stock+Market+Genius+Greenblatt' },
  { title: 'Market Wizards',                                author: 'Jack Schwager',                year: 1988, cat: 'Trading',        color: '#8b5cf6', level: 'Intermediate', desc: 'Interviews with top traders. Reveals the psychology, risk management, and edge of legendary traders.',                                                    amzn: 'https://www.amazon.com/s?k=Market+Wizards+Schwager' },
  { title: 'Reminiscences of a Stock Operator',             author: 'Edwin Lefèvre',               year: 1923, cat: 'Trading',        color: '#ec4899', level: 'Beginner',     desc: 'Fictionalized biography of Jesse Livermore. The most-read trading book of all time. Timeless lessons.',                                                 amzn: 'https://www.amazon.com/s?k=Reminiscences+Stock+Operator+Lefevre' },
  { title: 'Trading for a Living',                          author: 'Alexander Elder',              year: 1993, cat: 'Trading',        color: '#14b8a6', level: 'Intermediate', desc: 'Covers psychology, technical analysis, and money management in a practical, systematic framework.',                                                       amzn: 'https://www.amazon.com/s?k=Trading+for+a+Living+Elder' },
  { title: 'How to Make Money in Stocks',                   author: "William O'Neil",               year: 1988, cat: 'Trading',        color: '#3b82f6', level: 'Beginner',     desc: 'Introduces the CAN SLIM system for finding leading growth stocks before big breakout moves.',                                                           amzn: 'https://www.amazon.com/s?k=How+to+Make+Money+in+Stocks+ONeil' },
  { title: 'The New Market Wizards',                        author: 'Jack Schwager',                year: 1992, cat: 'Trading',        color: '#7c3aed', level: 'Intermediate', desc: 'Second volume of trader interviews with deeper insights on edges, discipline, and drawdowns.',                                                           amzn: 'https://www.amazon.com/s?k=New+Market+Wizards+Schwager' },
  { title: 'Secrets for Profiting in Bull and Bear Markets', author: 'Stan Weinstein',             year: 1988, cat: 'Trading',        color: '#0ea5e9', level: 'Beginner',     desc: 'Stage analysis method using 30-week moving averages. Simple and remarkably effective approach.',                                                        amzn: 'https://www.amazon.com/s?k=Secrets+Profiting+Bull+Bear+Markets+Weinstein' },
  { title: 'Options as a Strategic Investment',             author: 'Lawrence McMillan',            year: 1980, cat: 'Options',        color: '#a855f7', level: 'Advanced',     desc: 'The most comprehensive options reference ever written. Covers every strategy with Greeks and risk analysis.',                                            amzn: 'https://www.amazon.com/s?k=Options+Strategic+Investment+McMillan' },
  { title: 'The Option Volatility & Pricing',               author: 'Sheldon Natenberg',            year: 1994, cat: 'Options',        color: '#d946ef', level: 'Advanced',     desc: 'Professional options pricing theory. Covers volatility modeling and market-making perspective.',                                                       amzn: 'https://www.amazon.com/s?k=Option+Volatility+Pricing+Natenberg' },
  { title: "Option Trader's Hedge Fund",                    author: 'Dennis Chen & Mark Sebastian', year: 2012, cat: 'Options',        color: '#9333ea', level: 'Intermediate', desc: 'Running a systematic premium selling business: defined-risk spreads, adjustments, and portfolio management.',                                           amzn: 'https://www.amazon.com/s?k=Option+Trader+Hedge+Fund+Sebastian' },
  { title: "The Unlucky Investor's Guide to Options",       author: 'Julia Spina',                  year: 2022, cat: 'Options',        color: '#c026d3', level: 'Beginner',     desc: 'Data-driven intro to options and probability. Uses tastytrade research to explain premium selling.',                                                   amzn: 'https://www.amazon.com/s?k=Unlucky+Investor+Guide+Options+Trading+Spina' },
  { title: 'A Random Walk Down Wall Street',                author: 'Burton Malkiel',               year: 1973, cat: 'Macro',          color: '#64748b', level: 'Beginner',     desc: 'The case for index investing and efficient markets. Essential counterpoint to active trading.',                                                       amzn: 'https://www.amazon.com/s?k=Random+Walk+Down+Wall+Street+Malkiel' },
  { title: 'The Big Short',                                 author: 'Michael Lewis',                year: 2010, cat: 'Macro',          color: '#1e293b', level: 'Beginner',     desc: 'How a small group of outsiders saw the 2008 mortgage collapse coming. Riveting and educational.',                                                    amzn: 'https://www.amazon.com/s?k=The+Big+Short+Michael+Lewis' },
  { title: 'Flash Boys',                                    author: 'Michael Lewis',                year: 2014, cat: 'Macro',          color: '#334155', level: 'Beginner',     desc: 'Exposes high-frequency trading and dark pools. Changes how you think about modern market structure.',                                                 amzn: 'https://www.amazon.com/s?k=Flash+Boys+Michael+Lewis' },
  { title: 'Fooled by Randomness',                          author: 'Nassim Nicholas Taleb',        year: 2001, cat: 'Macro',          color: '#475569', level: 'Intermediate', desc: 'How luck is misidentified as skill in finance. Critical thinking about probability and survivorship bias.',                                             amzn: 'https://www.amazon.com/s?k=Fooled+by+Randomness+Taleb' },
  { title: 'The Black Swan',                                author: 'Nassim Nicholas Taleb',        year: 2007, cat: 'Macro',          color: '#1e3a5f', level: 'Intermediate', desc: 'The impact of highly improbable events. Reshapes how you think about risk and tail exposure.',                                                        amzn: 'https://www.amazon.com/s?k=The+Black+Swan+Taleb' },
  { title: 'When Genius Failed',                            author: 'Roger Lowenstein',             year: 2000, cat: 'Macro',          color: '#7f1d1d', level: 'Intermediate', desc: 'The collapse of Long-Term Capital Management. A masterclass in leverage, hubris, and systemic risk.',                                                 amzn: 'https://www.amazon.com/s?k=When+Genius+Failed+Lowenstein' },
  { title: "Liar's Poker",                                  author: 'Michael Lewis',                year: 1989, cat: 'Macro',          color: '#1c1917', level: 'Beginner',     desc: "Lewis's memoir of Salomon Brothers in the 1980s bond market. Funny and illuminating.",                                                               amzn: 'https://www.amazon.com/s?k=Liars+Poker+Michael+Lewis' },
  { title: 'Thinking, Fast and Slow',                       author: 'Daniel Kahneman',              year: 2011, cat: 'Psychology',    color: '#be123c', level: 'Intermediate', desc: 'Nobel laureate Kahneman on cognitive biases. Every bias he describes costs investors real money.',                                                    amzn: 'https://www.amazon.com/s?k=Thinking+Fast+Slow+Kahneman' },
  { title: 'The Psychology of Money',                       author: 'Morgan Housel',                year: 2020, cat: 'Psychology',    color: '#9f1239', level: 'Beginner',     desc: 'Short, powerful essays on wealth, greed, and happiness. One of the best recent investing books.',                                                  amzn: 'https://www.amazon.com/s?k=Psychology+of+Money+Housel' },
  { title: 'Misbehaving',                                   author: 'Richard Thaler',               year: 2015, cat: 'Psychology',    color: '#881337', level: 'Intermediate', desc: 'Behavioral economics by the Nobel laureate who studies how irrationality shapes markets.',                                                           amzn: 'https://www.amazon.com/s?k=Misbehaving+Richard+Thaler' },
  // More Value Investing
  { title: 'Margin of Safety',                               author: 'Seth Klarman',                 year: 1991, cat: 'Value Investing', color: '#92400e', level: 'Advanced',     desc: 'The most sought-after investing book. Klarman\'s definitive text on value investing discipline, risk avoidance, and process.',                            amzn: 'https://www.amazon.com/s?k=Margin+of+Safety+Seth+Klarman' },
  { title: 'The Warren Buffett Way',                         author: 'Robert Hagstrom',              year: 1994, cat: 'Value Investing', color: '#d97706', level: 'Beginner',     desc: 'Thoroughly examines Buffett\'s investment approach across 12 stock case studies. A bridge from theory to practice.',                                      amzn: 'https://www.amazon.com/s?k=Warren+Buffett+Way+Hagstrom' },
  { title: 'The Outsiders',                                  author: 'William Thorndike',            year: 2012, cat: 'Value Investing', color: '#065f46', level: 'Intermediate', desc: 'Eight contrarian CEOs who outperformed the S&P 500 by 20x. Capital allocation mastery and unconventional management thinking.',                          amzn: 'https://www.amazon.com/s?k=The+Outsiders+William+Thorndike' },
  { title: "Poor Charlie's Almanack",                        author: 'Charlie Munger',               year: 2005, cat: 'Value Investing', color: '#1e3a5f', level: 'Intermediate', desc: "Munger's mental models, worldly wisdom, and investing philosophy. One of the most quotable and insightful books in finance.",                             amzn: 'https://www.amazon.com/s?k=Poor+Charlie+Almanack+Munger' },
  // More Trading
  { title: 'Technical Analysis of the Financial Markets',    author: 'John Murphy',                  year: 1999, cat: 'Trading',        color: '#1d4ed8', level: 'Intermediate', desc: 'The definitive reference for technical analysis: charts, patterns, indicators, and intermarket relationships.',                                          amzn: 'https://www.amazon.com/s?k=Technical+Analysis+Financial+Markets+Murphy' },
  { title: 'Trade Like a Stock Market Wizard',               author: 'Mark Minervini',               year: 2013, cat: 'Trading',        color: '#0f766e', level: 'Intermediate', desc: 'The SEPA methodology from a US Investing Champion. Systematic approach to growth stock selection and entry timing.',                                       amzn: 'https://www.amazon.com/s?k=Trade+Like+Stock+Market+Wizard+Minervini' },
  { title: 'Encyclopedia of Chart Patterns',                 author: 'Thomas Bulkowski',             year: 2000, cat: 'Trading',        color: '#4338ca', level: 'Advanced',     desc: 'Comprehensive statistical analysis of every chart pattern. The most data-driven reference for technical traders.',                                        amzn: 'https://www.amazon.com/s?k=Encyclopedia+Chart+Patterns+Bulkowski' },
  { title: 'Mastering the Trade',                            author: 'John Carter',                  year: 2005, cat: 'Trading',        color: '#be185d', level: 'Intermediate', desc: 'Practical day and swing trading strategies across futures, stocks, and options. Covers setups, entries, and risk management.',                           amzn: 'https://www.amazon.com/s?k=Mastering+the+Trade+John+Carter' },
  { title: 'The Art and Science of Technical Analysis',      author: 'Adam Grimes',                  year: 2012, cat: 'Trading',        color: '#7f1d1d', level: 'Advanced',     desc: 'Rigorous statistical approach to chart reading. Shows which patterns have actual edge and which are random noise.',                                      amzn: 'https://www.amazon.com/s?k=Art+Science+Technical+Analysis+Grimes' },
  // More Options
  { title: 'Trading Options Greeks',                         author: 'Dan Passarelli',               year: 2008, cat: 'Options',        color: '#581c87', level: 'Advanced',     desc: 'Master the Greeks for real-world options trading. Delta-neutral strategies, adjustments, and professional risk management.',                            amzn: 'https://www.amazon.com/s?k=Trading+Options+Greeks+Passarelli' },
  { title: 'Positional Options Trading',                     author: 'Euan Sinclair',                year: 2020, cat: 'Options',        color: '#701a75', level: 'Advanced',     desc: 'Quantitative options strategies for portfolio managers. Covers edge, volatility forecasting, and position sizing rigorously.',                          amzn: 'https://www.amazon.com/s?k=Positional+Options+Trading+Sinclair' },
  { title: "Get Rich with Options",                          author: 'Lee Lowell',                   year: 2007, cat: 'Options',        color: '#4c1d95', level: 'Beginner',     desc: 'Four winning strategies for generating consistent income: covered calls, cash-secured puts, and spreads explained simply.',                            amzn: 'https://www.amazon.com/s?k=Get+Rich+with+Options+Lowell' },
  // More Macro
  { title: 'Lords of Finance',                               author: 'Liaquat Ahamed',               year: 2009, cat: 'Macro',          color: '#1e293b', level: 'Intermediate', desc: 'The four central bankers who broke the world economy leading to the Great Depression. Pulitzer Prize winner.',                                          amzn: 'https://www.amazon.com/s?k=Lords+of+Finance+Ahamed' },
  { title: 'This Time Is Different',                         author: 'Reinhart & Rogoff',            year: 2009, cat: 'Macro',          color: '#374151', level: 'Advanced',     desc: 'Eight centuries of financial follies. Comprehensive analysis of sovereign debt crises, banking panics, and market crashes.',                           amzn: 'https://www.amazon.com/s?k=This+Time+Is+Different+Reinhart+Rogoff' },
  { title: 'The Alchemy of Finance',                         author: 'George Soros',                 year: 1987, cat: 'Macro',          color: '#1e3a5f', level: 'Advanced',     desc: "Soros's theory of reflexivity applied to markets. Explains how perceptions feedback into fundamentals and create boom-bust cycles.",                 amzn: 'https://www.amazon.com/s?k=Alchemy+of+Finance+Soros' },
  // More Psychology
  { title: 'Predictably Irrational',                         author: 'Dan Ariely',                   year: 2008, cat: 'Psychology',    color: '#991b1b', level: 'Beginner',     desc: 'Hidden forces that shape our decisions. Ariely\'s research on anchoring, loss aversion, and irrational financial behavior.',                          amzn: 'https://www.amazon.com/s?k=Predictably+Irrational+Ariely' },
  { title: 'The Little Book of Behavioral Investing',        author: 'James Montier',                year: 2010, cat: 'Psychology',    color: '#7f1d1d', level: 'Beginner',     desc: 'Short, practical guide to avoiding the behavioral biases that destroy investment returns. Actionable and evidence-based.',                            amzn: 'https://www.amazon.com/s?k=Little+Book+Behavioral+Investing+Montier' },
];

const BOOK_CATS   = ['All', 'Value Investing', 'Trading', 'Options', 'Macro', 'Psychology'];
const BOOK_LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

const LEVEL_COLOR = {
  Beginner:     'bg-green-500/10 text-green-400',
  Intermediate: 'bg-yellow-500/10 text-yellow-400',
  Advanced:     'bg-red-500/10 text-red-400',
};

// ── Blogs ─────────────────────────────────────────────────────────────────────

const BLOGS = [
  { name: 'A Wealth of Common Sense',   author: 'Ben Carlson',                url: 'https://awealthofcommonsense.com',           cat: 'Investing',      color: '#6366f1', freq: 'Daily',   desc: 'Data-driven takes on markets, behavior, and long-term investing. One of the most trusted independent voices.' },
  { name: 'Collaborative Fund Blog',    author: 'Morgan Housel',              url: 'https://collabfund.com/blog',                cat: 'Investing',      color: '#8b5cf6', freq: 'Weekly',  desc: 'Deep essays on the psychology of money, business history, and what makes great investors. Author of The Psychology of Money.' },
  { name: 'Of Dollars and Data',        author: 'Nick Maggiulli',             url: 'https://ofdollarsanddata.com',               cat: 'Investing',      color: '#22c55e', freq: 'Weekly',  desc: 'Data science meets personal finance. Rigorous analysis on saving, investing, and wealth-building.' },
  { name: 'Abnormal Returns',           author: 'Tadas Viskanta',             url: 'https://abnormalreturns.com',                cat: 'Markets',        color: '#f59e0b', freq: 'Daily',   desc: 'Essential daily curated links to the best financial content from across the web. Expertly filtered signal from noise.' },
  { name: 'The Irrelevant Investor',    author: 'Michael Batnick',            url: 'https://theirrelevantinvestor.com',          cat: 'Investing',      color: '#3b82f6', freq: 'Weekly',  desc: 'Clear, honest writing about markets, history, and investor psychology. Partner at Ritholtz Wealth Management.' },
  { name: 'The Big Picture',            author: 'Barry Ritholtz',             url: 'https://ritholtz.com',                       cat: 'Markets',        color: '#ef4444', freq: 'Daily',   desc: 'Big-picture macroeconomic and market commentary from one of the most influential investors and bloggers.' },
  { name: 'Macro Ops',                  author: 'Alex Barrow',                url: 'https://macro-ops.com/blog',                 cat: 'Macro',          color: '#0891b2', freq: 'Weekly',  desc: 'Global macro investing, game theory, and operator-level market analysis. High quality, unconventional thinking.' },
  { name: 'Philosophical Economics',    author: 'Jesse Livermore (pseudonym)',url: 'https://philosophicaleconomics.com',         cat: 'Macro',          color: '#7c3aed', freq: 'Monthly', desc: 'Deeply analytical macro essays using historical data. Famous for equity cycle and valuation research.' },
  { name: 'Howard Marks Memos',         author: 'Howard Marks',              url: 'https://oaktreecapital.com/insights/memo',   cat: 'Value Investing',color: '#d97706', freq: 'Monthly', desc: "Legendary memos from Oaktree Capital's co-founder. Essential reading for understanding market cycles and risk." },
  { name: 'Stratechery',                author: 'Ben Thompson',              url: 'https://stratechery.com',                    cat: 'Tech/Business',  color: '#1d4ed8', freq: 'Weekly',  desc: 'The gold standard for tech industry strategy and business model analysis. Essential for technology investors.' },
  { name: 'The Reformed Broker',        author: 'Josh Brown',                url: 'https://thereformedbroker.com',              cat: 'Markets',        color: '#be185d', freq: 'Daily',   desc: 'No-BS market commentary and candid takes on Wall Street from a popular financial advisor and media personality.' },
  { name: 'Alpha Architect',            author: 'Wes Gray',                  url: 'https://alphaarchitect.com/blog',            cat: 'Quant',          color: '#f97316', freq: 'Weekly',  desc: 'Academic-grade quantitative research made accessible. Factor investing, momentum, and value strategies backed by data.' },
  { name: 'Epsilon Theory',             author: 'Ben Hunt',                  url: 'https://epsilontheory.com',                  cat: 'Macro',          color: '#a855f7', freq: 'Weekly',  desc: 'Game theory and narrative applied to markets. Explores how stories and incentives drive prices and investor behavior.' },
  { name: 'Calculated Risk',            author: 'Bill McBride',              url: 'https://calculatedriskblog.com',             cat: 'Macro',          color: '#64748b', freq: 'Daily',   desc: 'Best source for housing data, economic indicators, and long-form macro analysis. Called the 2008 housing crisis early.' },
  { name: 'Crossing Wall Street',       author: 'Eddy Elfenbein',            url: 'https://crossingwallst.com',                 cat: 'Investing',      color: '#16a34a', freq: 'Weekly',  desc: 'Annual Buy List that consistently outperforms the S&P. Straightforward, data-backed long-term stock investing.' },
  { name: 'CFA Institute Blogs',        author: 'CFA Institute',             url: 'https://blogs.cfainstitute.org',             cat: 'Education',      color: '#0284c7', freq: 'Daily',   desc: "Professional-grade research and commentary from the world's largest investment professional body." },
  { name: 'Kiplinger Personal Finance', author: 'Kiplinger Editorial',       url: 'https://kiplinger.com',                      cat: 'Investing',      color: '#10b981', freq: 'Daily',   desc: 'Practical personal finance and investing guidance for individual investors at all experience levels.' },
  { name: 'Quant Investing',            author: 'Tim du Toit',               url: 'https://quantinvesting.com',                 cat: 'Quant',          color: '#0f766e', freq: 'Weekly',  desc: 'Simple quantitative strategies for individual investors. Backtested factor approaches without the complexity.' },
  // More Investing
  { name: 'Dividend Growth Investor',   author: 'Dividend Growth Investor',  url: 'https://dividendgrowthinvestor.com',         cat: 'Investing',      color: '#16a34a', freq: 'Weekly',  desc: 'Focused entirely on dividend growth investing. Tracks Dividend Aristocrats and Kings with long analysis history.' },
  { name: 'Sure Dividend',              author: 'Ben Reynolds',              url: 'https://suredividend.com/blog',              cat: 'Investing',      color: '#15803d', freq: 'Weekly',  desc: 'Actionable analysis of high-quality dividend stocks ranked by 8 Rules of Dividend Investing. Free and premium tiers.' },
  { name: 'Base Hit Investing',         author: 'John Huber',                url: 'https://basehitinvesting.com',               cat: 'Investing',      color: '#0369a1', freq: 'Monthly', desc: 'High-quality letters on compounders, returns on capital, and long-term business analysis. Low-volume, high-value.' },
  { name: 'MicroCapClub',               author: 'Ian Cassel',                url: 'https://microcapclub.com/blog',              cat: 'Investing',      color: '#7c3aed', freq: 'Weekly',  desc: 'Community and analysis focused on microcap investing. Best resource for finding underfollowed small companies.' },
  // More Markets
  { name: 'The Market Ear',             author: 'The Market Ear Team',       url: 'https://themarketear.com',                  cat: 'Markets',        color: '#f59e0b', freq: 'Daily',   desc: 'Curated daily charts and institutional market color. Used by professional traders to track flow and positioning.' },
  { name: 'All Star Charts',            author: 'JC Parets',                 url: 'https://allstarcharts.com/blog',             cat: 'Markets',        color: '#f97316', freq: 'Daily',   desc: 'Technical analysis of global markets and intermarket relationships. Popular chartist with strong institutional following.' },
  // More Macro
  { name: 'Macro Hive',                 author: 'Bilal Hafeez',              url: 'https://macrohive.com',                     cat: 'Macro',          color: '#0284c7', freq: 'Daily',   desc: 'Research and commentary for macro traders: FX, rates, commodities, and emerging markets analysis.' },
  { name: 'George Goncalves (MUFG)',    author: 'George Goncalves',          url: 'https://substack.com/@georgegoncalves',     cat: 'Macro',          color: '#0369a1', freq: 'Weekly',  desc: 'Fixed income and rates strategy from one of Wall Street\'s most respected bond strategists.' },
  // More Quant
  { name: 'Ernie Chan (Quantitative Trading)', author: 'Ernest Chan',       url: 'https://epchan.blogspot.com',               cat: 'Quant',          color: '#6366f1', freq: 'Monthly', desc: 'Author of "Quantitative Trading" and "Algorithmic Trading." Practical quant research and live strategy results.' },
  { name: 'QuantConnect Blog',          author: 'QuantConnect Team',         url: 'https://quantconnect.com/blog',             cat: 'Quant',          color: '#4f46e5', freq: 'Weekly',  desc: 'Algorithmic trading strategies, backtesting tutorials, and open-source quant research for Python developers.' },
  // Options
  { name: 'tastylive Research',         author: 'tastylive Team',            url: 'https://tastylive.com/concepts-strategies', cat: 'Options',        color: '#f59e0b', freq: 'Daily',   desc: 'Evidence-based options research: IV rank, probability studies, and strategy performance from millions of trades.' },
  { name: 'Predicting Alpha',           author: 'Predicting Alpha Team',     url: 'https://predictingalpha.com/blog',          cat: 'Options',        color: '#a855f7', freq: 'Weekly',  desc: 'Data-driven options strategy analysis. Covers volatility surface, earnings plays, and 0DTE research.' },
  // More Tech/Business
  { name: 'Ben Evans',                  author: 'Benedict Evans',            url: 'https://ben-evans.com',                     cat: 'Tech/Business',  color: '#0f766e', freq: 'Weekly',  desc: 'Former a16z partner with unmatched perspective on tech industry trends, disruption, and the long arc of technology.' },
  { name: 'Not Boring',                 author: 'Packy McCormick',           url: 'https://www.notboring.co',                  cat: 'Tech/Business',  color: '#8b5cf6', freq: 'Weekly',  desc: 'Compelling deep dives on the most interesting tech companies, business models, and tech-enabled opportunities.' },
  // More Education
  { name: 'Options Playbook',           author: 'Brian Overby',              url: 'https://optionsplaybook.com',               cat: 'Education',      color: '#f97316', freq: 'Monthly', desc: 'Free visual options strategy reference. Covers 40+ strategies with P&L diagrams and clear explanations.' },
  { name: 'Investopedia Academy Blog',  author: 'Investopedia Team',         url: 'https://investopedia.com/financial-advisor-4427709', cat: 'Education', color: '#1d4ed8', freq: 'Daily', desc: 'In-depth explainers and tutorials on every concept in investing, trading, and personal finance.' },
];

const BLOG_CATS  = ['All', 'Investing', 'Markets', 'Macro', 'Value Investing', 'Quant', 'Options', 'Tech/Business', 'Education'];
// ── Day Trading Resources ──────────────────────────────────────────────────────

const DAY_TRADING = {
  tools: [
    { name: 'Thinkorswim (TD Ameritrade)', url: 'https://schwab.com/trading/thinkorswim', color: '#22c55e', type: 'Platform',    desc: 'Industry-leading desktop platform with advanced Level II, scanners, time & sales, and paper trading.' },
    { name: 'TraderSync',          url: 'https://tradersync.com',                          color: '#6366f1', type: 'Journal',     desc: 'Best trade journal for day traders. Tracks P&L, performance patterns, emotional state, and playbook.' },
    { name: 'Tradervue',           url: 'https://tradervue.com',                           color: '#3b82f6', type: 'Journal',     desc: 'Import broker data and analyze your trading patterns. Spot strengths and weaknesses with data.' },
    { name: 'Hotkeys.io',          url: 'https://hotkeys.io',                              color: '#f97316', type: 'Tools',       desc: 'Build custom hotkey layouts for fast execution. Critical for momentum and scalping strategies.' },
    { name: 'Benzinga Pro',        url: 'https://pro.benzinga.com',                        color: '#f59e0b', type: 'News Feed',   desc: 'Real-time news squawk box with audio alerts. Most popular catalyst scanner for day traders.' },
    { name: 'Finviz Elite',        url: 'https://finviz.com/elite.ashx',                   color: '#06b6d4', type: 'Scanner',     desc: 'Real-time premarket scanner and intraday filters. Essential for finding momentum setups daily.' },
    { name: 'Trade Ideas',         url: 'https://trade-ideas.com',                         color: '#8b5cf6', type: 'AI Scanner',  desc: 'AI-powered stock scanner that finds real-time intraday setups. Holly AI auto-trades strategies.' },
    { name: 'Level 2 Stock Charts',url: 'https://level2stockcharts.com',                   color: '#10b981', type: 'Data',        desc: 'Free Level 2 order book visualization and time & sales data for active traders.' },
    { name: 'StockBeep',           url: 'https://stockbeep.com',                           color: '#ef4444', type: 'Scanner',     desc: 'Free real-time stock scanner for unusual volume, gap ups/downs, and momentum movers.' },
    { name: 'Floatchecker.com',    url: 'https://floatchecker.com',                        color: '#a855f7', type: 'Data',        desc: 'Find low float stocks with high short interest — the fuel for explosive momentum moves.' },
  ],
  books: [
    { title: 'How to Day Trade for a Living',       author: 'Andrew Aziz',                level: 'Beginner',     color: '#22c55e', desc: 'Best-selling intro to day trading. Covers chart patterns, Level 2, momentum setups, and risk management basics.' },
    { title: 'The Complete Turtle Trader',           author: 'Michael Covel',              level: 'Beginner',     color: '#3b82f6', desc: 'The story of Richard Dennis\'s Turtle Traders experiment. Proves systematic rules beat gut instinct.' },
    { title: 'Momentum Trading on the Edge',         author: 'Khit Wong',                 level: 'Intermediate', color: '#f97316', desc: 'Intraday momentum strategies using VWAP, premarket levels, and volume confirmation setups.' },
    { title: 'Trading in the Zone',                  author: 'Mark Douglas',              level: 'Beginner',     color: '#8b5cf6', desc: 'The psychology bible for day traders. Achieving consistent discipline, objectivity, and risk acceptance.' },
    { title: 'The Art of the Trade',                 author: 'R.E. McMaster',             level: 'Intermediate', color: '#f59e0b', desc: 'Covers technical setups, crowd psychology, and the mental edge required for professional trading.' },
    { title: 'Techniques of Tape Reading',           author: 'Vadym Graifer',             level: 'Advanced',     color: '#0ea5e9', desc: 'Master reading order flow, tape, and Level 2 to understand institutional activity in real time.' },
    { title: 'High Probability Trading',             author: 'Marcel Link',               level: 'Intermediate', color: '#14b8a6', desc: 'Systematic approach to improving win rate: filtering setups, managing emotions, and cutting losses.' },
    { title: 'The Daily Trading Coach',              author: 'Brett Steenbarger',         level: 'Intermediate', color: '#a855f7', desc: '101 lessons for developing discipline and performance. The top book for trading psychology and process.' },
    { title: 'Trade the Open',                       author: 'Ross Cameron',              level: 'Beginner',     color: '#ec4899', desc: 'Warrior Trading founder explains his small account challenge strategy and gap & go methodology.' },
    { title: 'Momentum Masters',                     author: 'Mark Minervini et al.',     level: 'Intermediate', color: '#d97706', desc: 'Roundtable discussions with US Investing Champions on finding, entering, and managing momentum trades.' },
  ],
  tips: [
    { title: 'Only trade the first 2 hours',      desc: 'The open (9:30–11:30 AM ET) has the highest volume, biggest moves, and best setups. Avoid the midday chop.' },
    { title: 'Pre-market prep is mandatory',       desc: 'Scan for gap ups/downs, news catalysts, and overnight movers before the bell. Know your watchlist before 9:00 AM.' },
    { title: 'Risk 1% per trade maximum',          desc: 'Never risk more than 1% of your account on any single trade. Consistent sizing prevents blowups from bad days.' },
    { title: 'Master one setup first',             desc: 'Pick one setup (VWAP reclaim, gap & go, bull flag) and trade only that until it\'s consistently profitable.' },
    { title: 'Keep a trade journal',               desc: 'Review every trade daily: entry, exit, P&L, emotion, and what you would do differently. This separates pros from amateurs.' },
    { title: 'Volume confirms the move',           desc: 'High relative volume (3x+ average) is the single best filter for momentum trades. No volume = no conviction.' },
    { title: 'Cut losses at predetermined stops',  desc: 'Define your stop before entering. When it\'s hit, exit without hesitation. Hoping and holding destroys accounts.' },
    { title: 'Avoid trading in a losing streak',   desc: 'After 3 consecutive losses, stop for the day. Revenge trading while emotional is how accounts go to zero.' },
  ],
};

// ── Options Trading Resources ──────────────────────────────────────────────────

const OPTIONS_TRADING = {
  tools: [
    { name: 'tastytrade Platform',   url: 'https://tastytrade.com',                        color: '#f59e0b', type: 'Broker',         desc: 'Best broker for options traders. Built around selling premium with streamlined workflows and great fills.' },
    { name: 'Options Profit Calc',   url: 'https://optionsprofitcalculator.com',           color: '#7c3aed', type: 'Calculator',      desc: 'Visualize P&L at expiration for any strategy. Free, fast, and indispensable for planning trades.' },
    { name: 'Market Chameleon',      url: 'https://marketchameleon.com',                   color: '#be185d', type: 'IV Data',         desc: 'Best free source for IV rank, IV percentile, earnings IV crush history, and expected move data.' },
    { name: 'Unusual Whales',        url: 'https://unusualwhales.com',                     color: '#9333ea', type: 'Flow Tracker',    desc: 'Real-time unusual options activity. Track smart money bets and institutional options positioning.' },
    { name: 'Barchart Options',      url: 'https://barchart.com/options',                  color: '#15803d', type: 'Screener',        desc: 'Free options volume leaders, unusual activity scanner, and IV rank tables across all optionable stocks.' },
    { name: 'CBOE VIX Dashboard',    url: 'https://cboe.com/tradable-products/vix',        color: '#1d4ed8', type: 'VIX Data',        desc: 'Official VIX, VIX9D, VIX3M, and VVIX data. Essential for understanding overall market volatility regime.' },
    { name: 'Options Alpha Platform',url: 'https://optionsalpha.com',                      color: '#8b5cf6', type: 'Automation',      desc: 'Automate options strategies with bots. Backtest and deploy mechanical premium-selling systems.' },
    { name: 'Optionstrat',           url: 'https://optionstrat.com',                       color: '#0891b2', type: 'Strategy Viz',    desc: 'Beautiful options strategy builder and P&L visualizer. Compare strategies side by side with Greeks.' },
    { name: 'tastylive Research',    url: 'https://tastylive.com/concepts-strategies',     color: '#f97316', type: 'Research',        desc: 'Thousands of hours of backtested options research. Probability studies, IV rank, and risk-defined strategies.' },
    { name: 'OptionStacks',          url: 'https://www.optionstacks.com',                  color: '#0f766e', type: 'Backtester',      desc: 'Backtest options strategies against historical data. Test spreads, strangles, and covered calls.' },
  ],
  books: [
    { title: 'Options as a Strategic Investment',         author: 'Lawrence McMillan',    level: 'Advanced',     color: '#a855f7', desc: 'The most comprehensive options reference written. Covers every strategy with full Greeks and risk analysis.' },
    { title: 'Option Volatility & Pricing',               author: 'Sheldon Natenberg',    level: 'Advanced',     color: '#d946ef', desc: 'Professional options pricing and volatility theory. The standard text for market makers and traders.' },
    { title: "The Unlucky Investor's Guide to Options",   author: 'Julia Spina',          level: 'Beginner',     color: '#c026d3', desc: 'Data-driven probability-based options intro. Uses tastytrade research. Best modern beginner options book.' },
    { title: "Option Trader's Hedge Fund",                author: 'Dennis Chen & Mark Sebastian', level: 'Intermediate', color: '#9333ea', desc: 'Run a systematic premium-selling business with defined risk. Covers portfolio theta and trade management.' },
    { title: 'Trading Options Greeks',                    author: 'Dan Passarelli',       level: 'Advanced',     color: '#7c3aed', desc: 'Master delta, gamma, theta, and vega for constructing and adjusting real-world options positions.' },
    { title: 'Volatility Trading',                        author: 'Euan Sinclair',        level: 'Advanced',     color: '#6d28d9', desc: 'Quantitative volatility strategies: forecasting IV, extracting edge from vol surface mispricings.' },
    { title: 'Positional Options Trading',                author: 'Euan Sinclair',        level: 'Advanced',     color: '#5b21b6', desc: 'Portfolio-level options strategies with quantitative edge. Covers strangles, IC, and ratio spreads.' },
    { title: "Get Rich with Options",                     author: 'Lee Lowell',           level: 'Beginner',     color: '#4c1d95', desc: 'Four core income strategies: covered calls, cash-secured puts, spreads, and LEAPS explained simply.' },
    { title: 'The Option Advantage',                      author: 'Billy Williams',       level: 'Beginner',     color: '#3b82f6', desc: 'Step-by-step guide to using options for income. Covers the basics of vertical spreads and iron condors.' },
    { title: 'Options Trading Crash Course',              author: 'Frank Richmond',       level: 'Beginner',     color: '#1d4ed8', desc: 'The fastest path from zero to placing your first real options trade with defined risk.' },
  ],
  strategies: [
    { name: 'Covered Call',       risk: 'Low',    income: 'Monthly', desc: 'Sell calls against stock you own. Generate 1-3% monthly income while capping upside. Best in neutral to slightly bullish markets.' },
    { name: 'Cash-Secured Put',   risk: 'Low',    income: 'Monthly', desc: 'Sell puts on stocks you want to own at a lower price. Collect premium while waiting for a pullback to your buy zone.' },
    { name: 'Bull Put Spread',    risk: 'Low',    income: 'Monthly', desc: 'Sell a put, buy a lower put. Defined risk bullish trade that profits when stock stays above the short strike.' },
    { name: 'Bear Call Spread',   risk: 'Low',    income: 'Monthly', desc: 'Sell a call, buy a higher call. Defined risk bearish trade that profits when stock stays below the short strike.' },
    { name: 'Iron Condor',        risk: 'Medium', income: 'Monthly', desc: 'Combine bull put spread + bear call spread. Profit if stock stays range-bound. 68% probability of profit at 1σ strikes.' },
    { name: 'Iron Butterfly',     risk: 'Medium', income: 'Monthly', desc: 'Sell ATM straddle, buy OTM wings. Higher credit than condor but narrower profit zone. Best in low-vol environments.' },
    { name: 'Short Strangle',     risk: 'High',   income: 'Monthly', desc: 'Sell OTM call and put on the same underlying. High win rate but undefined risk. Size small (1-2% max risk).' },
    { name: 'PMCC (Poor Man CC)', risk: 'Low',    income: 'Monthly', desc: 'Buy deep ITM LEAP, sell short-term calls against it. Leveraged covered call substitute at 30% of the capital.' },
    { name: 'Wheel Strategy',     risk: 'Low',    income: 'Monthly', desc: 'Sell CSPs until assigned, then sell covered calls until called away. Repeating cycle of premium collection.' },
    { name: 'Long Straddle',      risk: 'Medium', income: 'Event',   desc: 'Buy ATM call + put before earnings or catalyst. Profits from large moves in either direction. Needs >IV crush move.' },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Education() {
  const [mainTab,   setMainTab]   = useState('websites');
  const [webCat,    setWebCat]    = useState('All');
  const [webSearch, setWebSearch] = useState('');
  const [bookCat,   setBookCat]   = useState('All');
  const [bookLevel, setBookLevel] = useState('All Levels');
  const [bookSearch,setBookSearch]= useState('');
  const [blogCat,   setBlogCat]   = useState('All');
  const [blogSearch,setBlogSearch]= useState('');

  const filteredSites = useMemo(() => {
    const q = webSearch.trim().toLowerCase();
    return WEBSITES.filter(s =>
      (webCat === 'All' || s.cat === webCat) &&
      (!q || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.cat.toLowerCase().includes(q)),
    );
  }, [webCat, webSearch]);

  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return BOOKS.filter(b =>
      (bookCat   === 'All'        || b.cat   === bookCat) &&
      (bookLevel === 'All Levels' || b.level === bookLevel) &&
      (!q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q)),
    );
  }, [bookCat, bookLevel, bookSearch]);

  const filteredBlogs = useMemo(() => {
    const q = blogSearch.trim().toLowerCase();
    return BLOGS.filter(b =>
      (blogCat === 'All' || b.cat === blogCat) &&
      (!q || b.name.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.desc.toLowerCase().includes(q)),
    );
  }, [blogCat, blogSearch]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold mb-1">Education</h1>
        <p className="text-gray-500 text-sm">Curated resources — essential websites, tools, books, and blogs for serious investors</p>
      </div>

      {/* Main tabs */}
      <div className="flex gap-1 border-b border-[#2a2a2a] mb-6 overflow-x-auto scrollbar-none">
        {[
          { id: 'websites',    label: 'Websites & Tools', icon: Globe },
          { id: 'books',       label: 'Books',             icon: BookOpen },
          { id: 'blogs',       label: 'Blogs',             icon: Rss },
          { id: 'daytrading',  label: 'Day Trading',       icon: Activity },
          { id: 'options',     label: 'Options Trading',   icon: BarChart2 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              mainTab === id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Websites tab ─────────────────────────────────────────────────────── */}
      {mainTab === 'websites' && (
        <div>
          {/* Search + category filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                value={webSearch}
                onChange={e => setWebSearch(e.target.value)}
                placeholder="Search websites…"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white placeholder-gray-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap">
              {WEBSITE_CATS.map(cat => (
                <button key={cat} onClick={() => setWebCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    webCat === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="text-gray-600 text-xs mb-4">{filteredSites.length} resource{filteredSites.length !== 1 ? 's' : ''}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSites.map(site => (
              <a key={site.name} href={site.url} target="_blank" rel="noreferrer"
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                      style={{ background: `${site.color}25`, border: `1px solid ${site.color}40`, color: site.color }}>
                      {site.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{site.name}</p>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5 inline-block"
                        style={{ backgroundColor: `${site.color}20`, color: site.color }}>
                        {site.cat}
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                </div>
                <p className="text-gray-400 text-xs leading-relaxed flex-1">{site.desc}</p>
                <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                  <span className="text-gray-600 text-[10px] font-mono truncate block">
                    {site.url.replace('https://', '')}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Books tab ────────────────────────────────────────────────────────── */}
      {mainTab === 'books' && (
        <div>
          {/* Search */}
          <div className="relative max-w-sm mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={bookSearch}
              onChange={e => setBookSearch(e.target.value)}
              placeholder="Search books or authors…"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white placeholder-gray-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap gap-4 mb-5">
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1.5">Category</p>
              <div className="flex gap-1.5 flex-wrap">
                {BOOK_CATS.map(cat => (
                  <button key={cat} onClick={() => setBookCat(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      bookCat === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-wider mb-1.5">Level</p>
              <div className="flex gap-1.5 flex-wrap">
                {BOOK_LEVELS.map(lvl => (
                  <button key={lvl} onClick={() => setBookLevel(lvl)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      bookLevel === lvl
                        ? 'bg-indigo-600 text-white'
                        : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-gray-600 text-xs mb-4">{filteredBooks.length} book{filteredBooks.length !== 1 ? 's' : ''}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map(book => (
              <div key={book.title}
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all group flex">
                <div className="w-1.5 shrink-0" style={{ backgroundColor: book.color }} />
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${book.color}20`, color: book.color }}>
                      {book.cat}
                    </span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[book.level]}`}>
                      {book.level}
                    </span>
                  </div>
                  <p className="text-white font-bold text-sm leading-snug mb-0.5 group-hover:text-indigo-300 transition-colors">
                    {book.title}
                  </p>
                  <p className="text-gray-500 text-xs mb-3">
                    {book.author} · <span className="text-gray-600">{book.year}</span>
                  </p>
                  <p className="text-gray-400 text-xs leading-relaxed flex-1">{book.desc}</p>
                  <div className="flex items-center gap-1 mt-3 pt-2.5 border-t border-[#2a2a2a]">
                    {[...Array(5)].map((_, i) => {
                      const filled = book.level === 'Beginner' ? i < 2 : book.level === 'Intermediate' ? i < 3 : true;
                      return (
                        <Star key={i} size={10}
                          className={filled ? 'text-yellow-400' : 'text-gray-700'}
                          fill={filled ? 'currentColor' : 'none'} />
                      );
                    })}
                    <span className="text-gray-600 text-[10px] ml-1 flex-1">Complexity</span>
                    <a href={book.amzn} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 transition-colors shrink-0 ml-auto">
                      <ExternalLink size={9} /> Amazon
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Blogs tab ────────────────────────────────────────────────────────── */}
      {mainTab === 'blogs' && (
        <div>
          {/* Search + category */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              <input
                value={blogSearch}
                onChange={e => setBlogSearch(e.target.value)}
                placeholder="Search blogs or authors…"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white placeholder-gray-600 rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap">
              {BLOG_CATS.map(cat => (
                <button key={cat} onClick={() => setBlogCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    blogCat === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500'
                  }`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="text-gray-600 text-xs mb-4">{filteredBlogs.length} blog{filteredBlogs.length !== 1 ? 's' : ''}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBlogs.map(blog => (
              <a key={blog.name} href={blog.url} target="_blank" rel="noreferrer"
                className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                      style={{ background: `${blog.color}25`, border: `1px solid ${blog.color}40`, color: blog.color }}>
                      {blog.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{blog.name}</p>
                      <p className="text-gray-500 text-xs">{blog.author}</p>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
                </div>

                <p className="text-gray-400 text-xs leading-relaxed flex-1">{blog.desc}</p>

                <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${blog.color}20`, color: blog.color }}>
                    {blog.cat}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${FREQ_COLOR[blog.freq]}`}>
                    {blog.freq}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {/* ── Day Trading tab ──────────────────────────────────────────────────── */}
      {mainTab === 'daytrading' && (
        <div className="space-y-10">
          {/* Key Tips */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-yellow-400" />
              <h2 className="text-white font-semibold">Essential Rules for Day Traders</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DAY_TRADING.tips.map((tip, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-white text-sm font-semibold leading-snug">{tip.title}</p>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed pl-7">{tip.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Tools */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-indigo-400" />
              <h2 className="text-white font-semibold">Day Trading Platforms & Tools</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAY_TRADING.tools.map(tool => (
                <a key={tool.name} href={tool.url} target="_blank" rel="noreferrer"
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${tool.color}25`, border: `1px solid ${tool.color}40`, color: tool.color }}>
                        {tool.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors">{tool.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ color: tool.color, background: `${tool.color}18` }}>
                          {tool.type}
                        </span>
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-gray-600 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{tool.desc}</p>
                </a>
              ))}
            </div>
          </section>

          {/* Books */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-green-400" />
              <h2 className="text-white font-semibold">Essential Day Trading Books</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DAY_TRADING.books.map(book => (
                <div key={book.title}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all group flex">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: book.color }} />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[book.level]}`}>{book.level}</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-snug mb-0.5 group-hover:text-indigo-300 transition-colors">{book.title}</p>
                    <p className="text-gray-500 text-xs mb-3">{book.author}</p>
                    <p className="text-gray-400 text-xs leading-relaxed flex-1">{book.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Options Trading tab ───────────────────────────────────────────────── */}
      {mainTab === 'options' && (
        <div className="space-y-10">
          {/* Strategies quick-reference */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-purple-400" />
              <h2 className="text-white font-semibold">Strategy Quick Reference</h2>
              <span className="text-gray-500 text-xs ml-1">Income · Defined Risk · Probability-Based</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {OPTIONS_TRADING.strategies.map(s => {
                const riskColor = s.risk === 'Low' ? '#22c55e' : s.risk === 'Medium' ? '#f59e0b' : '#ef4444';
                return (
                  <div key={s.name} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-white font-bold text-sm">{s.name}</p>
                      <div className="flex gap-1.5 ml-2 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ color: riskColor, background: `${riskColor}18` }}>
                          {s.risk} Risk
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-indigo-500/10 text-indigo-400">
                          {s.income}
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Tools */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-indigo-400" />
              <h2 className="text-white font-semibold">Options Platforms & Tools</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {OPTIONS_TRADING.tools.map(tool => (
                <a key={tool.name} href={tool.url} target="_blank" rel="noreferrer"
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: `${tool.color}25`, border: `1px solid ${tool.color}40`, color: tool.color }}>
                        {tool.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm group-hover:text-indigo-300 transition-colors leading-snug">{tool.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ color: tool.color, background: `${tool.color}18` }}>
                          {tool.type}
                        </span>
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-gray-600 group-hover:text-indigo-400 shrink-0 mt-0.5" />
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">{tool.desc}</p>
                </a>
              ))}
            </div>
          </section>

          {/* Books */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-green-400" />
              <h2 className="text-white font-semibold">Essential Options Books</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {OPTIONS_TRADING.books.map(book => (
                <div key={book.title}
                  className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all group flex">
                  <div className="w-1.5 shrink-0" style={{ backgroundColor: book.color }} />
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${LEVEL_COLOR[book.level]}`}>{book.level}</span>
                    </div>
                    <p className="text-white font-bold text-sm leading-snug mb-0.5 group-hover:text-indigo-300 transition-colors">{book.title}</p>
                    <p className="text-gray-500 text-xs mb-3">{book.author}</p>
                    <p className="text-gray-400 text-xs leading-relaxed flex-1">{book.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
