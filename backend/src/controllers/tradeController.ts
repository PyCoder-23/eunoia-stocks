import { Request, Response } from 'express';
import { db } from '../config/db.js';
import { users, companies, portfolios, transactions, gameState, NewPortfolio, NewTransaction } from '../schema/index.js';
import { eq, and } from 'drizzle-orm';
import { applyTradeSupplyDemandImpact, calculateLeaderboard } from '../services/marketEngine.js';
import { broadcastTradeExecuted, broadcastLeaderboard } from '../sockets/socketHandler.js';

export const executeTrade = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { companyId, type, shares } = req.body; // type: 'BUY' | 'SELL'
    const shareCount = parseInt(shares, 10);

    if (!companyId || !type || isNaN(shareCount) || shareCount <= 0) {
      res.status(400).json({ error: 'Invalid trade parameters: companyId, type (BUY/SELL), and positive share count required.' });
      return;
    }

    // Check game state: trading only allowed when status === 'ACTIVE' and round in [1, 2, 3]
    const stateList = await db.select().from(gameState).where(eq(gameState.id, 'current'));
    if (stateList.length === 0 || stateList[0].status !== 'ACTIVE' || stateList[0].round === 0) {
      res.status(403).json({ error: 'Trading is currently locked! Please wait for the Admin to start or resume the active round.' });
      return;
    }

    // Fetch user and company
    const userList = await db.select().from(users).where(eq(users.id, req.user.id));
    const compList = await db.select().from(companies).where(eq(companies.id, companyId));

    if (userList.length === 0 || compList.length === 0) {
      res.status(404).json({ error: 'User or Stock symbol not found in database.' });
      return;
    }

    const user = userList[0];
    const comp = compList[0];
    const execPrice = comp.currentPrice;
    const totalCost = parseFloat((execPrice * shareCount).toFixed(2));

    if (type === 'BUY') {
      if (user.cash < totalCost) {
        res.status(400).json({ error: `Insufficient funds. Required: $${totalCost.toLocaleString()}, Available: $${user.cash.toLocaleString()}` });
        return;
      }
      if (comp.availableShares < shareCount) {
        res.status(400).json({ error: `Insufficient market liquidity. Only ${comp.availableShares.toLocaleString()} shares of ${comp.symbol} available.` });
        return;
      }

      // Deduct cash from user
      const newCash = parseFloat((user.cash - totalCost).toFixed(2));
      await db.update(users).set({ cash: newCash }).where(eq(users.id, user.id));

      // Update or create portfolio holding
      const portList = await db.select().from(portfolios).where(and(eq(portfolios.userId, user.id), eq(portfolios.companyId, comp.id)));

      if (portList.length > 0) {
        const port = portList[0];
        const newShares = port.shares + shareCount;
        // Weighted average purchase price calculation
        const totalValueOld = port.shares * port.averagePrice;
        const newAvgPrice = parseFloat(((totalValueOld + totalCost) / newShares).toFixed(2));
        await db.update(portfolios).set({ shares: newShares, averagePrice: newAvgPrice }).where(eq(portfolios.id, port.id));
      } else {
        const newPort: NewPortfolio = {
          id: `port-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: user.id,
          companyId: comp.id,
          shares: shareCount,
          averagePrice: execPrice,
        };
        await db.insert(portfolios).values(newPort);
      }
    } else if (type === 'SELL') {
      const portList = await db.select().from(portfolios).where(and(eq(portfolios.userId, user.id), eq(portfolios.companyId, comp.id)));

      if (portList.length === 0 || portList[0].shares < shareCount) {
        const owned = portList.length > 0 ? portList[0].shares : 0;
        res.status(400).json({ error: `You do not own enough shares to sell. Owned: ${owned}, Requested: ${shareCount}` });
        return;
      }

      const port = portList[0];
      const newShares = port.shares - shareCount;
      const newCash = parseFloat((user.cash + totalCost).toFixed(2));
      await db.update(users).set({ cash: newCash }).where(eq(users.id, user.id));

      if (newShares === 0) {
        await db.delete(portfolios).where(eq(portfolios.id, port.id));
      } else {
        await db.update(portfolios).set({ shares: newShares }).where(eq(portfolios.id, port.id));
      }
    } else {
      res.status(400).json({ error: 'Invalid trade type. Must be BUY or SELL.' });
      return;
    }

    // Record transaction
    const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const newTx: NewTransaction = {
      id: txId,
      userId: user.id,
      companyId: comp.id,
      type,
      shares: shareCount,
      price: execPrice,
      totalAmount: totalCost,
      timestamp: Date.now(),
    };
    await db.insert(transactions).values(newTx);

    // Apply supply & demand impact on market price
    await applyTradeSupplyDemandImpact(comp.id, type as 'BUY' | 'SELL', shareCount);

    // Recalculate and broadcast leaderboard
    const latestLeaderboard = await calculateLeaderboard();
    broadcastLeaderboard(latestLeaderboard);

    // Broadcast trade ticker alert
    broadcastTradeExecuted({
      id: txId,
      teamName: user.teamName,
      symbol: comp.symbol,
      type,
      shares: shareCount,
      price: execPrice,
      totalAmount: totalCost,
      timestamp: newTx.timestamp,
    });

    res.status(200).json({
      message: `Trade executed successfully: ${type} ${shareCount} shares of ${comp.symbol} @ $${execPrice}`,
      transaction: newTx,
    });
  } catch (error) {
    console.error('Trade execution error:', error);
    res.status(500).json({ error: 'Internal server error executing trade.' });
  }
};
