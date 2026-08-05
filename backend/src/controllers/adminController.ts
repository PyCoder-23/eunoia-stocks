import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { companies, users, gameState, newsEvents, transactions, portfolios, NewCompany, NewUser } from '../schema/index.js';
import { eq } from 'drizzle-orm';
import { startMarketEngine, stopMarketEngine, calculateLeaderboard } from '../services/marketEngine.js';
import { triggerAINews, triggerManualNews, triggerChaosEvent } from '../services/newsEngine.js';
import { broadcastGameState, broadcastLeaderboard, getOnlineUsers } from '../sockets/socketHandler.js';
import { createTablesIfNotExist, seed } from '../utils/seed.js';

// --- MANUAL ROUND CONTROLS (PER IMP NOTE) ---
export const updateGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const { round, status, roundName } = req.body;
    const stateList = await db.select().from(gameState).where(eq(gameState.id, 'current'));
    if (stateList.length === 0) {
      res.status(500).json({ error: 'Game state not initialized' });
      return;
    }

    const current = stateList[0];
    const newRound = round !== undefined ? parseInt(round, 10) : current.round;
    const newStatus = status || current.status;
    let newRoundName = roundName || current.roundName;

    if (!roundName && round !== undefined) {
      if (newRound === 1) newRoundName = 'Round 1: Portfolio Building - Stable Market';
      else if (newRound === 2) newRoundName = 'Round 2: News & Market Reaction - High Activity';
      else if (newRound === 3) newRoundName = 'Round 3: Market Chaos - Extreme Volatility!';
      else if (newRound === 0) newRoundName = 'Competition Ready - Awaiting Start';
    }

    await db.update(gameState)
      .set({ round: newRound, status: newStatus, roundName: newRoundName })
      .where(eq(gameState.id, 'current'));

    const updated = { id: 'current', round: newRound, status: newStatus, roundName: newRoundName, marketTrend: current.marketTrend };

    // Control market simulation loop based on status
    if (newStatus === 'ACTIVE') {
      startMarketEngine();
    } else {
      stopMarketEngine();
    }

    broadcastGameState(updated);
    console.log(`🎮 [ADMIN GAME CONTROL]: Set Round ${newRound} (${newStatus}) - "${newRoundName}"`);

    res.status(200).json({ message: 'Game state updated successfully', gameState: updated });
  } catch (error) {
    console.error('Update game state error:', error);
    res.status(500).json({ error: 'Internal server error updating game state' });
  }
};

export const resetCompetition = async (req: Request, res: Response): Promise<void> => {
  try {
    stopMarketEngine();
    
    // Re-seed database to clean pre-seeded state (wipes history, portfolios, transactions, news, and restores 10 Lakh cash for all default teams)
    await seed(false);

    const newState = { id: 'current', round: 0, roundName: 'Competition Ready - Awaiting Start', status: 'STOPPED', marketTrend: 'STABLE' };
    broadcastGameState(newState);

    const latestLeaderboard = await calculateLeaderboard();
    broadcastLeaderboard(latestLeaderboard);

    console.log('🔄 [ADMIN CONTROL]: Competition fully reset to clean 10 Lakh pre-seeded state!');
    res.status(200).json({ message: 'Competition reset successfully to clean 10 Lakh state', gameState: newState });
  } catch (error) {
    console.error('Reset competition error:', error);
    res.status(500).json({ error: 'Internal server error resetting competition' });
  }
};

// --- COMPANY MANAGEMENT (CRUD) ---
export const createCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, symbol, sector, description, initialPrice, totalShares, volatility } = req.body;

    if (!name || !symbol || !sector || !initialPrice || !totalShares) {
      res.status(400).json({ error: 'Required fields: name, symbol, sector, initialPrice, totalShares' });
      return;
    }

    const id = `comp-${symbol.toLowerCase().trim()}-${Date.now()}`;
    const priceVal = parseFloat(initialPrice);
    const sharesVal = parseInt(totalShares, 10);

    const newComp: NewCompany = {
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

    await db.insert(companies).values(newComp);
    res.status(201).json({ message: 'Company created successfully', company: newComp });
  } catch (error: any) {
    console.error('Create company error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Stock symbol already exists!' });
    } else {
      res.status(500).json({ error: 'Internal server error creating company' });
    }
  }
};

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, symbol, sector, description, currentPrice, totalShares, volatility } = req.body;

    const compList = await db.select().from(companies).where(eq(companies.id, id));
    if (compList.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (symbol) updates.symbol = symbol.toUpperCase().trim();
    if (sector) updates.sector = sector.trim();
    if (description) updates.description = description;
    if (currentPrice !== undefined) updates.currentPrice = parseFloat(currentPrice);
    if (totalShares !== undefined) updates.totalShares = parseInt(totalShares, 10);
    if (volatility !== undefined) updates.volatility = parseFloat(volatility);

    await db.update(companies).set(updates).where(eq(companies.id, id));
    const updatedList = await db.select().from(companies).where(eq(companies.id, id));
    res.status(200).json({ message: 'Company updated successfully', company: updatedList[0] });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Internal server error updating company' });
  }
};

