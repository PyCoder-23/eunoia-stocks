import { API_URL } from '../../config';
import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket, type Company } from '../../context/SocketContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Search, ArrowUpRight, ArrowDownRight, TrendingUp, CheckCircle2, AlertCircle, X } from 'lucide-react';

export const StockMarket: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { companies, gameState } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [priceHistory, setPriceHistory] = useState<Array<{ time: string; price: number }>>([]);
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL' | 'SHORT_SELL' | 'COVER_SHORT' | 'LIMIT_BUY' | 'LIMIT_SELL' | 'STOP_LOSS'>('BUY');
  const [shareQuantity, setShareQuantity] = useState<string>('10');
  const [targetPrice, setTargetPrice] = useState<string>('');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const sectors = [
    'ALL',
    'Banking and Finance',
    'FMCG',
    'Automobile',
    'Information Technology',
    'Defence',
    'Oil and Gas',
    'Healthcare',
    'Metals and Mining',
    'Telecommunications',
  ];

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = selectedSector === 'ALL' || c.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const handleOpenModal = async (comp: Company) => {
    setSelectedCompany(comp);
    setTradeMessage(null);
    setShareQuantity('10');
    setTargetPrice(comp.currentPrice.toFixed(2));
    try {
      const res = await axios.get(`${API_URL}/game/companies/${comp.id}`);
      if (res.data && res.data.priceHistory) {
        setPriceHistory(res.data.priceHistory);
      }
    } catch (err) {
      console.error('Error fetching price chart:', err);
    }
  };

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany || !user) return;
    setTradeLoading(true);
    setTradeMessage(null);

    try {
      const isMarket = ['BUY', 'SELL', 'SHORT_SELL', 'COVER_SHORT'].includes(tradeType);
      const url = isMarket ? `${API_URL}/trade/execute` : `${API_URL}/trade/orders`;

      const payload: any = {
        companyId: selectedCompany.id,
        type: tradeType,
        shares: parseInt(shareQuantity, 10),
      };

      if (!isMarket) {
        payload.targetPrice = parseFloat(targetPrice);
      }

      const res = await axios.post(url, payload);

      setTradeMessage({ type: 'success', text: res.data.message });
      if (isMarket) await refreshUser(); // Update cash balance immediately
    } catch (err: any) {
      console.error('Trade execution failed:', err);
      setTradeMessage({ type: 'error', text: err.response?.data?.error || 'Trade failed to execute.' });
    } finally {
      setTradeLoading(false);
    }
  };

  const calculateMaxShares = () => {
    if (!selectedCompany || !user) return 0;
    if (tradeType === 'BUY') {
      const maxByCash = Math.floor(user.cash / selectedCompany.currentPrice);
      return Math.min(maxByCash, selectedCompany.availableShares);
    } else {
      return 1000; // Will be validated by server against owned shares
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-extrabold text-white font-['Outfit'] tracking-tight">
            Live Stock Exchange
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Analyse real-time market fluctuations and execute instant Buy & Sell orders
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symbol or name..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs text-white placeholder-slate-500 font-medium"
            />
          </div>

          {/* Sector Filters Dropdown */}
          <div className="relative w-full sm:w-48">
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full appearance-none px-4 py-2.5 rounded-xl glass-input text-xs text-white bg-slate-900/80 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium cursor-pointer"
            >
              {sectors.map(sec => (
                <option key={sec} value={sec} className="bg-slate-900 text-white">
                  {sec}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map(comp => {
          const change = comp.currentPrice - comp.initialPrice;
          const pctChange = (change / comp.initialPrice) * 100;
          const isPositive = pctChange >= 0;

          return (
            <div
              key={comp.id}
              className="glass-card p-6 rounded-3xl border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-2xl font-black text-white font-['Outfit'] tracking-wide group-hover:text-emerald-400 transition-colors truncate">
                        {comp.symbol}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-800/80 text-slate-300 border border-slate-700/80 shrink-0">
                        {comp.sector}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-300 block truncate">{comp.name}</span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="block text-2xl font-black font-mono text-white tracking-tight">
                      ₹{comp.currentPrice.toFixed(2)}
                    </span>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-extrabold px-2 py-0.5 rounded-md mt-1 ${
                      isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {isPositive ? '+' : ''}{pctChange.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-6 bg-slate-950/40 p-3 rounded-xl border border-slate-800/40">
                  {comp.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-slate-500 block">Market Float</span>
                  <span className="font-mono font-bold text-slate-300">{comp.availableShares.toLocaleString('en-IN')} / {comp.totalShares.toLocaleString('en-IN')}</span>
                </div>

                <button
                  onClick={() => handleOpenModal(comp)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 transition transform hover:scale-105 flex items-center gap-1.5"
                >
                  <span>Trade Order</span>
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trade & Chart Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-2xl glass-card rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black text-xl font-['Outfit']">
                  {selectedCompany.symbol}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-white font-['Outfit']">{selectedCompany.name}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400 font-bold">{selectedCompany.sector}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-mono">Float: {selectedCompany.availableShares.toLocaleString('en-IN')} shares</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-2xl font-black text-white font-mono block">₹{selectedCompany.currentPrice.toFixed(2)}</span>
                  <span className="text-[11px] text-slate-400">Live Execution Price</span>
                </div>
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Recharts Price Chart */}
            <div className="p-6 bg-slate-950/60 border-b border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Simulation Chart (Last 60 Ticks)</span>
                <span className="text-xs text-emerald-400 font-mono">Real-time WebSocket Sync</span>
              </div>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceHistory.length > 0 ? priceHistory : [{ time: 'Start', price: selectedCompany.initialPrice }, { time: 'Now', price: selectedCompany.currentPrice }]}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                    <YAxis stroke="#475569" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                      formatter={(val: any) => [`₹${Number(val || 0).toFixed(2)}`, 'Price']}
                    />
                    <Area type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trade Order Form */}
            <form onSubmit={handleExecuteTrade} className="p-6 space-y-5">
              {tradeMessage && (
                <div className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
                  tradeMessage.type === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}>
                  {tradeMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                  <span>{tradeMessage.text}</span>
                </div>
              )}

              {/* Order Type Tabs */}
              <div className="space-y-3">
                <label className="font-bold text-slate-300 uppercase tracking-wider text-xs">Order Type</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800">
                  <button type="button" onClick={() => { setTradeType('BUY'); setTradeMessage(null); }} className={`py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${tradeType === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}>Buy</button>
                  <button type="button" onClick={() => { setTradeType('SELL'); setTradeMessage(null); }} className={`py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${tradeType === 'SELL' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Sell</button>
                  <button type="button" onClick={() => { setTradeType('SHORT_SELL'); setTradeMessage(null); }} className={`py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${tradeType === 'SHORT_SELL' ? 'bg-purple-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Short Sell</button>
                  <button type="button" onClick={() => { setTradeType('COVER_SHORT'); setTradeMessage(null); }} className={`py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${tradeType === 'COVER_SHORT' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Cover Short</button>
                  <button type="button" onClick={() => { setTradeType('LIMIT_BUY'); setTradeMessage(null); }} className={`py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${tradeType === 'LIMIT_BUY' ? 'bg-teal-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Limit Buy</button>
                  <button type="button" onClick={() => { setTradeType('LIMIT_SELL'); setTradeMessage(null); }} className={`py-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${tradeType === 'LIMIT_SELL' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Limit Sell</button>
                  <button type="button" onClick={() => { setTradeType('STOP_LOSS'); setTradeMessage(null); }} className={`py-2 col-span-2 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition ${tradeType === 'STOP_LOSS' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Stop Loss (Sell)</button>
                </div>
              </div>

              {['LIMIT_BUY', 'LIMIT_SELL', 'STOP_LOSS'].includes(tradeType) && (
                <div>
                  <label className="font-bold text-slate-300 uppercase tracking-wider text-xs mb-2 block">Target Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-lg font-mono font-bold text-white"
                  />
                </div>
              )}

              {/* Quantity Input */}
              <div>
                <div className="flex items-center justify-between mb-2 text-xs">
                  <label className="font-bold text-slate-300 uppercase tracking-wider">Number of Shares</label>
                  <span className="text-slate-400 font-mono">
                    Max possible {tradeType.includes('BUY') ? `with cash: ${calculateMaxShares()} shares` : 'sellable'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={shareQuantity}
                    onChange={(e) => setShareQuantity(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl glass-input text-lg font-mono font-bold text-white"
                  />
                  {[10, 50, 100].map(qty => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setShareQuantity(qty.toString())}
                      className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold font-mono text-xs border border-slate-700 transition"
                    >
                      +{qty}
                    </button>
                  ))}
                  {tradeType.includes('BUY') && (
                    <button
                      type="button"
                      onClick={() => setShareQuantity(calculateMaxShares().toString())}
                      className="px-3.5 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-extrabold text-xs border border-emerald-500/40 transition"
                    >
                      MAX
                    </button>
                  )}
                </div>
              </div>

              {/* Order Total Summary */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Estimated Total Order Value</span>
                  <span className="text-2xl font-black font-mono text-white">
                    ₹{((parseInt(shareQuantity || '0', 10)) * selectedCompany.currentPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400 block">Your Cash Balance:</span>
                  <span className="font-mono font-bold text-emerald-400">₹{(user?.cash || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={tradeLoading || gameState.status !== 'ACTIVE'}
                className={`w-full py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider shadow-xl transition-all transform hover:scale-[1.01] ${
                  gameState.status !== 'ACTIVE'
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : tradeType === 'BUY'
                    ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-rose-500 via-red-500 to-pink-500 text-white shadow-rose-500/25'
                }`}
              >
                {tradeLoading ? (
                  <span className="inline-block animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                ) : gameState.status !== 'ACTIVE' ? (
                  'Trading Locked (Wait for Admin to Start Round)'
                ) : (
                  `Confirm ${tradeType} Order Now`
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
