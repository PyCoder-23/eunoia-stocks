"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const tradeRoutes_js_1 = __importDefault(require("./routes/tradeRoutes.js"));
const adminRoutes_js_1 = __importDefault(require("./routes/adminRoutes.js"));
const gameRoutes_js_1 = __importDefault(require("./routes/gameRoutes.js"));
const socketHandler_js_1 = require("./sockets/socketHandler.js");
const seed_js_1 = require("./utils/seed.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
// API Routes
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/trade', tradeRoutes_js_1.default);
app.use('/api/admin', adminRoutes_js_1.default);
app.use('/api/game', gameRoutes_js_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Market Mayhem API is running!' });
});
// Initialize WebSocket handler
(0, socketHandler_js_1.initSockets)(io);
const PORT = process.env.PORT || 5001;
// Self-healing startup: verify/create DB tables before starting server
(0, seed_js_1.createTablesIfNotExist)()
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
