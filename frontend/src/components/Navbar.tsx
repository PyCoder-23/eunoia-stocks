import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ShieldAlert, TrendingUp, Newspaper, LogOut, LayoutDashboard, Briefcase, Activity, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { gameState, leaderboard } = useSocket();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const myLeaderboardItem = user ? leaderboard.find(l => l.userId === user.id) : null;
  const netWorth = myLeaderboardItem ? myLeaderboardItem.netWorth : user?.cash || 0;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Market', path: '/market', icon: TrendingUp },
    { name: 'Portfolio', path: '/portfolio', icon: Briefcase },
    { name: 'News Feed', path: '/news', icon: Newspaper },
    { name: 'History', path: '/history', icon: Activity },
  ];

  const getStatusText = () => {
    if (gameState.status === 'ACTIVE') return `🟢 ${gameState.roundName}`;
    if (gameState.status === 'PAUSED') return `⏸ ${gameState.roundName} (PAUSED)`;
    if (gameState.status === 'ENDED') return `⏹ COMPETITION ENDED`;
    return `⏳ ${gameState.roundName}`;
  };

  const getStatusColor = () => {
    if (gameState.status === 'ACTIVE') return 'text-emerald-400';
    if (gameState.status === 'PAUSED') return 'text-amber-400';
    if (gameState.status === 'ENDED') return 'text-purple-400';
    return 'text-slate-400';
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4 min-w-0">
          
          {/* Logo & Round Status (Stacked to save space) */}
          <Link to={user?.role === 'ADMIN' ? '/admin' : '/dashboard'} className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              <TrendingUp className="w-6 h-6 text-slate-950 font-extrabold" />
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-lg md:text-xl font-extrabold tracking-tight text-white font-['Outfit'] truncate">
                MARKET <span className="text-gradient-primary">MAYHEM</span>
              </span>
              <span className={`text-[9px] md:text-[10px] uppercase tracking-widest font-bold truncate max-w-[120px] md:max-w-[180px] lg:max-w-[220px] ${getStatusColor()}`} title={getStatusText()}>
                {getStatusText()}
              </span>
            </div>
          </Link>

          {/* Nav Links for Traders (Desktop) */}
          {user && user.role === 'TRADER' && (
            <nav className="hidden lg:flex items-center gap-1 shrink-0 min-w-0">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    title={link.name}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all min-w-0 ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {/* Hide text on smaller laptops (lg), show on larger (xl) */}
                    <span className="hidden xl:block truncate">{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* User Status & Admin Links */}
          <div className="flex items-center gap-2 sm:gap-4 shrink min-w-0">
            {user ? (
              <>
                {user.role === 'TRADER' ? (
                  /* Cash & Net Worth (Stacked vertically to save width) */
                  <div className="hidden md:flex flex-col justify-center px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 shrink-0 min-w-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider">Cash</span>
                      <span className="text-emerald-400 font-bold text-[11px] lg:text-xs">
                        ₹{user.cash.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-slate-800 mt-0.5 pt-0.5">
                      <span className="text-slate-400 text-[10px] uppercase tracking-wider">Net Worth</span>
                      <span className="text-white font-bold text-[11px] lg:text-xs">
                        ₹{netWorth.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold text-sm hover:bg-purple-500/30 transition shrink-0"
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0 text-purple-400" />
                    <span className="hidden sm:block">Command Center</span>
                  </Link>
                )}

                <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0">
                  <div className="text-right hidden sm:block shrink min-w-0">
                    <span className="text-sm font-bold text-white block leading-tight truncate max-w-[80px] lg:max-w-[120px]" title={user.teamName}>
                      {user.teamName}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block truncate">
                      {user.role === 'ADMIN' ? 'Admin' : `Rank #${myLeaderboardItem?.rank || '-'}`}
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    title="Logout"
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/60 shrink-0 ml-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>

                  {/* Mobile Menu Toggle */}
                  {user.role === 'TRADER' && (
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="lg:hidden p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700/60 shrink-0 ml-1"
                    >
                      {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <Link
                to="/login"
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform shrink-0"
              >
                Team Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu (Traders Only) */}
      {isMobileMenuOpen && user && user.role === 'TRADER' && (
        <div className="lg:hidden border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-xl absolute w-full shadow-2xl">
          <nav className="flex flex-col px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};

