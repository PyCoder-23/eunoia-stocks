import React from 'react';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Newspaper, X, TrendingUp, TrendingDown } from 'lucide-react';

export const BreakingNewsModal: React.FC = () => {
  const { latestNewsAlert, latestChaosAlert, clearNewsAlert, clearChaosAlert } = useSocket();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 rounded-md bg-rose-500/30 text-rose-300 border border-rose-500/50 font-bold text-xs uppercase tracking-wider animate-pulse">Critical Impact</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold text-xs uppercase tracking-wider">High Alert</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-xs uppercase tracking-wider">Medium Impact</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold text-xs uppercase tracking-wider">Market Notice</span>;
    }
  };

  return (
    <AnimatePresence>
      {/* Chaos Alert Modal */}
      {latestChaosAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.7, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-full max-w-lg p-6 rounded-2xl bg-gradient-to-b from-rose-950/90 via-slate-900/95 to-slate-950 border-2 border-rose-500/60 shadow-[0_0_50px_rgba(244,63,94,0.3)] text-center relative overflow-hidden"
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl"></div>
            
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto mb-4 text-rose-400 animate-bounce">
              <Zap className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-white uppercase tracking-wide font-['Outfit'] mb-2">
              {latestChaosAlert.title}
            </h3>

            <p className="text-slate-200 text-base leading-relaxed mb-6 bg-slate-900/60 p-4 rounded-xl border border-rose-500/20">
              {latestChaosAlert.message}
            </p>

            <button
              onClick={clearChaosAlert}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold text-sm tracking-wider uppercase shadow-lg shadow-rose-500/30 transition-all transform hover:scale-[1.02]"
            >
              Acknowledge & Adjust Strategy
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Breaking News Alert Modal */}
      {!latestChaosAlert && latestNewsAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed bottom-6 right-6 z-50 w-full max-w-md"
        >
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="p-5 rounded-2xl glass-card border-l-4 border-l-emerald-400 border border-slate-800/80 shadow-2xl relative overflow-hidden"
          >
            <button
              onClick={clearNewsAlert}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Newspaper className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{latestNewsAlert.category}</span>
                  {getSeverityBadge(latestNewsAlert.severity)}
                </div>
                <span className="text-[11px] text-slate-400">Just Released • Breaking Alert</span>
              </div>
            </div>

            <h4 className="text-base font-extrabold text-white font-['Outfit'] mb-2 leading-snug">
              {latestNewsAlert.headline}
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {latestNewsAlert.description}
            </p>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">Target Impact:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                  latestNewsAlert.expectedImpact >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {latestNewsAlert.expectedImpact >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                {latestNewsAlert.expectedImpact >= 0 ? '+' : ''}{latestNewsAlert.expectedImpact.toFixed(1)}% on {latestNewsAlert.affectedSector || 'Global Market'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
