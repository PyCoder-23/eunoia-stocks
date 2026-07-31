import { Server, Socket } from 'socket.io';
import { Company, GameState, NewsEvent } from '../schema/index.js';

let ioInstance: Server | null = null;
const onlineUsers = new Map<string, { username: string; role: string; teamName: string; socketId: string }>();

export const initSockets = (io: Server): void => {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    console.log(`📡 New WebSocket client connected: ${socket.id}`);

    socket.on('register_user', (userData: { id: string; username: string; role: string; teamName: string }) => {
      if (userData && userData.id) {
        onlineUsers.set(socket.id, { ...userData, socketId: socket.id });
        io.emit('ONLINE_USERS_UPDATE', Array.from(onlineUsers.values()));
        console.log(`User registered on socket: ${userData.username} (${userData.role})`);
      }
    });

    socket.on('disconnect', () => {
      if (onlineUsers.has(socket.id)) {
        const u = onlineUsers.get(socket.id);
        console.log(`📡 WebSocket client disconnected: ${u?.username} (${socket.id})`);
        onlineUsers.delete(socket.id);
        io.emit('ONLINE_USERS_UPDATE', Array.from(onlineUsers.values()));
      } else {
        console.log(`📡 WebSocket client disconnected: ${socket.id}`);
      }
    });
  });
};

export const getOnlineUsers = () => Array.from(onlineUsers.values());

export const broadcastMarketUpdate = (companies: Company[]): void => {
  if (ioInstance) {
    ioInstance.emit('MARKET_UPDATE', companies);
  }
};

export const broadcastNewsEvent = (news: NewsEvent): void => {
  if (ioInstance) {
    ioInstance.emit('NEWS_RELEASED', news);
  }
};

export const broadcastGameState = (state: GameState): void => {
  if (ioInstance) {
    ioInstance.emit('GAME_STATE_CHANGE', state);
  }
};

export const broadcastLeaderboard = (leaderboard: any[]): void => {
  if (ioInstance) {
    ioInstance.emit('LEADERBOARD_UPDATE', leaderboard);
  }
};

export const broadcastTradeExecuted = (tradeInfo: any): void => {
  if (ioInstance) {
    ioInstance.emit('TRADE_EXECUTED', tradeInfo);
  }
};

export const broadcastChaosEvent = (chaosAlert: { title: string; message: string; type: string }): void => {
  if (ioInstance) {
    ioInstance.emit('CHAOS_EVENT', chaosAlert);
  }
};
