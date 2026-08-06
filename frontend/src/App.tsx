import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { StockTickerBanner } from './components/StockTickerBanner';
import { BreakingNewsModal } from './components/BreakingNewsModal';
import { WinnerScreen } from './components/WinnerScreen';
import { Login } from './pages/Login';
import { Dashboard } from './pages/trader/Dashboard';
import { StockMarket } from './pages/trader/StockMarket';
import { Portfolio } from './pages/trader/Portfolio';
import { NewsFeed } from './pages/trader/NewsFeed';
import { TransactionHistory } from './pages/trader/TransactionHistory';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireRole?: 'ADMIN' | 'TRADER' }> = ({ children, requireRole }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-emerald-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <span className="inline-block animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
          <span>Syncing Market Mayhem Simulation State...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100">
      <Navbar />
      <StockTickerBanner />
      <main className="flex-1 pb-16">
        {children}
      </main>
      <BreakingNewsModal />
      <WinnerScreen />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Trader Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireRole="TRADER">
            <MainLayout>
              <Dashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/market"
        element={
          <ProtectedRoute requireRole="TRADER">
            <MainLayout>
              <StockMarket />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/portfolio"
        element={
          <ProtectedRoute requireRole="TRADER">
            <MainLayout>
              <Portfolio />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/news"
        element={
          <ProtectedRoute requireRole="TRADER">
            <MainLayout>
              <NewsFeed />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute requireRole="TRADER">
            <MainLayout>
              <TransactionHistory />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Admin Route */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireRole="ADMIN">
            <MainLayout>
              <AdminDashboard />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
