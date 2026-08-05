import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../../context/SocketContext';
import { 
  ShieldAlert, Play, Square, Pause, RotateCcw, Zap, 
  Building2, Users, Plus, Trash2, CheckCircle2, AlertCircle, 
  TrendingUp, TrendingDown, Flame, IndianRupee, Activity, Sparkles 
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { gameState, companies, leaderboard, refreshMarketData } = useSocket();
  const [activeTab, setActiveTab] = useState<'ROUNDS' | 'NEWS_CHAOS' | 'COMPANIES' | 'TRADERS'>('ROUNDS');
  
  // State for messages & loading
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // State for analytics & users
  const [analytics, setAnalytics] = useState<any>({ totalUsers: 0, totalCompanies: 0, totalTransactions: 0, totalVolume: 0 });
  const [traderUsers, setTraderUsers] = useState<any[]>([]);

  // State for New Company Form
  const [newComp, setNewComp] = useState({ name: '', symbol: '', sector: 'Information Technology', description: '', initialPrice: '100.00', totalShares: '1000000', volatility: '1.0' });

  // State for New Trader Form
  const [newTrader, setNewTrader] = useState({ username: '', teamName: '', password: '', cash: '1000000' });

  // State for Manual News Dispatch
  const [manualNews, setManualNews] = useState({ headline: '', description: '', category: 'Company News', severity: 'HIGH', affectedSector: 'Technology', expectedImpact: '10.0' });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [analyticsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/admin/analytics`),
        axios.get(`${API_URL}/admin/users`),
      ]);
      setAnalytics(analyticsRes.data);
      setTraderUsers(usersRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 6000);
  };

  // Round Control Actions (Manual per IMP NOTE)
  const handleUpdateGameState = async (status: string, round: number, roundName: string) => {
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_URL}/admin/game-state`, { status, round, roundName });
      showMessage('success', res.data.message);
      await refreshMarketData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to update round state.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetCompetition = async () => {
    if (!window.confirm('⚠️ WARNING: Are you sure you want to completely RESET the competition? All team portfolios, trade history, and news events will be erased!')) return;
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_URL}/admin/reset`);
      showMessage('success', res.data.message);
      await refreshMarketData();
      await fetchAdminData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to reset competition.');
    } finally {
      setLoadingAction(false);
    }
  };

  // Company CRUD
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_URL}/admin/companies`, {
        name: newComp.name,
        symbol: newComp.symbol.toUpperCase(),
        sector: newComp.sector,
        description: newComp.description,
        initialPrice: parseFloat(newComp.initialPrice),
        totalShares: parseInt(newComp.totalShares, 10),
        volatility: parseFloat(newComp.volatility),
      });
      showMessage('success', res.data.message);
      setNewComp({ name: '', symbol: '', sector: 'Information Technology', description: '', initialPrice: '100.00', totalShares: '1000000', volatility: '1.0' });
      await refreshMarketData();
      await fetchAdminData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to create company.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteCompany = async (id: string, symbol: string) => {
    if (!window.confirm(`Are you sure you want to delete ${symbol}?`)) return;
    try {
      const res = await axios.delete(`${API_URL}/admin/companies/${id}`);
      showMessage('success', res.data.message);
      await refreshMarketData();
      await fetchAdminData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to delete company.');
    }
  };

  const handleAdjustCash = async (id: string, teamName: string) => {
    const amountStr = window.prompt(`Enter amount to add/subtract for ${teamName} (e.g., 50000 or -20000):`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      showMessage('error', 'Invalid amount entered.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to ${amount >= 0 ? 'add' : 'subtract'} ₹${Math.abs(amount).toLocaleString('en-IN')} ${amount >= 0 ? 'to' : 'from'} ${teamName}'s account?`)) return;

    try {
      const res = await axios.post(`${API_URL}/admin/users/${id}/cash`, { amount });
      showMessage('success', res.data.message);
      await fetchAdminData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to adjust cash.');
    }
  };

  // Trader Account Creation
  const handleCreateTrader = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_URL}/admin/users`, {
        username: newTrader.username,
        teamName: newTrader.teamName,
        password: newTrader.password,
        cash: parseFloat(newTrader.cash),
      });
      showMessage('success', res.data.message);
      setNewTrader({ username: '', teamName: '', password: '', cash: '1000000' });
      await fetchAdminData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to create trader account.');
    } finally {
      setLoadingAction(false);
    }
  };

  // News & Chaos Triggers
  const handleDispatchAINews = async (category: string, severity: string) => {
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_URL}/admin/news/ai`, { category, severity });
      showMessage('success', `AI News Dispatched: "${res.data.event.headline}"`);
      await refreshMarketData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to dispatch AI news.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDispatchManualNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_URL}/admin/news/manual`, {
        headline: manualNews.headline,
        description: manualNews.description,
        category: manualNews.category,
        severity: manualNews.severity,
        affectedSector: manualNews.affectedSector === 'ALL' ? null : manualNews.affectedSector,
        expectedImpact: parseFloat(manualNews.expectedImpact),
      });
      showMessage('success', res.data.message);
      setManualNews({ headline: '', description: '', category: 'Company News', severity: 'HIGH', affectedSector: 'Information Technology', expectedImpact: '10.0' });
      await refreshMarketData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to dispatch news.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleTriggerChaos = async (title: string, message: string, type: string, sector: string | null, impact: number) => {
    if (!window.confirm(`🔥 TRIGGER CHAOS EVENT: "${title}"?\nThis will immediately shift market prices by ${impact}%!`)) return;
    setLoadingAction(true);
    try {
      const res = await axios.post(`${API_URL}/admin/chaos`, { title, message, type, sector, impact });
      showMessage('success', res.data.message);
      await refreshMarketData();
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || 'Failed to trigger chaos event.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-purple-500/40 shadow-[0_0_40px_rgba(168,85,247,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-bl from-purple-500/20 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px] font-black uppercase tracking-wider">
                System Master Control
              </span>
              <span className="text-xs text-slate-400 font-mono">Port 5001 Live</span>
            </div>
            <h1 className="text-3xl font-black text-white font-['Outfit'] tracking-tight">
              Competition Admin Command Center
            </h1>
          </div>
        </div>

        {/* Current Round Badge & Emergency Reset */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-700/80 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Active Stage</span>
            <span className="text-sm font-extrabold text-emerald-400 block">{gameState.roundName}</span>
          </div>

          <button
            onClick={handleResetCompetition}
            disabled={loadingAction}
            className="px-4 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-extrabold text-xs uppercase tracking-wider border border-rose-500/40 shadow-lg transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Game</span>
          </button>
        </div>
      </div>

      {/* Global Toast Notification */}
      {actionMsg && (
        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center justify-between border shadow-xl animate-in fade-in slide-in-from-top-2 ${
          actionMsg.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-rose-500/20 border-rose-500/50 text-rose-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {actionMsg.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-xs font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Analytics Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 font-sans">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-white block">{analytics.totalUsers || traderUsers.length}</span>
            <span className="text-[11px] text-slate-400 font-sans uppercase">Registered Teams</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 font-sans">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-white block">{analytics.totalCompanies || companies.length}</span>
            <span className="text-[11px] text-slate-400 font-sans uppercase">Listed Companies</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 font-sans">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-white block">{analytics.totalTransactions || 0}</span>
            <span className="text-[11px] text-slate-400 font-sans uppercase">Total Trades Executed</span>
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-sans">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div className="bg-slate-900/40 border-slate-800/60 p-5 rounded-2xl border flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Total Traded Vol</span>
              <span className="text-xl font-black text-white block">₹{(analytics.totalVolume || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800/80">
        {[
          { id: 'ROUNDS', label: '🎮 Manual Round Controls & Leaderboard', icon: Play },
          { id: 'NEWS_CHAOS', label: '⚡ News & Chaos Event Trigger', icon: Zap },
          { id: 'COMPANIES', label: '🏢 Stock Exchange Management', icon: Building2 },
          { id: 'TRADERS', label: '👥 Team Account Management', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: ROUND CONTROLS & LEADERBOARD */}
      {activeTab === 'ROUNDS' && (
        <div className="space-y-8">
          {/* Manual Round Control Box (IMP NOTE) */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div>
              <h3 className="text-xl font-extrabold text-white font-['Outfit'] flex items-center gap-2">
                <Play className="w-5 h-5 text-emerald-400" />
                <span>Competition Stage Control (Manual Control per IMP NOTE)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                You have manual control over when to start, pause, or end each competition stage. No automatic timers will advance rounds without your command.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Round 1 */}
              <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                gameState.round === 1 && gameState.status === 'ACTIVE'
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Stage 1
                    </span>
                    {gameState.round === 1 && <span className="text-xs font-bold text-emerald-400 animate-pulse">● Active Now</span>}
                  </div>
                  <h4 className="text-lg font-black text-white font-['Outfit'] mb-1">Round 1: Market Fundamentals</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Stable baseline market trading. Prices drift naturally based on trader buy and sell supply/demand order flow.
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-800/80 flex gap-2">
                  <button
                    onClick={() => handleUpdateGameState('ACTIVE', 1, 'Round 1: Market Fundamentals')}
                    disabled={loadingAction}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition shadow-md"
                  >
                    Start / Resume
                  </button>
                  <button
                    onClick={() => handleUpdateGameState('STOPPED', 1, 'Round 1 (Stopped)')}
                    disabled={loadingAction}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition"
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* Round 2 */}
              <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                gameState.round === 2 && gameState.status === 'ACTIVE'
                  ? 'bg-teal-500/15 border-teal-500/50 shadow-xl shadow-teal-500/10'
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Stage 2
                    </span>
                    {gameState.round === 2 && <span className="text-xs font-bold text-teal-300 animate-pulse">● Active Now</span>}
                  </div>
                  <h4 className="text-lg font-black text-white font-['Outfit'] mb-1">Round 2: News & Momentum</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Intelligence headlines begin dropping! Stocks drift toward expected news impact targets while traders scramble to adjust portfolios.
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-800/80 flex gap-2">
                  <button
                    onClick={() => handleUpdateGameState('ACTIVE', 2, 'Round 2: News & Market Reaction')}
                    disabled={loadingAction}
                    className="flex-1 py-2.5 rounded-xl bg-teal-400 hover:bg-teal-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider transition shadow-md"
                  >
                    Start / Resume
                  </button>
                  <button
                    onClick={() => handleUpdateGameState('STOPPED', 2, 'Round 2 (Stopped)')}
                    disabled={loadingAction}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition"
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* Round 3 */}
              <div className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                gameState.round === 3 && gameState.status === 'ACTIVE'
                  ? 'bg-purple-500/15 border-purple-500/50 shadow-xl shadow-purple-500/10'
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Stage 3
                    </span>
                    {gameState.round === 3 && <span className="text-xs font-bold text-purple-300 animate-pulse">● Active Now</span>}
                  </div>
                  <h4 className="text-lg font-black text-white font-['Outfit'] mb-1">Round 3: High-Volatility Chaos</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    High stakes! Market crashes, AI tech booms, and extreme volatility triggers test team risk management under severe pressure.
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-800/80 flex gap-2">
                  <button
                    onClick={() => handleUpdateGameState('ACTIVE', 3, 'Round 3: High-Volatility Chaos')}
                    disabled={loadingAction}
                    className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-md"
                  >
                    Start / Resume
                  </button>
                  <button
                    onClick={() => handleUpdateGameState('STOPPED', 3, 'Round 3 (Stopped)')}
                    disabled={loadingAction}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase transition"
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>

            {/* Global Pause and End Competition Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleUpdateGameState('PAUSED', gameState.round, `${gameState.roundName} (PAUSED)`)}
                  disabled={loadingAction || gameState.status === 'PAUSED'}
                  className="px-6 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-extrabold text-xs uppercase tracking-wider border border-amber-500/40 transition flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause Competition Trading</span>
                </button>
                <button
                  onClick={() => handleUpdateGameState('ACTIVE', gameState.round || 1, gameState.roundName.replace(' (PAUSED)', '').replace(' (Stopped)', ''))}
                  disabled={loadingAction || gameState.status === 'ACTIVE'}
                  className="px-6 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-extrabold text-xs uppercase tracking-wider border border-emerald-500/40 transition flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Resume Active Trading</span>
                </button>
              </div>

              <button
                onClick={() => handleUpdateGameState('ENDED', 0, 'Competition Ended - Leaderboard Finalized')}
                disabled={loadingAction || gameState.status === 'ENDED'}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/30 transition flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                <span>End Competition & Lock Leaderboard</span>
              </button>
            </div>
          </div>

          {/* Admin Live Leaderboard Overview */}
          <div className="glass-card rounded-3xl border border-slate-800/80 overflow-hidden">
            <div className="p-6 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-extrabold text-white font-['Outfit']">Live Team Standings (Admin Monitor)</h3>
              <span className="text-xs text-emerald-400 font-mono font-bold">Updated Live on Tick</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <th className="py-4 px-6">Rank</th>
                    <th className="py-4 px-6">Team Name</th>
                    <th className="py-4 px-6 text-right">Cash</th>
                    <th className="py-4 px-6 text-right">Portfolio Val</th>
                    <th className="py-4 px-6 text-right">Net Worth</th>
                    <th className="py-4 px-6 text-right">Total P/L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
                  {leaderboard.map((l) => (
                    <tr key={l.userId} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-6 font-bold text-white">#{l.rank}</td>
                      <td className="py-3.5 px-6 font-sans font-extrabold text-white">{l.teamName}</td>
                      <td className="py-3.5 px-6 text-right text-emerald-400">₹{l.cash.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="py-3.5 px-6 text-right text-teal-300">₹{l.portfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="py-3.5 px-6 text-right font-black text-white text-base">₹{l.netWorth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className={`py-3.5 px-6 text-right font-bold ${l.profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {l.profitLoss >= 0 ? '+' : ''}₹{l.profitLoss.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NEWS & CHAOS ENGINE */}
      {activeTab === 'NEWS_CHAOS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI & Preset News Generator */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4" />
                <span>Automated AI Intelligence</span>
              </div>
              <h3 className="text-xl font-extrabold text-white font-['Outfit']">AI News Broadcast Generator</h3>
              <p className="text-xs text-slate-400 mt-1">
                Instantly synthesize and broadcast a realistic financial news headline with targeted sector price drifting.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: '🏦 Banking & Finance Rate Cut', cat: 'Banking and Finance', sev: 'HIGH' },
                { label: '🛒 FMCG Rural Consumption Boom', cat: 'FMCG', sev: 'HIGH' },
                { label: '🚗 Automobile EV Subsidy Policy', cat: 'Automobile', sev: 'HIGH' },
                { label: '🤖 IT Enterprise AI Expansion', cat: 'Information Technology', sev: 'HIGH' },
                { label: '🛡️ Defence Export Allocation', cat: 'Defence', sev: 'CRITICAL' },
                { label: '🛢️ Oil & Gas Supply Shortage', cat: 'Oil and Gas', sev: 'HIGH' },
                { label: '💊 Healthcare Drug Approval', cat: 'Healthcare', sev: 'CRITICAL' },
                { label: '🏗️ Metals Megaproject Demand', cat: 'Metals and Mining', sev: 'HIGH' },
                { label: '📡 Telecom 5G Subscriber Surge', cat: 'Telecommunications', sev: 'HIGH' },
                { label: '🚀 Global Market Bull Rally', cat: 'Global Market', sev: 'HIGH' },
              ].map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDispatchAINews(btn.cat, btn.sev)}
                  disabled={loadingAction}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-emerald-500/15 border border-slate-800 hover:border-emerald-500/40 text-left font-bold text-xs text-slate-200 hover:text-emerald-300 transition shadow-sm flex flex-col justify-between h-20"
                >
                  <span className="block truncate">{btn.label}</span>
                  <span className="text-[10px] text-slate-400 uppercase truncate">{btn.cat} • {btn.sev}</span>
                </button>
              ))}
            </div>

            {/* Manual Custom News Form */}
            <form onSubmit={handleDispatchManualNews} className="pt-6 border-t border-slate-800 space-y-4">
              <h4 className="font-extrabold text-white text-sm">Dispatch Custom Manual Headline</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Headline Title</label>
                <input
                  type="text"
                  required
                  value={manualNews.headline}
                  onChange={e => setManualNews({...manualNews, headline: e.target.value})}
                  placeholder="e.g. Federal Reserve Announces Surprise Rate Freeze"
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Detailed Description / Rationale</label>
                <textarea
                  rows={2}
                  required
                  value={manualNews.description}
                  onChange={e => setManualNews({...manualNews, description: e.target.value})}
                  placeholder="Explain the background so teams can react..."
                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Affected Sector</label>
                  <select
                    value={manualNews.affectedSector}
                    onChange={e => setManualNews({...manualNews, affectedSector: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white bg-slate-900"
                  >
                    <option value="ALL">Entire Market (All Stocks)</option>
                    <option value="Banking and Finance">Banking and Finance</option>
                    <option value="FMCG">FMCG</option>
                    <option value="Automobile">Automobile</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Defence">Defence</option>
                    <option value="Oil and Gas">Oil and Gas</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Metals and Mining">Metals and Mining</option>
                    <option value="Telecommunications">Telecommunications</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Expected Impact (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={manualNews.expectedImpact}
                    onChange={e => setManualNews({...manualNews, expectedImpact: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingAction}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition"
              >
                Broadcast Manual News Event
              </button>
            </form>
          </div>

          {/* High-Volatility Stage 3 Chaos Engine */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)] space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1 animate-pulse">
                <Flame className="w-4 h-4" />
                <span>Stage 3 Extreme Volatility & News Engine</span>
              </div>
              <h3 className="text-2xl font-black text-white font-['Outfit']">Round 3 Chaos & Sector Shock Controls</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Trigger immediate, dramatic market valuations! Instantly shift prices across targeted sectors or globally, broadcasting full-screen red alerts on trader dashboards.
              </p>
            </div>

            {/* 1. Global Macro Shocks */}
            <div className="space-y-3">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider text-slate-400">1. Global Macro Market Events</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => handleTriggerChaos(
                    "GLOBAL MARKET BOOM (+30%)", 
                    "An unprecedented surge of institutional capital has entered the market! Equities soaring across all sectors!", 
                    "BOOM", null, 30
                  )}
                  disabled={loadingAction}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs text-left shadow-lg shadow-emerald-500/20 transition flex items-center justify-between"
                >
                  <div>
                    <span className="block font-['Outfit']">🚀 Global Market Boom</span>
                    <span className="text-[10px] text-emerald-100 font-normal">+30% All Stocks</span>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-200" />
                </button>

                <button
                  onClick={() => handleTriggerChaos(
                    "GLOBAL MARKET CRASH (-30%)", 
                    "Global financial panic! Liquidity crunch triggers massive sell-offs across all sectors. Stock valuations dropping rapidly!", 
                    "CRASH", null, -30
                  )}
                  disabled={loadingAction}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-extrabold text-xs text-left shadow-lg shadow-rose-500/20 transition flex items-center justify-between"
                >
                  <div>
                    <span className="block font-['Outfit']">💥 Global Market Crash</span>
                    <span className="text-[10px] text-rose-100 font-normal">-30% All Stocks</span>
                  </div>
                  <TrendingDown className="w-5 h-5 text-rose-200" />
                </button>

                <button
                  onClick={() => handleTriggerChaos(
                    "BLACK SWAN FRAUD SHOCK (-50%)", 
                    "Catastrophic accounting fraud uncovered! Regulators halt operations at target company!", 
                    "BLACK_SWAN", null, -50
                  )}
                  disabled={loadingAction}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-extrabold text-xs text-left shadow-lg shadow-purple-500/20 transition flex items-center justify-between"
                >
                  <div>
                    <span className="block font-['Outfit']">🦢 Black Swan Event</span>
                    <span className="text-[10px] text-purple-100 font-normal">-50% Random Stock</span>
                  </div>
                  <Flame className="w-5 h-5 text-purple-200" />
                </button>
              </div>
            </div>

            {/* 2. Sector Major Boom & Loss Matrix (All 9 Sectors) */}
            <div className="space-y-3 pt-2">
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider text-slate-400">2. Targeted Major Sector Booms & Losses (+35% / -35%)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-96 overflow-y-auto pr-1">
                {[
                  { sector: 'Banking and Finance', boomType: 'BANKING_BOOM', crashType: 'BANKING_CRISIS', icon: '🏦' },
                  { sector: 'FMCG', boomType: 'FMCG_BOOM', crashType: 'FMCG_CRASH', icon: '🛒' },
                  { sector: 'Automobile', boomType: 'AUTO_BOOM', crashType: 'AUTO_CRASH', icon: '🚗' },
                  { sector: 'Information Technology', boomType: 'BUBBLE_TECH', crashType: 'IT_CRASH', icon: '🤖' },
                  { sector: 'Defence', boomType: 'DEFENCE_BOOM', crashType: 'DEFENCE_CRASH', icon: '🛡️' },
                  { sector: 'Oil and Gas', boomType: 'OIL_BOOM', crashType: 'OIL_CRASH', icon: '🛢️' },
                  { sector: 'Healthcare', boomType: 'HEALTHCARE_BOOM', crashType: 'HEALTHCARE_CRASH', icon: '💊' },
                  { sector: 'Metals and Mining', boomType: 'METALS_BOOM', crashType: 'METALS_CRASH', icon: '🏗️' },
                  { sector: 'Telecommunications', boomType: 'TELECOM_BOOM', crashType: 'TELECOM_CRASH', icon: '📡' },
                ].map((item) => (
                  <div key={item.sector} className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-300 truncate flex items-center gap-1">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.sector}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleTriggerChaos(
                          `${item.sector.toUpperCase()} BOOM (+35%)`,
                          `Surging demand and favorable regulatory tailwinds send ${item.sector} valuations soaring!`,
                          item.boomType,
                          item.sector,
                          35
                        )}
                        disabled={loadingAction}
                        className="py-1.5 px-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px] text-center transition flex items-center justify-center gap-1"
                      >
                        <TrendingUp className="w-3 h-3" />
                        <span>Boom +35%</span>
                      </button>
                      <button
                        onClick={() => handleTriggerChaos(
                          `${item.sector.toUpperCase()} CRASH (-35%)`,
                          `Severe sector disruption and regulatory shocks cause heavy liquidation in ${item.sector}!`,
                          item.crashType,
                          item.sector,
                          -35
                        )}
                        disabled={loadingAction}
                        className="py-1.5 px-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-extrabold text-[10px] text-center transition flex items-center justify-center gap-1"
                      >
                        <TrendingDown className="w-3 h-3" />
                        <span>Loss -35%</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY STOCK MANAGEMENT */}
      {activeTab === 'COMPANIES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Stock Form */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              <span>List New IPO Company</span>
            </h3>
            <form onSubmit={handleCreateCompany} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newComp.name}
                  onChange={e => setNewComp({...newComp, name: e.target.value})}
                  placeholder="e.g. Apex Quantum Labs"
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Ticker Symbol</label>
                  <input
                    type="text"
                    required
                    value={newComp.symbol}
                    onChange={e => setNewComp({...newComp, symbol: e.target.value})}
                    placeholder="e.g. APEX"
                    className="w-full px-3 py-2 rounded-xl glass-input text-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Sector</label>
                  <select
                    value={newComp.sector}
                    onChange={e => setNewComp({...newComp, sector: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl glass-input text-white bg-slate-900"
                  >
                    <option value="Banking and Finance">Banking and Finance</option>
                    <option value="FMCG">FMCG</option>
                    <option value="Automobile">Automobile</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Defence">Defence</option>
                    <option value="Oil and Gas">Oil and Gas</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Metals and Mining">Metals and Mining</option>
                    <option value="Telecommunications">Telecommunications</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={newComp.description}
                  onChange={e => setNewComp({...newComp, description: e.target.value})}
                  placeholder="Company background..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono">
                <div>
                  <label className="block font-sans font-semibold text-slate-300 mb-1">IPO Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newComp.initialPrice}
                    onChange={e => setNewComp({...newComp, initialPrice: e.target.value})}
                    className="w-full px-2 py-2 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block font-sans font-semibold text-slate-300 mb-1">Total Shares</label>
                  <input
                    type="number"
                    required
                    value={newComp.totalShares}
                    onChange={e => setNewComp({...newComp, totalShares: e.target.value})}
                    className="w-full px-2 py-2 rounded-xl glass-input text-white"
                  />
                </div>
                <div>
                  <label className="block font-sans font-semibold text-slate-300 mb-1">Volatility (0.5-3)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newComp.volatility}
                    onChange={e => setNewComp({...newComp, volatility: e.target.value})}
                    className="w-full px-2 py-2 rounded-xl glass-input text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loadingAction}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold uppercase tracking-wider shadow-md transition mt-2"
              >
                List Company on Exchange
              </button>
            </form>
          </div>

          {/* Existing Companies Table */}
          <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800 overflow-hidden">
            <div className="p-6 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-white font-['Outfit']">Listed Companies ({companies.length})</h3>
              <span className="text-xs text-slate-400 font-mono">Instant Price & Float Sync</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 font-bold text-slate-400 uppercase border-b border-slate-800">
                    <th className="py-3 px-4">Symbol & Name</th>
                    <th className="py-3 px-4">Sector</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right">Available Shares</th>
                    <th className="py-3 px-4 text-right">Vol</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {companies.map(c => (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-sans">
                        <span className="font-extrabold text-white block font-['Outfit'] text-sm">{c.symbol}</span>
                        <span className="text-slate-400">{c.name}</span>
                      </td>
                      <td className="py-3 px-4 font-sans"><span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">{c.sector}</span></td>
                      <td className="py-3 px-4 text-right font-bold text-white">₹{c.currentPrice.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">{c.availableShares.toLocaleString('en-IN')} / {c.totalShares.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-right">{c.volatility}x</td>
                      <td className="py-3 px-4 text-center font-sans">
                        <button
                          onClick={() => handleDeleteCompany(c.id, c.symbol)}
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition"
                          title="Delete Company"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TRADER TEAMS MANAGEMENT */}
      {activeTab === 'TRADERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Trader Form */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-extrabold text-white font-['Outfit'] flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              <span>Register New Team Account</span>
            </h3>
            <form onSubmit={handleCreateTrader} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Team Display Name</label>
                <input
                  type="text"
                  required
                  value={newTrader.teamName}
                  onChange={e => setNewTrader({...newTrader, teamName: e.target.value})}
                  placeholder="e.g. Spartan Capital"
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Login Username</label>
                <input
                  type="text"
                  required
                  value={newTrader.username}
                  onChange={e => setNewTrader({...newTrader, username: e.target.value})}
                  placeholder="e.g. spartan_team"
                  className="w-full px-3 py-2 rounded-xl glass-input text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={newTrader.password}
                  onChange={e => setNewTrader({...newTrader, password: e.target.value})}
                  placeholder="e.g. pass123"
                  className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Starting Cash Balance (₹)</label>
                <input
                  type="number"
                  required
                  value={newTrader.cash}
                  onChange={e => setNewTrader({...newTrader, cash: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl glass-input text-white font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={loadingAction}
                className="w-full py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-extrabold uppercase tracking-wider shadow-md transition mt-2"
              >
                Create Team Account
              </button>
            </form>
          </div>

          {/* Registered Teams List */}
          <div className="lg:col-span-2 glass-card rounded-3xl border border-slate-800 overflow-hidden">
            <div className="p-6 bg-slate-900/60 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-white font-['Outfit']">Registered Participating Teams ({traderUsers.length})</h3>
              <span className="text-xs text-slate-400 font-mono">Default Starter Cash: ₹10,00,000</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950/60 font-bold text-slate-400 uppercase border-b border-slate-800 font-sans">
                    <th className="py-3 px-6">Team Name & ID</th>
                    <th className="py-3 px-6">Login Username</th>
                    <th className="py-3 px-6 text-right">Current Cash</th>
                    <th className="py-3 px-6 text-right">Net Worth</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {traderUsers.map(u => {
                    const boardItem = leaderboard.find(l => l.userId === u.id);
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-6 font-sans">
                          <span className="font-extrabold text-white block text-sm">{u.teamName}</span>
                          <span className="text-slate-500 text-[10px] font-mono">{u.id}</span>
                        </td>
                        <td className="py-3.5 px-6 text-purple-300">@{u.username}</td>
                        <td className="py-3.5 px-6 text-right font-bold text-emerald-400">₹{u.cash.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-6 text-right font-black text-white">₹{(boardItem?.netWorth || u.cash).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3.5 px-6 text-right">
                          <button 
                            onClick={() => handleAdjustCash(u.id, u.teamName)}
                            className="px-3 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded text-xs font-bold transition-colors border border-amber-500/30"
                          >
                            Adjust Cash
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
