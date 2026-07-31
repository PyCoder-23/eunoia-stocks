"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTransactionsList = exports.getUserTransactionsList = exports.getUserPortfolioDetail = exports.getNewsFeed = exports.getLeaderboardData = exports.getCompanyDetail = exports.getCompaniesList = exports.getGameState = void 0;
const db_js_1 = require("../config/db.js");
const index_js_1 = require("../schema/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const marketEngine_js_1 = require("../services/marketEngine.js");
const getGameState = async (req, res) => {
    try {
        const stateList = await db_js_1.db.select().from(index_js_1.gameState).where((0, drizzle_orm_1.eq)(index_js_1.gameState.id, 'current'));
        if (stateList.length === 0) {
            res.status(404).json({ error: 'Game state not found' });
            return;
        }
        res.status(200).json(stateList[0]);
    }
    catch (error) {
        console.error('Get game state error:', error);
        res.status(500).json({ error: 'Internal server error fetching game state' });
    }
};
exports.getGameState = getGameState;
const getCompaniesList = async (req, res) => {
    try {
        const allComps = await db_js_1.db.select().from(index_js_1.companies);
        res.status(200).json(allComps);
    }
    catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Internal server error fetching companies' });
    }
};
exports.getCompaniesList = getCompaniesList;
const getCompanyDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const compList = await db_js_1.db.select().from(index_js_1.companies).where((0, drizzle_orm_1.eq)(index_js_1.companies.id, id));
        if (compList.length === 0) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        const comp = compList[0];
        const history = (0, marketEngine_js_1.getPriceHistory)(comp.id);
        res.status(200).json({ ...comp, priceHistory: history });
    }
    catch (error) {
        console.error('Get company detail error:', error);
        res.status(500).json({ error: 'Internal server error fetching company detail' });
    }
};
exports.getCompanyDetail = getCompanyDetail;
const getLeaderboardData = async (req, res) => {
    try {
        const leaderboard = await (0, marketEngine_js_1.calculateLeaderboard)();
        res.status(200).json(leaderboard);
    }
    catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: 'Internal server error fetching leaderboard' });
    }
};
exports.getLeaderboardData = getLeaderboardData;
const getNewsFeed = async (req, res) => {
    try {
        const news = await db_js_1.db.select().from(index_js_1.newsEvents).orderBy((0, drizzle_orm_1.desc)(index_js_1.newsEvents.timestamp));
        res.status(200).json(news);
    }
    catch (error) {
        console.error('Get news feed error:', error);
        res.status(500).json({ error: 'Internal server error fetching news feed' });
    }
};
exports.getNewsFeed = getNewsFeed;
const getUserPortfolioDetail = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const targetUserId = req.params.userId || req.user.id;
        const userList = await db_js_1.db.select().from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.id, targetUserId));
        if (userList.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const user = userList[0];
        const userPorts = await db_js_1.db.select().from(index_js_1.portfolios).where((0, drizzle_orm_1.eq)(index_js_1.portfolios.userId, user.id));
        const allComps = await db_js_1.db.select().from(index_js_1.companies);
        const compMap = new Map();
        allComps.forEach(c => compMap.set(c.id, c));
        let totalPortfolioValue = 0.0;
        let totalInvested = 0.0;
        const holdings = userPorts
            .filter(p => p.shares > 0)
            .map(p => {
            const comp = compMap.get(p.companyId);
            const currentPrice = comp ? comp.currentPrice : 0;
            const symbol = comp ? comp.symbol : 'UNKNOWN';
            const name = comp ? comp.name : 'Unknown Stock';
            const sector = comp ? comp.sector : 'General';
            const currentValue = parseFloat((p.shares * currentPrice).toFixed(2));
            const investedValue = parseFloat((p.shares * p.averagePrice).toFixed(2));
            const unrealizedPL = parseFloat((currentValue - investedValue).toFixed(2));
            const plPercentage = investedValue > 0 ? parseFloat(((unrealizedPL / investedValue) * 100).toFixed(2)) : 0.0;
            totalPortfolioValue += currentValue;
            totalInvested += investedValue;
            return {
                id: p.id,
                companyId: p.companyId,
                symbol,
                name,
                sector,
                shares: p.shares,
                averagePrice: parseFloat(p.averagePrice.toFixed(2)),
                currentPrice: parseFloat(currentPrice.toFixed(2)),
                currentValue,
                investedValue,
                unrealizedPL,
                plPercentage,
            };
        });
        const netWorth = parseFloat((user.cash + totalPortfolioValue).toFixed(2));
        const totalUnrealizedPL = parseFloat((totalPortfolioValue - totalInvested).toFixed(2));
        res.status(200).json({
            user: {
                id: user.id,
                username: user.username,
                teamName: user.teamName,
                cash: parseFloat(user.cash.toFixed(2)),
            },
            summary: {
                cash: parseFloat(user.cash.toFixed(2)),
                portfolioValue: parseFloat(totalPortfolioValue.toFixed(2)),
                netWorth,
                totalInvested: parseFloat(totalInvested.toFixed(2)),
                totalUnrealizedPL,
            },
            holdings,
        });
    }
    catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: 'Internal server error fetching portfolio detail' });
    }
};
exports.getUserPortfolioDetail = getUserPortfolioDetail;
const getUserTransactionsList = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        const targetUserId = req.params.userId || req.user.id;
        const txs = await db_js_1.db.select().from(index_js_1.transactions).where((0, drizzle_orm_1.eq)(index_js_1.transactions.userId, targetUserId)).orderBy((0, drizzle_orm_1.desc)(index_js_1.transactions.timestamp));
        const allComps = await db_js_1.db.select().from(index_js_1.companies);
        const compMap = new Map();
        allComps.forEach(c => compMap.set(c.id, c));
        const mapped = txs.map(tx => {
            const comp = compMap.get(tx.companyId);
            return {
                ...tx,
                symbol: comp ? comp.symbol : 'UNKNOWN',
                companyName: comp ? comp.name : 'Unknown Stock',
            };
        });
        res.status(200).json(mapped);
    }
    catch (error) {
        console.error('Get user transactions error:', error);
        res.status(500).json({ error: 'Internal server error fetching transactions' });
    }
};
exports.getUserTransactionsList = getUserTransactionsList;
const getAllTransactionsList = async (req, res) => {
    try {
        const txs = await db_js_1.db.select().from(index_js_1.transactions).orderBy((0, drizzle_orm_1.desc)(index_js_1.transactions.timestamp)).limit(100);
        const allComps = await db_js_1.db.select().from(index_js_1.companies);
        const allUsers = await db_js_1.db.select().from(index_js_1.users);
        const compMap = new Map();
        allComps.forEach(c => compMap.set(c.id, c));
        const userMap = new Map();
        allUsers.forEach(u => userMap.set(u.id, u));
        const mapped = txs.map(tx => {
            const comp = compMap.get(tx.companyId);
            const user = userMap.get(tx.userId);
            return {
                ...tx,
                symbol: comp ? comp.symbol : 'UNKNOWN',
                companyName: comp ? comp.name : 'Unknown Stock',
                teamName: user ? user.teamName : 'Unknown Team',
                username: user ? user.username : 'unknown',
            };
        });
        res.status(200).json(mapped);
    }
    catch (error) {
        console.error('Get all transactions error:', error);
        res.status(500).json({ error: 'Internal server error fetching all transactions' });
    }
};
exports.getAllTransactionsList = getAllTransactionsList;
