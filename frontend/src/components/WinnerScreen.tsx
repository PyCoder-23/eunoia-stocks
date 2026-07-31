import { API_URL } from '../config';
import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { Trophy, Crown, Medal, Download, RotateCcw, Sparkles } from 'lucide-react';
import axios from 'axios';

export const WinnerScreen: React.FC = () => {
  const { gameState, leaderboard, refreshMarketData } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (gameState.status === 'ENDED' && leaderboard.length > 0) {
      // Fire confetti celebration
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ['#FDE047', '#34D399', '#38BDF8', '#A855F7'],
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ['#FDE047', '#34D399', '#38BDF8', '#A855F7'],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [gameState.status, leaderboard.length]);

  if (gameState.status !== 'ENDED') return null;

  const topThree = leaderboard.slice(0, 3);

  const exportToCSV = () => {
    if (leaderboard.length === 0) return;

    const headers = ['Rank', 'Team Name', 'Username', 'Cash (₹)', 'Portfolio Value (₹)', 'Total Net Worth (₹)', 'Profit / Loss (₹)'];
    const rows = leaderboard.map(item => [
      item.rank,
      `"${item.teamName.replace(/"/g, '""')}"`,
      item.username,
      item.cash.toFixed(2),
      item.portfolioValue.toFixed(2),
      item.netWorth.toFixed(2),
      item.profitLoss.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `market_mayhem_final_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset the competition and return to pre-game lobby?')) return;
    try {
      await axios.post(`${API_URL}/admin/reset`);
      await refreshMarketData();
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  const getPodiumBox = (item: any, place: number) => {
    if (!item) return null;
    const isMe = item.userId === user?.id;

    let borderClass = 'border-slate-800';
    let glowClass = '';
    let badgeBg = 'bg-slate-800 text-slate-300';
    let Icon = Trophy;
    let placeTitle = '3rd Place Bronze';

    if (place === 1) {
      borderClass = 'border-amber-400 shadow-[0_0_50px_rgba(251,191,36,0.3)]';
      glowClass = 'bg-gradient-to-b from-amber-500/30 via-slate-900/95 to-slate-950 scale-105 z-20';
      badgeBg = 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-lg shadow-amber-400/30';
      Icon = Crown;
      placeTitle = '🏆 Grand Champion (1st Place)';
    } else if (place === 2) {
      borderClass = 'border-slate-300 shadow-[0_0_30px_rgba(203,213,225,0.2)]';
      glowClass = 'bg-gradient-to-b from-slate-300/20 via-slate-900/95 to-slate-950 z-10';
      badgeBg = 'bg-slate-300 text-slate-950 font-black';
      Icon = Medal;
      placeTitle = '🥈 Runner Up (2nd Place)';
    } else if (place === 3) {
      borderClass = 'border-amber-700 shadow-[0_0_30px_rgba(180,83,9,0.2)]';
      glowClass = 'bg-gradient-to-b from-amber-700/20 via-slate-900/95 to-slate-950 z-10';
      badgeBg = 'bg-amber-700 text-white font-black';
      Icon = Trophy;
    }

    return (
      <div
        key={item.userId}
        className={`glass-card p-6 sm:p-8 rounded-3xl border-2 ${borderClass} ${glowClass} relative overflow-hidden flex flex-col justify-between transition-all`}
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-950/80 border border-slate-700 flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <Icon className={`w-9 h-9 ${place === 1 ? 'text-amber-400 animate-bounce' : place === 2 ? 'text-slate-300' : 'text-amber-600'}`} />
          </div>
          <span className={`inline-block px-4 py-1.5 rounded-full text-xs uppercase tracking-wider mb-3 ${badgeBg}`}>
            {placeTitle}
          </span>
          <h3 className="text-3xl font-black text-white font-['Outfit'] tracking-tight flex items-center justify-center gap-2">
            <span>{item.teamName}</span>
            {isMe && <span className="px-2 py-0.5 rounded bg-emerald-400/20 text-emerald-300 text-xs uppercase font-extrabold">You</span>}
          </h3>
          <span className="text-xs text-slate-400 font-mono mt-1 block">@{item.username}</span>
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-800/80 font-mono text-sm bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs font-sans">Final Net Worth:</span>
            <span className="font-black text-2xl text-white">₹{item.netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/60 font-sans">
            <span className="text-slate-400">Total Profit / Loss:</span>
            <span className={`font-mono font-extrabold ${item.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {item.profitLoss >= 0 ? '+' : ''}₹{item.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 backdrop-blur-xl p-4 sm:p-8 flex flex-col items-center justify-center min-h-screen animate-in fade-in duration-500">
      {/* Background Glowing Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl w-full mx-auto text-center space-y-12 relative z-10 my-auto py-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-amber-500/10">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Market Mayhem Competition Officially Concluded</span>
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white font-['Outfit'] tracking-tight">
            Final Podium & Champions
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
            All trading is now locked and valuations are finalized. Congratulations to our top performing investment teams!
          </p>
        </div>

        {/* Podium Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto pt-6">
          {getPodiumBox(topThree[1], 2)} {/* Silver */}
          {getPodiumBox(topThree[0], 1)} {/* Gold */}
          {getPodiumBox(topThree[2], 3)} {/* Bronze */}
        </div>

        {/* Footer Actions */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4 max-w-2xl mx-auto">
          <button
            onClick={exportToCSV}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 transition transform hover:scale-105 flex items-center gap-2.5"
          >
            <Download className="w-5 h-5" />
            <span>Export Final Results Report (CSV)</span>
          </button>

          {user?.role === 'ADMIN' && (
            <button
              onClick={handleReset}
              className="px-6 py-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-extrabold text-sm uppercase tracking-wider border border-rose-500/40 shadow-lg transition flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Reset & Start New Competition</span>
            </button>
          )}
        </div>

        <span className="block text-xs text-slate-500 font-mono">
          Eunoia Competition Systems • Built for High-Frequency College Competitions
        </span>
      </div>
    </div>
  );
};
