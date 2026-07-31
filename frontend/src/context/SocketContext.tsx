import { SOCKET_URL } from '../config';
import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

export interface Company {
  id: string;
  name: string;
  symbol: string;
  sector: string;
  description: string;
  initialPrice: number;
  currentPrice: number;
  previousPrice: number;
  totalShares: number;
  availableShares: number;
  volatility: number;
}

export interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedSector?: string | null;
  affectedCompanyId?: string | null;
  expectedImpact: number;
  timestamp: number;
  active?: number;
}

export interface GameState {
  id: string;
  round: number;
  roundName: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED' | 'ENDED';
  marketTrend: string;
}

export interface LeaderboardItem {
  rank: number;
  userId: string;
  teamName: string;
  username: string;
  cash: number;
  portfolioValue: number;
  netWorth: number;
  profitLoss: number;
}

export interface TradeAlert {
  id: string;
  teamName: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  totalAmount: number;
  timestamp: number;
}

export interface ChaosAlert {
  title: string;
  message: string;
  type: string;
}

interface SocketContextType {
  socket: Socket | null;
  companies: Company[];
  leaderboard: LeaderboardItem[];
  newsFeed: NewsArticle[];
  gameState: GameState;
  recentTrades: TradeAlert[];
  latestNewsAlert: NewsArticle | null;
  latestChaosAlert: ChaosAlert | null;
  clearNewsAlert: () => void;
  clearChaosAlert: () => void;
  refreshMarketData: () => Promise<void>;
}
const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsArticle[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    id: 'current',
    round: 0,
    roundName: 'Loading Simulation State...',
    status: 'STOPPED',
    marketTrend: 'STABLE',
  });
  const [recentTrades, setRecentTrades] = useState<TradeAlert[]>([]);
  const [latestNewsAlert, setLatestNewsAlert] = useState<NewsArticle | null>(null);
  const [latestChaosAlert, setLatestChaosAlert] = useState<ChaosAlert | null>(null);

  // Fetch initial REST data
  const refreshMarketData = async () => {
    try {
      const [compsRes, stateRes, boardRes, newsRes] = await Promise.all([
        axios.get(`${SOCKET_URL}/api/game/companies`),
        axios.get(`${SOCKET_URL}/api/game/game-state`),
        axios.get(`${SOCKET_URL}/api/game/leaderboard`),
        axios.get(`${SOCKET_URL}/api/game/news`),
      ]);
      setCompanies(compsRes.data);
      setGameState(stateRes.data);
      setLeaderboard(boardRes.data);
      setNewsFeed(newsRes.data);
    } catch (err) {
      console.error('Error fetching initial market data:', err);
    }
  };

  useEffect(() => {
    refreshMarketData();

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('📡 Connected to Market Mayhem WebSocket server');
      if (user) {
        newSocket.emit('register_user', {
          id: user.id,
          username: user.username,
          role: user.role,
          teamName: user.teamName,
        });
      }
    });

    newSocket.on('MARKET_UPDATE', (updatedComps: Company[]) => {
      setCompanies(updatedComps);
    });

    newSocket.on('LEADERBOARD_UPDATE', (updatedBoard: LeaderboardItem[]) => {
      setLeaderboard(updatedBoard);
    });

    newSocket.on('NEWS_RELEASED', (article: NewsArticle) => {
      setNewsFeed(prev => [article, ...prev]);
      setLatestNewsAlert(article);
    });

    newSocket.on('GAME_STATE_CHANGE', (newState: GameState) => {
      setGameState(newState);
    });

    newSocket.on('TRADE_EXECUTED', (trade: TradeAlert) => {
      setRecentTrades(prev => [trade, ...prev.slice(0, 49)]);
    });

    newSocket.on('CHAOS_EVENT', (alert: ChaosAlert) => {
      setLatestChaosAlert(alert);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const clearNewsAlert = () => setLatestNewsAlert(null);
  const clearChaosAlert = () => setLatestChaosAlert(null);

  return (
    <SocketContext.Provider
      value={{
        socket,
        companies,
        leaderboard,
        newsFeed,
        gameState,
        recentTrades,
        latestNewsAlert,
        latestChaosAlert,
        clearNewsAlert,
        clearChaosAlert,
        refreshMarketData,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
