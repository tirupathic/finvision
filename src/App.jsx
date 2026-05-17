import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TabsProvider } from './context/TabsContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import StockDetail from './pages/StockDetail';
import Markets from './pages/Markets';
import Crypto from './pages/Crypto';
import Portfolio from './pages/Portfolio';
import News from './pages/News';
import Screener from './pages/Screener';
import Performance from './pages/Performance';
import Strategies from './pages/Strategies';
import ETFs from './pages/ETFs';
import Stocks from './pages/Stocks';
import Education from './pages/Education';
import EarningsPage from './pages/Earnings';

export default function App() {
  return (
    <BrowserRouter>
      <TabsProvider>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/"            element={<Markets />} />
            <Route path="/stock/:symbol" element={<StockDetail />} />
            <Route path="/markets"     element={<Markets />} />
            <Route path="/crypto"      element={<Crypto />} />
            <Route path="/portfolio"   element={<Portfolio />} />
            <Route path="/news"        element={<News />} />
            <Route path="/screener"    element={<Screener />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/strategies"  element={<Strategies />} />
            <Route path="/stocks"      element={<Stocks />} />
            <Route path="/etfs"        element={<ETFs />} />
            <Route path="/education"   element={<Education />} />
            <Route path="/earnings"    element={<EarningsPage />} />
            <Route path="/calendar"    element={<EarningsPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
      </TabsProvider>
    </BrowserRouter>
  );
}
