"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = require("../config/db.js");
const index_js_1 = require("../schema/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_market_mayhem_jwt_key_2026';
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: 'Username and password are required' });
            return;
        }
        const userList = await db_js_1.db.select().from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.username, username.trim()));
        if (userList.length === 0) {
            res.status(401).json({ error: 'Invalid username or password' });
            return;
        }
        const user = userList[0];
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(401).json({ error: 'Invalid username or password' });
            return;
        }
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role,
            teamName: user.teamName,
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                teamName: user.teamName,
                cash: user.cash,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error during login' });
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const userList = await db_js_1.db.select().from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, req.user.id));
        if (userList.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const user = userList[0];
        res.status(200).json({
            id: user.id,
            username: user.username,
            role: user.role,
            teamName: user.teamName,
            cash: user.cash,
        });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Internal server error fetching user profile' });
    }
};
exports.getMe = getMe;
