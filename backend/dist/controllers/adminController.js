"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalytics = exports.dispatchChaosEvent = exports.dispatchManualNews = exports.dispatchAINews = exports.resetUserPassword = exports.getAllUsers = exports.createTraderAccount = exports.deleteCompany = exports.updateCompany = exports.createCompany = exports.resetCompetition = exports.updateGameState = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = require("../config/db.js");
const index_js_1 = require("../schema/index.js");
const drizzle_orm_1 = require("drizzle-orm");
const marketEngine_js_1 = require("../services/marketEngine.js");
const newsEngine_js_1 = require("../services/newsEngine.js");
const socketHandler_js_1 = require("../sockets/socketHandler.js");
const seed_js_1 = require("../utils/seed.js");
// --- MANUAL ROUND CONTROLS (PER IMP NOTE) ---
const updateGameState = async (req, res) => {
    try {
        const { round, status, roundName } = req.body;
        const stateList = await db_js_1.db.select().from(index_js_1.gameState).where((0, drizzle_orm_1.eq)(index_js_1.gameState.id, 'current'));
        if (stateList.length === 0) {
            res.status(500).json({ error: 'Game state not initialized' });
            return;
        }
        const current = stateList[0];
        const newRound = round !== undefined ? parseInt(round, 10) : current.round;
        const newStatus = status || current.status;
        let newRoundName = roundName || current.roundName;
        if (!roundName && round !== undefined) {
            if (newRound === 1)
                newRoundName = 'Round 1: Portfolio Building - Stable Market';
            else if (newRound === 2)
                newRoundName = 'Round 2: News & Market Reaction - High Activity';
            else if (newRound === 3)
                newRoundName = 'Round 3: Market Chaos - Extreme Volatility!';
            else if (newRound === 0)
                newRoundName = 'Competition Ready - Awaiting Start';
        }
        await db_js_1.db.update(index_js_1.gameState)
            .set({ round: newRound, status: newStatus, roundName: newRoundName })
            .where((0, drizzle_orm_1.eq)(index_js_1.gameState.id, 'current'));
        const updated = { id: 'current', round: newRound, status: newStatus, roundName: newRoundName, marketTrend: current.marketTrend };
        // Control market simulation loop based on status
        if (newStatus === 'ACTIVE') {
            (0, marketEngine_js_1.startMarketEngine)();
        }
        else {
            (0, marketEngine_js_1.stopMarketEngine)();
        }
        (0, socketHandler_js_1.broadcastGameState)(updated);
        console.log(`🎮 [ADMIN GAME CONTROL]: Set Round ${newRound} (${newStatus}) - "${newRoundName}"`);
        res.status(200).json({ message: 'Game state updated successfully', gameState: updated });
    }
    catch (error) {
        console.error('Update game state error:', error);
        res.status(500).json({ error: 'Internal server error updating game state' });
    }
};
exports.updateGameState = updateGameState;
const resetCompetition = async (req, res) => {
    try {
        (0, marketEngine_js_1.stopMarketEngine)();
        await (0, seed_js_1.createTablesIfNotExist)();
        // Reset all trader cash and delete portfolios/transactions/news
        await db_js_1.db.delete(index_js_1.transactions);
        await db_js_1.db.delete(index_js_1.portfolios);
        await db_js_1.db.delete(index_js_1.newsEvents);
        // Reset trader cash to $100,000
        await db_js_1.db.update(index_js_1.users).set({ cash: 100000.0 }).where((0, drizzle_orm_1.eq)(index_js_1.users.role, 'TRADER'));
        // Reset company prices to initialPrice
        const allComps = await db_js_1.db.select().from(index_js_1.companies);
        for (const c of allComps) {
            await db_js_1.db.update(index_js_1.companies).set({
                currentPrice: c.initialPrice,
                previousPrice: c.initialPrice,
                availableShares: c.totalShares,
            }).where((0, drizzle_orm_1.eq)(index_js_1.companies.id, c.id));
        }
        // Reset game state
        await db_js_1.db.update(index_js_1.gameState).set({
            round: 0,
            roundName: 'Competition Ready - Awaiting Start',
            status: 'STOPPED',
            marketTrend: 'STABLE',
        }).where((0, drizzle_orm_1.eq)(index_js_1.gameState.id, 'current'));
        const newState = { id: 'current', round: 0, roundName: 'Competition Ready - Awaiting Start', status: 'STOPPED', marketTrend: 'STABLE' };
        (0, socketHandler_js_1.broadcastGameState)(newState);
        const latestLeaderboard = await (0, marketEngine_js_1.calculateLeaderboard)();
        (0, socketHandler_js_1.broadcastLeaderboard)(latestLeaderboard);
        console.log('🔄 [ADMIN CONTROL]: Competition fully reset!');
        res.status(200).json({ message: 'Competition reset successfully', gameState: newState });
    }
    catch (error) {
        console.error('Reset competition error:', error);
        res.status(500).json({ error: 'Internal server error resetting competition' });
    }
};
exports.resetCompetition = resetCompetition;
// --- COMPANY MANAGEMENT (CRUD) ---
const createCompany = async (req, res) => {
    try {
        const { name, symbol, sector, description, initialPrice, totalShares, volatility } = req.body;
        if (!name || !symbol || !sector || !initialPrice || !totalShares) {
            res.status(400).json({ error: 'Required fields: name, symbol, sector, initialPrice, totalShares' });
            return;
        }
        const id = `comp-${symbol.toLowerCase().trim()}-${Date.now()}`;
        const priceVal = parseFloat(initialPrice);
        const sharesVal = parseInt(totalShares, 10);
        const newComp = {
            id,
            name: name.trim(),
            symbol: symbol.toUpperCase().trim(),
            sector: sector.trim(),
            description: description || `${name} (${symbol}) corporation in the ${sector} industry.`,
            initialPrice: priceVal,
            currentPrice: priceVal,
            previousPrice: priceVal,
            totalShares: sharesVal,
            availableShares: sharesVal,
            volatility: volatility ? parseFloat(volatility) : 0.02,
            createdAt: Date.now(),
        };
        await db_js_1.db.insert(index_js_1.companies).values(newComp);
        res.status(201).json({ message: 'Company created successfully', company: newComp });
    }
    catch (error) {
        console.error('Create company error:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Stock symbol already exists!' });
        }
        else {
            res.status(500).json({ error: 'Internal server error creating company' });
        }
    }
};
exports.createCompany = createCompany;
const updateCompany = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, symbol, sector, description, currentPrice, totalShares, volatility } = req.body;
        const compList = await db_js_1.db.select().from(index_js_1.companies).where((0, drizzle_orm_1.eq)(index_js_1.companies.id, id));
        if (compList.length === 0) {
            res.status(404).json({ error: 'Company not found' });
            return;
        }
        const updates = {};
        if (name)
            updates.name = name.trim();
        if (symbol)
            updates.symbol = symbol.toUpperCase().trim();
        if (sector)
            updates.sector = sector.trim();
        if (description)
            updates.description = description;
        if (currentPrice !== undefined)
            updates.currentPrice = parseFloat(currentPrice);
        if (totalShares !== undefined)
            updates.totalShares = parseInt(totalShares, 10);
        if (volatility !== undefined)
            updates.volatility = parseFloat(volatility);
        await db_js_1.db.update(index_js_1.companies).set(updates).where((0, drizzle_orm_1.eq)(index_js_1.companies.id, id));
        const updatedList = await db_js_1.db.select().from(index_js_1.companies).where((0, drizzle_orm_1.eq)(index_js_1.companies.id, id));
        res.status(200).json({ message: 'Company updated successfully', company: updatedList[0] });
    }
    catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ error: 'Internal server error updating company' });
    }
};
exports.updateCompany = updateCompany;
const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;
        await db_js_1.db.delete(index_js_1.companies).where((0, drizzle_orm_1.eq)(index_js_1.companies.id, id));
        res.status(200).json({ message: 'Company deleted successfully' });
    }
    catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({ error: 'Internal server error deleting company' });
    }
};
exports.deleteCompany = deleteCompany;
// --- PLAYER MANAGEMENT ---
const createTraderAccount = async (req, res) => {
    try {
        const { username, password, teamName, initialCash } = req.body;
        if (!username || !password || !teamName) {
            res.status(400).json({ error: 'Required fields: username, password, teamName' });
            return;
        }
        const id = `user-${username.toLowerCase().trim()}-${Date.now()}`;
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const cashVal = initialCash !== undefined ? parseFloat(initialCash) : 100000.0;
        const newUser = {
            id,
            username: username.trim(),
            password: hashedPassword,
            role: 'TRADER',
            teamName: teamName.trim(),
            cash: cashVal,
            createdAt: Date.now(),
        };
        await db_js_1.db.insert(index_js_1.users).values(newUser);
        res.status(201).json({
            message: 'Trader account created successfully',
            user: { id: newUser.id, username: newUser.username, teamName: newUser.teamName, cash: newUser.cash },
        });
    }
    catch (error) {
        console.error('Create trader error:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Username already exists!' });
        }
        else {
            res.status(500).json({ error: 'Internal server error creating trader account' });
        }
    }
};
exports.createTraderAccount = createTraderAccount;
const getAllUsers = async (req, res) => {
    try {
        const allUsers = await db_js_1.db.select().from(index_js_1.users);
        const online = (0, socketHandler_js_1.getOnlineUsers)();
        const onlineSocketIds = new Set(online.map(u => u.username));
        const mapped = allUsers.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            teamName: u.teamName,
            cash: parseFloat(u.cash.toFixed(2)),
            createdAt: u.createdAt,
            isOnline: onlineSocketIds.has(u.username),
        }));
        res.status(200).json(mapped);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error fetching users' });
    }
};
exports.getAllUsers = getAllUsers;
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) {
            res.status(400).json({ error: 'New password must be at least 4 characters' });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await db_js_1.db.update(index_js_1.users).set({ password: hashedPassword }).where((0, drizzle_orm_1.eq)(index_js_1.users.id, id));
        res.status(200).json({ message: 'User password reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Internal server error resetting password' });
    }
};
exports.resetUserPassword = resetUserPassword;
// --- NEWS & CHAOS CONTROLS ---
const dispatchAINews = async (req, res) => {
    try {
        const { category, sector } = req.body;
        const news = await (0, newsEngine_js_1.triggerAINews)(category, sector);
        res.status(200).json({ message: 'AI News triggered successfully', news });
    }
    catch (error) {
        console.error('Dispatch AI news error:', error);
        res.status(500).json({ error: 'Internal server error triggering AI news' });
    }
};
exports.dispatchAINews = dispatchAINews;
const dispatchManualNews = async (req, res) => {
    try {
        const news = await (0, newsEngine_js_1.triggerManualNews)(req.body);
        res.status(201).json({ message: 'Manual News published successfully', news });
    }
    catch (error) {
        console.error('Dispatch manual news error:', error);
        res.status(500).json({ error: 'Internal server error publishing manual news' });
    }
};
exports.dispatchManualNews = dispatchManualNews;
const dispatchChaosEvent = async (req, res) => {
    try {
        const { type } = req.body; // 'CRASH', 'BOOM', 'BUBBLE_TECH', 'BLACK_SWAN', 'BANKING_CRISIS'
        if (!type) {
            res.status(400).json({ error: 'Chaos event type required' });
            return;
        }
        await (0, newsEngine_js_1.triggerChaosEvent)(type);
        res.status(200).json({ message: `Chaos event '${type}' triggered successfully!` });
    }
    catch (error) {
        console.error('Dispatch chaos event error:', error);
        res.status(500).json({ error: 'Internal server error triggering chaos event' });
    }
};
exports.dispatchChaosEvent = dispatchChaosEvent;
// --- ANALYTICS ---
const getAnalytics = async (req, res) => {
    try {
        const allComps = await db_js_1.db.select().from(index_js_1.companies);
        const allTxs = await db_js_1.db.select().from(index_js_1.transactions);
        const allUsers = await db_js_1.db.select().from(index_js_1.users).where((0, drizzle_orm_1.eq)(index_js_1.users.role, 'TRADER'));
        const totalVolume = allTxs.reduce((acc, tx) => acc + tx.totalAmount, 0);
        const totalTrades = allTxs.length;
        // Most traded stock
        const txCountByComp = {};
        allComps.forEach(c => {
            txCountByComp[c.id] = { count: 0, volume: 0, symbol: c.symbol };
        });
        allTxs.forEach(tx => {
            if (txCountByComp[tx.companyId]) {
                txCountByComp[tx.companyId].count += 1;
                txCountByComp[tx.companyId].volume += tx.totalAmount;
            }
        });
        let mostTradedStock = 'N/A';
        let maxCount = -1;
        Object.values(txCountByComp).forEach(val => {
            if (val.count > maxCount && val.count > 0) {
                maxCount = val.count;
                mostTradedStock = `${val.symbol} (${val.count} trades)`;
            }
        });
        // Biggest gainer and loser
        const sortedByChange = [...allComps].map(c => {
            const pctChange = ((c.currentPrice - c.initialPrice) / c.initialPrice) * 100;
            return { symbol: c.symbol, name: c.name, price: c.currentPrice, pctChange: parseFloat(pctChange.toFixed(2)) };
        });
        sortedByChange.sort((a, b) => b.pctChange - a.pctChange);
        const biggestGainer = sortedByChange.length > 0 ? sortedByChange[0] : null;
        const biggestLoser = sortedByChange.length > 0 ? sortedByChange[sortedByChange.length - 1] : null;
        res.status(200).json({
            totalVolume: parseFloat(totalVolume.toFixed(2)),
            totalTrades,
            totalTeams: allUsers.length,
            mostTradedStock,
            biggestGainer,
            biggestLoser,
            stocksPerformance: sortedByChange,
        });
    }
    catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Internal server error fetching analytics' });
    }
};
exports.getAnalytics = getAnalytics;
