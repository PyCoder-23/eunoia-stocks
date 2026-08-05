import { Request, Response } from 'express';
import { db } from '../config/db.js';
import { users, companies, portfolios, transactions, gameState, orders, NewPortfolio, NewTransaction, NewOrder } from '../schema/index.js';
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
      res.status(400).json({ error: 'Invalid trade parameters: companyId, type, and positive share count required.' });
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
        res.status(400).json({ error: `Insufficient funds. Required: ₹${totalCost.toLocaleString('en-IN')}, Available: ₹${user.cash.toLocaleString('en-IN')}` });
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
    } else if (type === 'SHORT_SELL') {
      const newCash = parseFloat((user.cash + totalCost).toFixed(2));
      await db.update(users).set({ cash: newCash }).where(eq(users.id, user.id));

      const portList = await db.select().from(portfolios).where(and(eq(portfolios.userId, user.id), eq(portfolios.companyId, comp.id)));
      if (portList.length > 0) {
        const port = portList[0];
        const newShortShares = port.shortShares + shareCount;
        const totalValueOld = port.shortShares * port.shortAveragePrice;
        const newAvgPrice = parseFloat(((totalValueOld + totalCost) / newShortShares).toFixed(2));
        await db.update(portfolios).set({ shortShares: newShortShares, shortAveragePrice: newAvgPrice }).where(eq(portfolios.id, port.id));
      } else {
        const newPort: NewPortfolio = {
          id: `port-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: user.id,
          companyId: comp.id,
          shares: 0,
          averagePrice: 0,
          shortShares: shareCount,
          shortAveragePrice: execPrice,
        };
        await db.insert(portfolios).values(newPort);
      }
    } else if (type === 'COVER_SHORT') {
      const portList = await db.select().from(portfolios).where(and(eq(portfolios.userId, user.id), eq(portfolios.companyId, comp.id)));
      
      if (portList.length === 0 || portList[0].shortShares < shareCount) {
        const shortOwned = portList.length > 0 ? portList[0].shortShares : 0;
        res.status(400).json({ error: `You do not have enough shorted shares to cover. Shorted: ${shortOwned}, Requested: ${shareCount}` });
        return;
      }
      
      if (user.cash < totalCost) {
         res.status(400).json({ error: `Insufficient funds to cover short. Required: ₹${totalCost.toLocaleString('en-IN')}, Available: ₹${user.cash.toLocaleString('en-IN')}` });
         return;
      }

      const port = portList[0];
      const newShortShares = port.shortShares - shareCount;
      const newCash = parseFloat((user.cash - totalCost).toFixed(2));
      await db.update(users).set({ cash: newCash }).where(eq(users.id, user.id));

      if (newShortShares === 0 && port.shares === 0) {
        await db.delete(portfolios).where(eq(portfolios.id, port.id));
      } else {
        await db.update(portfolios).set({ shortShares: newShortShares }).where(eq(portfolios.id, port.id));
      }
    } else {
      res.status(400).json({ error: 'Invalid trade type. Must be BUY, SELL, SHORT_SELL, or COVER_SHORT.' });
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

    // Apply supply & demand impact on market price (only BUY/SELL affect it? Or SHORT too? Let's say all affect it)
    // BUY/COVER_SHORT increases demand (price goes up), SELL/SHORT_SELL increases supply (price goes down)
    const impactType = (type === 'BUY' || type === 'COVER_SHORT') ? 'BUY' : 'SELL';
    await applyTradeSupplyDemandImpact(comp.id, impactType as 'BUY' | 'SELL', shareCount);

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
      message: `Trade executed successfully: ${type} ${shareCount} shares of ${comp.symbol} @ ₹${execPrice}`,
      transaction: newTx,
    });
  } catch (error) {
    console.error('Trade execution error:', error);
    res.status(500).json({ error: 'Internal server error executing trade.' });
  }
};

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { companyId, type, shares, targetPrice } = req.body;
    const shareCount = parseInt(shares, 10);
    const target = parseFloat(targetPrice);

    if (!companyId || !type || isNaN(shareCount) || shareCount <= 0 || isNaN(target) || target <= 0) {
      res.status(400).json({ error: 'Invalid order parameters.' });
      return;
    }

    if (!['LIMIT_BUY', 'LIMIT_SELL', 'STOP_LOSS'].includes(type)) {
      res.status(400).json({ error: 'Invalid order type.' });
      return;
    }

    const compList = await db.select().from(companies).where(eq(companies.id, companyId));
    if (compList.length === 0) {
      res.status(404).json({ error: 'Stock symbol not found.' });
      return;
    }
    
    const newOrder: NewOrder = {
      id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: req.user.id,
      companyId: compList[0].id,
      type,
      shares: shareCount,
      targetPrice: target,
      timestamp: Date.now()
    };
    
    await db.insert(orders).values(newOrder);

    res.status(201).json({
      message: `${type} order placed successfully for ${shareCount} shares at ₹${target}`,
      order: newOrder
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error placing order.' });
  }
};

export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { orderId } = req.params;
    
    const orderList = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, req.user.id)));
    if (orderList.length === 0) {
      res.status(404).json({ error: 'Order not found or you do not have permission to cancel it.' });
      return;
    }

    if (orderList[0].status !== 'PENDING') {
      res.status(400).json({ error: `Cannot cancel order with status ${orderList[0].status}` });
      return;
    }

    await db.update(orders).set({ status: 'CANCELLED' }).where(eq(orders.id, orderId));

    res.status(200).json({ message: 'Order cancelled successfully.' });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ error: 'Internal server error cancelling order.' });
  }
};

export const getPendingOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const userOrders = await db.select({
      id: orders.id,
      companyId: orders.companyId,
      symbol: companies.symbol,
      type: orders.type,
      shares: orders.shares,
      targetPrice: orders.targetPrice,
      status: orders.status,
      timestamp: orders.timestamp
    })
    .from(orders)
    .innerJoin(companies, eq(orders.companyId, companies.id))
    .where(and(eq(orders.userId, req.user.id), eq(orders.status, 'PENDING')))
    .orderBy(orders.timestamp);
    
    res.status(200).json(userOrders);
  } catch (error) {
    console.error('Get pending orders error:', error);
    res.status(500).json({ error: 'Internal server error fetching orders.' });
  }
};
