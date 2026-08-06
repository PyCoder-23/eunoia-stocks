import { API_URL } from '../../config';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { IndianRupee, Briefcase, TrendingUp, Newspaper, Activity, ChevronRight } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { gameState, leaderboard, newsFeed, companies } = useSocket();
  const [portfolioSummary, setPortfolioSummary] = useState<{ portfolioValue: number; totalInvested: number; totalUnrealizedPL: number }>({
    portfolioValue: 0,
    totalInvested: 0,
    totalUnrealizedPL: 0,
  });

  useEffect(() => {
    const fetchMyPortfolio = async () => {
      try {
        const res = await axios.get(`${API_URL}/game/portfolio`);
        if (res.data && res.data.summary) {
          setPortfolioSummary(res.data.summary);
        }
      } catch (err) {
        console.error('Error fetching portfolio summary:', err);
      }
    };

    fetchMyPortfolio();
  }, [user, companies]); // re-fetch when prices update

  const myRank = leaderboard.find(l => l.userId === user?.id)?.rank || 'N/A';
  const netWorth = (user?.cash || 0) + portfolioSummary.portfolioValue;
  const isPositivePL = portfolioSummary.totalUnrealizedPL >= 0;
  const topNews = newsFeed.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-bl from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>
        
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-extrabold uppercase tracking-wider">
              {user?.teamName || 'Competing Team'}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
              Rank #{myRank}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Welcome to the Competition Floor
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Current Stage: <span className="text-white font-semibold">{gameState.roundName}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/market"
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Enter Stock Exchange</span>
          </Link>
          <Link
            to="/portfolio"
            className="px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700/60 transition flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4 text-teal-400" />
            <span>Manage Holdings</span>
          </Link>
        </div>
      </div>

      {/* Top Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Net Worth */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Net Worth</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
            ₹{netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Cash + Current Portfolio Valuation</span>
        </div>

        {/* Card 2: Cash Balance */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-teal-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Cash</span>
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-teal-400 font-['Outfit'] tracking-tight">
            ₹{(user?.cash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Ready for immediate trades</span>
        </div>

        {/* Card 3: Invested Portfolio Value */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Portfolio Valuation</span>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
            ₹{portfolioSummary.portfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Invested cost: ₹{portfolioSummary.totalInvested.toLocaleString('en-IN')}</span>
        </div>

        {/* Card 4: Profit / Loss */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unrealized P/L</span>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isPositivePL ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-extrabold font-['Outfit'] tracking-tight flex items-center gap-1 ${
            isPositivePL ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPositivePL ? '+' : ''}₹{portfolioSummary.totalUnrealizedPL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">
            {isPositivePL ? 'Current investment gains' : 'Current investment deficit'}
          </span>
        </div>
      </div>

      {/* Breaking News Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Recent Breaking News */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white font-['Outfit']">Breaking News</h3>
                  <span className="text-xs text-slate-400">Market shifting intelligence</span>
                </div>
              </div>
              <Link to="/news" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {topNews.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Newspaper className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No breaking news released yet.</p>
                <span className="text-xs">News events will appear in Round 2 & 3!</span>
              </div>
            ) : (
              <div className="space-y-4">
                {topNews.map((news) => (
                  <div key={news.id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/60 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-emerald-400 uppercase tracking-wider">{news.category}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        news.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse' :
                        news.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {news.severity}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1 line-clamp-2">{news.headline}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{news.description}</p>
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Expected Impact:</span>
                      <span className={`font-mono font-bold ${news.expectedImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {news.expectedImpact >= 0 ? '+' : ''}{news.expectedImpact}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <span className="text-xs text-slate-400 block mb-3 font-medium">Ready to capitalize on news momentum?</span>
            <Link
              to="/market"
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-white font-bold text-xs uppercase tracking-wider border border-slate-700/80 transition block text-center"
            >
              Trade Stock Options Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
