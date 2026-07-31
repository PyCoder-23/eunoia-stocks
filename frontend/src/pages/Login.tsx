import { API_URL } from '../config';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, ShieldAlert, Lock, User, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activeRole, setActiveRole] = useState<'TRADER' | 'ADMIN'>('TRADER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        username: username.trim(),
        password,
      });

      const { token, user } = res.data;
      login(token, user);

      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role: 'TRADER' | 'ADMIN') => {
    if (role === 'ADMIN') {
      setUsername('admin');
      setPassword('admin123');
      setActiveRole('ADMIN');
    } else {
      setUsername('team_alpha');
      setPassword('password123');
      setActiveRole('TRADER');
    }
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Neon Glowing Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/25 transform -rotate-6 hover:rotate-0 transition-transform duration-300">
            <TrendingUp className="w-9 h-9 text-slate-950 font-extrabold" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white font-['Outfit']">
            MARKET <span className="text-gradient-primary">MAYHEM</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">Real-Time College Stock Market Simulation</p>
        </div>

        {/* Login Card */}
        <div className="glass-card p-8 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl">
          {/* Role Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-2xl mb-6 border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveRole('TRADER')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeRole === 'TRADER'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trader Team
            </button>
            <button
              type="button"
              onClick={() => setActiveRole('ADMIN')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeRole === 'ADMIN'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Admin Control
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                {activeRole === 'ADMIN' ? 'Admin Username' : 'Team Username / ID'}
              </label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activeRole === 'ADMIN' ? 'e.g. admin' : 'e.g. team_alpha'}
                  className="w-full pl-12 pr-4 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 rounded-xl glass-input text-sm text-white placeholder-slate-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-extrabold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg transition-all transform hover:scale-[1.01] ${
                activeRole === 'ADMIN'
                  ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-white shadow-purple-500/25'
                  : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-500 hover:to-teal-500 text-slate-950 shadow-emerald-500/25'
              }`}
            >
              {loading ? (
                <span className="inline-block animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <>
                  <span>Enter Competition Floor</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Instant Demo Access
            </span>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fillDemoCredentials('TRADER')}
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 text-xs font-semibold border border-slate-700/60 transition"
              >
                Load Trader Demo (team_alpha)
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('ADMIN')}
                className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 text-xs font-semibold border border-slate-700/60 transition"
              >
                Load Admin Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
