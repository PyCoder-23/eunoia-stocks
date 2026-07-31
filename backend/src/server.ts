import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import tradeRoutes from './routes/tradeRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import { initSockets } from './sockets/socketHandler.js';
import { createTablesIfNotExist } from './utils/seed.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/game', gameRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Market Mayhem API is running!' });
});

// Initialize WebSocket handler
initSockets(io);

const PORT = process.env.PORT || 5001;

// Self-healing startup: verify/create DB tables before starting server
createTablesIfNotExist()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Market Mayhem Backend Server running on port ${PORT}`);
      console.log(`📡 WebSocket server attached and listening for real-time connections.`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start server due to database initialization error:', err);
    process.exit(1);
  });
