import { ExternalLink, Clock } from 'lucide-react';

const categoryColors = {
  Economy: 'bg-blue-500/10 text-blue-400',
  Markets:  'bg-indigo-500/10 text-indigo-400',
  Earnings: 'bg-yellow-500/10 text-yellow-400',
  Tech:     'bg-purple-500/10 text-purple-400',
  Commodities: 'bg-orange-500/10 text-orange-400',
  Crypto:   'bg-yellow-500/10 text-yellow-300',
  Autos:    'bg-red-500/10 text-red-400',
  AI:       'bg-pink-500/10 text-pink-400',
};

export default function NewsCard({ article, compact = false }) {
  const cc = categoryColors[article.category] || 'bg-gray-500/10 text-gray-400';

  if (compact) {
    return (
      <a href={article.url} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors group">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 group-hover:text-white line-clamp-2 transition-colors leading-snug">
            {article.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{article.source}</span>
            <span className="text-gray-600">·</span>
            <Clock size={10} className="text-gray-600" />
            <span className="text-xs text-gray-600">{article.time}</span>
          </div>
        </div>
        <ExternalLink size={13} className="text-gray-600 group-hover:text-gray-400 shrink-0 mt-0.5 transition-colors" />
      </a>
    );
  }

  return (
    <a href={article.url}
      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 hover:border-indigo-500/40 hover:bg-[#1f1f1f] transition-all group block">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cc}`}>{article.category}</span>
        <div className="flex items-center gap-1 text-gray-600 text-xs shrink-0">
          <Clock size={11} />
          {article.time}
        </div>
      </div>
      <h3 className="text-sm text-gray-200 group-hover:text-white font-medium leading-snug line-clamp-3 transition-colors mb-2">
        {article.title}
      </h3>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{article.source}</span>
        <ExternalLink size={13} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
      </div>
    </a>
  );
}
