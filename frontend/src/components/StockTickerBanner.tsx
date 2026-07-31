import React from 'react';
import { useSocket } from '../context/SocketContext';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

export const StockTickerBanner: React.FC = () => {
  const { companies } = useSocket();

  if (companies.length === 0) return null;

  // Double the array to make the continuous ticker animation seamless
  const tickerItems = [...companies, ...companies];

  return (
    <div className="w-full bg-slate-950/90 border-b border-slate-800/80 overflow-hidden py-2.5 shadow-inner relative z-30">
      <div className="flex items-center">
        <div className="flex items-center gap-2 px-4 bg-emerald-500/10 border-r border-slate-800 text-emerald-400 font-bold text-xs uppercase tracking-wider shrink-0 z-10">
          <TrendingUp className="w-4 h-4 animate-bounce" />
          <span>Live Market Ticker</span>
        </div>

        <div className="overflow-hidden whitespace-nowrap flex-1">
          <div className="animate-ticker inline-flex items-center gap-8 px-4">
            {tickerItems.map((comp, idx) => {
              const change = comp.currentPrice - comp.initialPrice;
              const pctChange = ((change / comp.initialPrice) * 100);
              const isPositive = pctChange >= 0;

              return (
                <div key={`${comp.id}-${idx}`} className="inline-flex items-center gap-2.5 px-3 py-1 rounded-lg bg-slate-900/60 border border-slate-800/60 shadow-sm">
                  <span className="font-extrabold text-white tracking-wide font-['Outfit']">{comp.symbol}</span>
                  <span className="text-slate-300 font-mono font-medium">₹{comp.currentPrice.toFixed(2)}</span>
                  <span
                    className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                      isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {isPositive ? '+' : ''}{pctChange.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