export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await db.delete(companies).where(eq(companies.id, id));
    res.status(200).json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Internal server error deleting company' });
  }
};

// --- PLAYER MANAGEMENT ---
export const createTraderAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, teamName, initialCash } = req.body;

    if (!username || !password || !teamName) {
      res.status(400).json({ error: 'Required fields: username, password, teamName' });
      return;
    }

    const id = `user-${username.toLowerCase().trim()}-${Date.now()}`;
    const hashedPassword = await bcrypt.hash(password, 10);
    const cashVal = initialCash !== undefined ? parseFloat(initialCash) : 1000000.0;

    const newUser: NewUser = {
      id,
      username: username.trim(),
      password: hashedPassword,
      role: 'TRADER',
      teamName: teamName.trim(),
      cash: cashVal,
      createdAt: Date.now(),
    };

    await db.insert(users).values(newUser);
    res.status(201).json({
      message: 'Trader account created successfully',
      user: { id: newUser.id, username: newUser.username, teamName: newUser.teamName, cash: newUser.cash },
    });
  } catch (error: any) {
    console.error('Create trader error:', error);
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Username already exists!' });
    } else {
      res.status(500).json({ error: 'Internal server error creating trader account' });
    }
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const allUsers = await db.select().from(users);
    const online = getOnlineUsers();
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
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error fetching users' });
  }
};

export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
    res.status(200).json({ message: 'User password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error resetting password' });
  }
};

export const adjustTeamCash = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (amount === undefined || isNaN(amount)) {
      res.status(400).json({ error: 'Valid amount is required' });
      return;
    }

    const userList = await db.select().from(users).where(eq(users.id, id));
    if (userList.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const currentUser = userList[0];
    const newCash = currentUser.cash + parseFloat(amount);
    
    // Prevent negative cash if needed, but for admin we can allow it or restrict to 0
    const finalCash = newCash < 0 ? 0 : newCash;

    await db.update(users).set({ cash: finalCash }).where(eq(users.id, id));

    // After updating cash, recalculate leaderboard to reflect new cash/networth
    const latestLeaderboard = await calculateLeaderboard();
    broadcastLeaderboard(latestLeaderboard);

    res.status(200).json({ message: 'Team cash adjusted successfully', newCash: finalCash });
  } catch (error) {
    console.error('Adjust team cash error:', error);
    res.status(500).json({ error: 'Internal server error adjusting team cash' });
  }
};

// --- NEWS & CHAOS CONTROLS ---
export const dispatchAINews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, sector } = req.body;
    const news = await triggerAINews(category, sector);
    res.status(200).json({ message: 'AI News triggered successfully', news });
  } catch (error) {
    console.error('Dispatch AI news error:', error);
    res.status(500).json({ error: 'Internal server error triggering AI news' });
  }
};

export const dispatchManualNews = async (req: Request, res: Response): Promise<void> => {
  try {
    const news = await triggerManualNews(req.body);
    res.status(201).json({ message: 'Manual News published successfully', news });
  } catch (error) {
    console.error('Dispatch manual news error:', error);
    res.status(500).json({ error: 'Internal server error publishing manual news' });
  }
};

export const dispatchChaosEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, title, message, sector, impact } = req.body;
    if (!type) {
      res.status(400).json({ error: 'Chaos event type required' });
      return;
    }
    await triggerChaosEvent(type, title, message, sector, impact ? parseFloat(impact) : undefined);
    res.status(200).json({ message: `Chaos event '${type}' triggered successfully!` });
  } catch (error) {
    console.error('Dispatch chaos event error:', error);
    res.status(500).json({ error: 'Internal server error triggering chaos event' });
  }
};

// --- ANALYTICS ---
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const allComps = await db.select().from(companies);
    const allTxs = await db.select().from(transactions);
    const allUsers = await db.select().from(users).where(eq(users.role, 'TRADER'));

    const totalVolume = allTxs.reduce((acc, tx) => acc + tx.totalAmount, 0);
    const totalTrades = allTxs.length;

    // Most traded stock
    const txCountByComp: Record<string, { count: number; volume: number; symbol: string }> = {};
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
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error fetching analytics' });
  }
};
