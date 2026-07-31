import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { Award, TrendingUp, TrendingDown, Crown, Medal, Trophy } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { leaderboard } = useSocket();
  const { user } = useAuth();

  const topThree = leaderboard.slice(0, 3);

  const getPodiumCard = (item: any, place: number) => {
    if (!item) return null;
    const isMe = item.userId === user?.id;

    let borderClass = 'border-slate-800';
    let glowClass = '';
    let badgeBg = 'bg-slate-800 text-slate-300';
    let Icon = Trophy;
    let placeTitle = '3rd Place Bronze';

    if (place === 1) {
      borderClass = 'border-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.15)]';
      glowClass = 'bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-950';
      badgeBg = 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/30';
      Icon = Crown;
      placeTitle = '1st Place Gold';
    } else if (place === 2) {
      borderClass = 'border-slate-300/50 shadow-[0_0_20px_rgba(203,213,225,0.1)]';
      glowClass = 'bg-gradient-to-b from-slate-300/15 via-slate-900/90 to-slate-950';
      badgeBg = 'bg-slate-300 text-slate-950 font-black';
      Icon = Medal;
      placeTitle = '2nd Place Silver';
    } else if (place === 3) {
      borderClass = 'border-amber-700/50 shadow-[0_0_20px_rgba(180,83,9,0.1)]';
      glowClass = 'bg-gradient-to-b from-amber-700/15 via-slate-900/90 to-slate-950';
      badgeBg = 'bg-amber-700 text-white font-black';
      Icon = Trophy;
    }

    const isPositivePL = item.profitLoss >= 0;

    return (
      <div
        key={item.userId}
        className={`glass-card p-6 rounded-3xl border ${borderClass} ${glowClass} relative overflow-hidden flex flex-col justify-between transform transition duration-300 hover:scale-[1.02] ${
          place === 1 ? 'md:-translate-y-4 z-10' : ''
        }`}
      >
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Icon className={`w-7 h-7 ${place === 1 ? 'text-amber-400 animate-bounce' : place === 2 ? 'text-slate-300' : 'text-amber-600'}`} />
          </div>
          <span className={`inline-block px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-2 ${badgeBg}`}>
            {placeTitle}
          </span>
          <h3 className="text-2xl font-black text-white font-['Outfit'] tracking-tight flex items-center justify-center gap-2">
            <span>{item.teamName}</span>
            {isMe && <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] uppercase font-extrabold">You</span>}
          </h3>
          <span className="text-xs text-slate-400 font-mono">@{item.username}</span>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-800/80 font-mono text-sm">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-sans">Total Net Worth:</span>
            <span className="font-black text-xl text-white">₹{item.netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-sans">Cash Balance:</span>
            <span className="text-emerald-400 font-bold">₹{item.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-sans">Stock Portfolio:</span>
            <span className="text-teal-400 font-bold">₹{item.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/60 font-sans">
            <span className="text-slate-400">Total Profit / Loss:</span>
            <span className={`font-mono font-extrabold flex items-center gap-1 ${isPositivePL ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositivePL ? '+' : ''}₹{item.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-extrabold uppercase tracking-widest">
          <Award className="w-4 h-4" />
          <span>Real-Time Competition Standings</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white font-['Outfit'] tracking-tight">
          Live Competition Leaderboard
        </h1>
        <p className="text-slate-400 text-sm">
          Rankings are calculated automatically on every market tick by Total Net Worth (<strong className="text-white">Cash + Current Portfolio Valuation</strong>)
        </p>
      </div>

      {/* Top 3 Podium Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4">
        {getPodiumCard(topThree[1], 2)} {/* Silver left */}
        {getPodiumCard(topThree[0], 1)} {/* Gold center */}
        {getPodiumCard(topThree[2], 3)} {/* Bronze right */}
      </div>

      {/* Full Ranking Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-2xl">
        <div className="p-6 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-white font-['Outfit']">Complete Leaderboard Standings</h3>
          <span className="text-xs text-slate-400 font-mono">Live WebSocket Updates Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                <th className="py-4 px-6">Rank</th>
                <th className="py-4 px-6">Team Name & ID</th>
                <th className="py-4 px-6 text-right">Cash Balance</th>
                <th className="py-4 px-6 text-right">Portfolio Value</th>
                <th className="py-4 px-6 text-right">Total Net Worth</th>
                <th className="py-4 px-6 text-right">Profit / Loss</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {leaderboard.map((item) => {
                const isMe = item.userId === user?.id;
                const isPositive = item.profitLoss >= 0;

                return (
                  <tr
                    key={item.userId}
                    className={`transition-colors ${
                      isMe ? 'bg-emerald-500/15 font-bold' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-4 px-6">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                        item.rank === 1 ? 'bg-amber-400 text-slate-950' :
                        item.rank === 2 ? 'bg-slate-300 text-slate-950' :
                        item.rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{item.rank}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white font-['Outfit']">{item.teamName}</span>
                        {isMe && <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-[10px] uppercase font-extrabold">You</span>}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">@{item.username}</span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-emerald-400">
                      ₹{item.cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right font-mono text-teal-300">
                      ₹{item.portfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-black text-white text-base">
                      ₹{item.netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-6 text-right font-mono">
                      <div className={`font-extrabold flex items-center justify-end gap-1 ${
                        isPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        <span>{isPositive ? '+' : ''}₹{item.profitLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
