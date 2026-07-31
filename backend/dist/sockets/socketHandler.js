"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastChaosEvent = exports.broadcastTradeExecuted = exports.broadcastLeaderboard = exports.broadcastGameState = exports.broadcastNewsEvent = exports.broadcastMarketUpdate = exports.getOnlineUsers = exports.initSockets = void 0;
let ioInstance = null;
const onlineUsers = new Map();
const initSockets = (io) => {
    ioInstance = io;
    io.on('connection', (socket) => {
        console.log(`📡 New WebSocket client connected: ${socket.id}`);
        socket.on('register_user', (userData) => {
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
            }
            else {
                console.log(`📡 WebSocket client disconnected: ${socket.id}`);
            }
        });
    });
};
exports.initSockets = initSockets;
const getOnlineUsers = () => Array.from(onlineUsers.values());
exports.getOnlineUsers = getOnlineUsers;
const broadcastMarketUpdate = (companies) => {
    if (ioInstance) {
        ioInstance.emit('MARKET_UPDATE', companies);
    }
};
exports.broadcastMarketUpdate = broadcastMarketUpdate;
const broadcastNewsEvent = (news) => {
    if (ioInstance) {
        ioInstance.emit('NEWS_RELEASED', news);
    }
};
exports.broadcastNewsEvent = broadcastNewsEvent;
const broadcastGameState = (state) => {
    if (ioInstance) {
        ioInstance.emit('GAME_STATE_CHANGE', state);
    }
};
exports.broadcastGameState = broadcastGameState;
const broadcastLeaderboard = (leaderboard) => {
    if (ioInstance) {
        ioInstance.emit('LEADERBOARD_UPDATE', leaderboard);
    }
};
exports.broadcastLeaderboard = broadcastLeaderboard;
const broadcastTradeExecuted = (tradeInfo) => {
    if (ioInstance) {
        ioInstance.emit('TRADE_EXECUTED', tradeInfo);
    }
};
exports.broadcastTradeExecuted = broadcastTradeExecuted;
const broadcastChaosEvent = (chaosAlert) => {
    if (ioInstance) {
        ioInstance.emit('CHAOS_EVENT', chaosAlert);
    }
};
exports.broadcastChaosEvent = broadcastChaosEvent;
