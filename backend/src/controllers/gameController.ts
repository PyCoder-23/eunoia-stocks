import { Request, Response } from 'express';
import { db } from '../config/db.js';
import { companies, gameState, newsEvents, portfolios, transactions, users } from '../schema/index.js';
import { eq, desc } from 'drizzle-orm';
import { calculateLeaderboard, getPriceHistory } from '../services/marketEngine.js';

export const getGameState = async (req: Request, res: Response): Promise<void> => {
  try {
    const stateList = await db.select().from(gameState).where(eq(gameState.id, 'current'));
    if (stateList.length === 0) {
      res.status(404).json({ error: 'Game state not found' });
      return;
    }
    res.status(200).json(stateList[0]);
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Internal server error fetching game state' });
  }
};

export const getCompaniesList = async (req: Request, res: Response): Promise<void> => {
  try {
    const allComps = await db.select().from(companies);
    res.status(200).json(allComps);
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Internal server error fetching companies' });
  }
};

export const getCompanyDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const compList = await db.select().from(companies).where(eq(companies.id, id));
    if (compList.length === 0) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }
    const comp = compList[0];
    const history = getPriceHistory(comp.id);
    res.status(200).json({ ...comp, priceHistory: history });
  } catch (error) {
    console.error('Get company detail error:', error);
    res.status(500).json({ error: 'Internal server error fetching company detail' });
  }
};

export const getLeaderboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    const leaderboard = await calculateLeaderboard();
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error fetching leaderboard' });
  }
};

export const getNewsFeed = async (req: Request, res: Response): Promise<void> => {
  try {
    const news = await db.select().from(newsEvents).orderBy(desc(newsEvents.timestamp));
    res.status(200).json(news);
  } catch (error) {
    console.error('Get news feed error:', error);
    res.status(500).json({ error: 'Internal server error fetching news feed' });
  }
};

export const getUserPortfolioDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const targetUserId = req.params.userId || req.user.id;
    const userList = await db.select().from(users).where(eq(users.id, targetUserId));
    if (userList.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = userList[0];
    const userPorts = await db.select().from(portfolios).where(eq(portfolios.userId, user.id));
    const allComps = await db.select().from(companies);

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
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Internal server error fetching portfolio detail' });
  }
};

export const getUserTransactionsList = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const targetUserId = req.params.userId || req.user.id;
    const txs = await db.select().from(transactions).where(eq(transactions.userId, targetUserId)).orderBy(desc(transactions.timestamp));
    const allComps = await db.select().from(companies);

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
  } catch (error) {
    console.error('Get user transactions error:', error);
    res.status(500).json({ error: 'Internal server error fetching transactions' });
  }
};

export const getAllTransactionsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const txs = await db.select().from(transactions).orderBy(desc(transactions.timestamp)).limit(100);
    const allComps = await db.select().from(companies);
    const allUsers = await db.select().from(users);

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
  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({ error: 'Internal server error fetching all transactions' });
  }
};
