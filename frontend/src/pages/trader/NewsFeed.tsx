import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { Newspaper, AlertTriangle, TrendingUp, TrendingDown, Clock, Sparkles } from 'lucide-react';

export const NewsFeed: React.FC = () => {
  const { newsFeed } = useSocket();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'Technology', 'Healthcare', 'Energy', 'Banking', 'Global Market', 'Company News'];

  const filteredNews = newsFeed.filter(news => {
    if (selectedCategory === 'ALL') return true;
    return news.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold text-xs uppercase tracking-wider animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Critical Alert
          </span>
        );
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-xs uppercase tracking-wider">High Impact</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider">Medium Impact</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-400 border border-slate-700 font-bold text-xs uppercase tracking-wider">Market Notice</span>;
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight flex items-center gap-2.5">
            <Newspaper className="w-8 h-8 text-emerald-400" />
            <span>Live Intelligence News Feed</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Breaking AI and Admin announcements affecting corporate valuations and sector momentum
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* News Stream */}
      {filteredNews.length === 0 ? (
        <div className="glass-panel p-16 rounded-3xl border border-slate-800/80 text-center text-slate-500">
          <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-extrabold text-slate-300 mb-1">No News Articles Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {selectedCategory === 'ALL'
              ? 'Breaking market news will be published periodically during Round 2 and Round 3!'
              : `No intelligence articles currently listed under category "${selectedCategory}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNews.map((news) => {
            const isPositive = news.expectedImpact >= 0;
            return (
              <div
                key={news.id}
                className="glass-card p-6 rounded-3xl border border-slate-800/80 hover:border-slate-700/80 transition-all shadow-xl relative overflow-hidden group"
              >
                {/* Accent glow line on left */}
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                  news.severity === 'CRITICAL' ? 'bg-rose-500' :
                  isPositive ? 'bg-emerald-400' : 'bg-amber-500'
                }`}></div>

                <div className="pl-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 font-['Outfit']">
                        {news.category}
                      </span>
                      {getSeverityBadge(news.severity)}
                      {news.affectedSector && (
                        <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-semibold">
                          Target: {news.affectedSector} Sector
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatTime(news.timestamp)}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-white font-['Outfit'] mb-2 group-hover:text-emerald-300 transition-colors">
                    {news.headline}
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed mb-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
                    {news.description}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-400 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Simulation Market Impact:
                    </span>
                    <span
                      className={`font-mono font-bold px-3 py-1 rounded-lg flex items-center gap-1 text-sm ${
                        isPositive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span>{isPositive ? '+' : ''}{news.expectedImpact}% on {news.affectedSector || 'Entire Market'}</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
