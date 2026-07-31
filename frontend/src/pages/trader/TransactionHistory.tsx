import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { Activity, ArrowUpRight, ArrowDownRight, Clock, FileText } from 'lucide-react';

interface Tx {
  id: string;
  companyId: string;
  symbol: string;
  companyName: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  totalAmount: number;
  timestamp: number;
}

export const TransactionHistory: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTxs = async () => {
      try {
        const res = await axios.get(`${API_URL}/game/transactions/me`);
        setTransactions(res.data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchTxs();
  }, [user]);

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-800/80">
        <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight flex items-center gap-2.5">
          <Activity className="w-8 h-8 text-emerald-400" />
          <span>Team Transaction Audit History</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete chronological record of all executed Buy and Sell orders for {user?.teamName}
        </p>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="p-6 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-extrabold text-white font-['Outfit']">Executed Trade Records ({transactions.length})</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Verified Immutable Ledger</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading transaction history...</div>
        ) : transactions.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <h4 className="text-base font-bold text-slate-300 mb-1">No Transactions Executed</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your team has not placed any Buy or Sell orders yet. Enter the stock market to make your first trade!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80">
                  <th className="py-4 px-6">Timestamp & ID</th>
                  <th className="py-4 px-6">Order Type</th>
                  <th className="py-4 px-6">Stock Symbol & Name</th>
                  <th className="py-4 px-6 text-right">Shares Executed</th>
                  <th className="py-4 px-6 text-right">Execution Price</th>
                  <th className="py-4 px-6 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {transactions.map((tx) => {
                  const isBuy = tx.type === 'BUY';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors font-mono">
                      <td className="py-4 px-6">
                        <span className="text-slate-300 font-medium block text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formatTime(tx.timestamp)}
                        </span>
                        <span className="text-[10px] text-slate-500">{tx.id}</span>
                      </td>
                      <td className="py-4 px-6 font-sans">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wider ${
                          isBuy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-sans">
                        <span className="font-extrabold text-white block">{tx.symbol}</span>
                        <span className="text-xs text-slate-400">{tx.companyName}</span>
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-white">
                        {tx.shares.toLocaleString('en-IN')}
                      </td>
                      <td className="py-4 px-6 text-right text-slate-300">
                        ₹{tx.price.toFixed(2)}
                      </td>
                      <td className={`py-4 px-6 text-right font-black ${
                        isBuy ? 'text-teal-300' : 'text-emerald-400'
                      }`}>
                        ₹{tx.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
