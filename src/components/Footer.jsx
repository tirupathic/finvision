import { TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-[#2a2a2a] mt-16 py-8 px-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-indigo-500" size={18} />
            <span className="text-white font-bold">FinVision</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {['About','Terms','Privacy','Help','Contact'].map(l => (
              <Link key={l} to="#" className="hover:text-gray-300 transition-colors">{l}</Link>
            ))}
          </div>
          <p className="text-xs text-gray-600">
            Data is simulated for demo purposes only. Not financial advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
