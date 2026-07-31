import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Briefcase, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface Holding {
  id: string;
  companyId: string;
  symbol: string;
  name: string;
  sector: string;
  shares: number;
  averagePrice: number;
  currentPrice: number;
  currentValue: number;
  investedValue: number;
  unrealizedPL: number;
  plPercentage: number;
}

export const Portfolio: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { companies, gameState } = useSocket();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [summary, setSummary] = useState({
    cash: 0,
    portfolioValue: 0,
    netWorth: 0,
    totalInvested: 0,
    totalUnrealizedPL: 0,
  });
  const [loading, setLoading] = useState(true);
  const [liquidateMsg, setLiquidateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPortfolio = async () => {
    try {
      const res = await axios.get(`${API_URL}/game/portfolio`);
      if (res.data) {
        setHoldings(res.data.holdings || []);
        if (res.data.summary) setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, [user, companies]); // Re-compute valuations whenever live market ticks arrive!

  const handleLiquidate = async (holding: Holding) => {
    if (gameState.status !== 'ACTIVE') {
      setLiquidateMsg({ type: 'error', text: 'Trading is locked! Wait for Round to be Active.' });
      return;
    }

    try {
      await axios.post(`${API_URL}/trade/execute`, {
        companyId: holding.companyId,
        type: 'SELL',
        shares: holding.shares,
      });

      setLiquidateMsg({ type: 'success', text: `Liquidated all ${holding.shares} shares of ${holding.symbol} successfully!` });
      await refreshUser();
      await fetchPortfolio();
    } catch (err: any) {
      console.error('Liquidation failed:', err);
      setLiquidateMsg({ type: 'error', text: err.response?.data?.error || 'Failed to liquidate holding.' });
    }
  };

  const isPositiveTotalPL = summary.totalUnrealizedPL >= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800/80">
        <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
          Team Portfolio & Asset Allocation
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Monitor your stock positions, cost basis, and unrealized profit/loss in real time
        </p>
      </div>

      {liquidateMsg && (
        <div className={`p-4 rounded-2xl text-xs flex items-center justify-between border ${
          liquidateMsg.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {liquidateMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            <span>{liquidateMsg.text}</span>
          </div>
          <button onClick={() => setLiquidateMsg(null)} className="text-xs font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Valuation Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Net Worth</span>
          <span className="text-3xl font-extrabold text-white font-['Outfit'] block font-mono">
            ₹{summary.netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex justify-between text-xs text-slate-400">
            <span>Cash: <strong className="text-emerald-400">₹{summary.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
            <span>Stock Val: <strong className="text-teal-400">₹{summary.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></span>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Invested Cost</span>
          <span className="text-3xl font-extrabold text-slate-200 font-['Outfit'] block font-mono">
            ₹{summary.totalInvested.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400 mt-3 block">Total purchase price of active share holdings</span>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-800/80">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Net Unrealized P/L</span>
          <span className={`text-3xl font-extrabold font-['Outfit'] block font-mono flex items-center gap-1 ${
            isPositiveTotalPL ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isPositiveTotalPL ? '+' : ''}₹{summary.totalUnrealizedPL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-xs font-bold mt-3 block ${isPositiveTotalPL ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.totalInvested > 0 ? `${isPositiveTotalPL ? '+' : ''}${((summary.totalUnrealizedPL / summary.totalInvested) * 100).toFixed(2)}% total return` : 'No active investments'}
          </span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="p-6 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-extrabold text-white font-['Outfit']">Active Share Holdings ({holdings.length})</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time valuation sync enabled</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading portfolio holdings...</div>
        ) : holdings.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <h4 className="text-base font-bold text-slate-300 mb-1">No Active Share Holdings</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              You currently hold 100% of your assets in cash. Enter the stock exchange to begin investing!
            </p>
            <a
              href="/market"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
            >
              <span>Explore Stock Market</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                  <th className="py-4 px-6">Stock Symbol & Name</th>
                  <th className="py-4 px-6 text-right">Shares Owned</th>
                  <th className="py-4 px-6 text-right">Avg Purchase Price</th>
                  <th className="py-4 px-6 text-right">Current Price</th>
                  <th className="py-4 px-6 text-right">Current Valuation</th>
                  <th className="py-4 px-6 text-right">Unrealized P/L</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {holdings.map((h) => {
                  const isPositive = h.unrealizedPL >= 0;
                  return (
                    <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center font-extrabold text-white font-['Outfit']">
                            {h.symbol}
                          </div>
                          <div>
                            <span className="font-extrabold text-white block">{h.symbol}</span>
                            <span className="text-xs text-slate-400 block">{h.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-white">
                        {h.shares.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-300">
                        ₹{h.averagePrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-bold text-white">
                        ₹{h.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-extrabold text-teal-300">
                        ₹{h.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-right font-mono">
                        <div className={`font-extrabold flex items-center justify-end gap-1 ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          <span>{isPositive ? '+' : ''}₹{h.unrealizedPL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <span className={`text-[11px] font-bold block ${isPositive ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                          ({isPositive ? '+' : ''}{h.plPercentage.toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleLiquidate(h)}
                          disabled={gameState.status !== 'ACTIVE'}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                            gameState.status !== 'ACTIVE'
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 shadow-sm'
                          }`}
                        >
                          Liquidate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
