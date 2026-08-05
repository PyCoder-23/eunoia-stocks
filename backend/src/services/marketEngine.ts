import { db } from '../config/db.js';
import { companies, gameState, users, portfolios, orders, transactions, Company, NewPortfolio, NewTransaction } from '../schema/index.js';
import { eq, and } from 'drizzle-orm';
import { broadcastMarketUpdate, broadcastLeaderboard, broadcastTradeExecuted } from '../sockets/socketHandler.js';
import { activeNewsModifiers } from './newsEngine.js';

// In-memory price history for candlestick/line charts (last 60 ticks per stock)
const priceHistory: Map<string, Array<{ time: string; price: number }>> = new Map();
let tickInterval: NodeJS.Timeout | null = null;

export const startMarketEngine = (): void => {
  if (tickInterval) clearInterval(tickInterval);

  console.log('📈 Starting Market Mayhem Real-Time Simulation Engine (Tick: 4000ms)...');

  tickInterval = setInterval(async () => {
    try {
      await processMarketTick();
      await processPendingOrders(); // Check orders after prices update
    } catch (error) {
      console.error('❌ Error in market tick loop:', error);
    }
  }, 4000);
};

export const stopMarketEngine = (): void => {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  console.log('🛑 Market Engine stopped.');
};

const processMarketTick = async (): Promise<void> => {
  const stateList = await db.select().from(gameState).where(eq(gameState.id, 'current'));
  if (stateList.length === 0) return;

  const currentGameState = stateList[0];
  if (currentGameState.status !== 'ACTIVE') {
    return; // Do not update prices when paused or stopped
  }

  const allCompanies = await db.select().from(companies);
  const now = Date.now();
  const timeStr = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const updatedCompanies: Company[] = [];

  for (const c of allCompanies) {
    let priceChangePercent = 0.0;

    if (currentGameState.round === 1) {
      // Round 1: Stable market, small random fluctuations (-1.5% to +1.5%)
      const randomWalk = (Math.random() - 0.5) * 2 * c.volatility;
      // Gentle mean reversion toward initial price
      const meanReversion = (c.initialPrice - c.currentPrice) / c.initialPrice * 0.05;
      priceChangePercent = randomWalk + meanReversion;
    } else if (currentGameState.round === 2) {
      // Round 2: News & Market Reaction
      const randomWalk = (Math.random() - 0.48) * 2 * (c.volatility * 1.2); // slight bullish bias
      let newsBoost = 0.0;

      // Check active news modifiers
      const compKey = `COMP_${c.id}`;
      const sectorKey = `SECTOR_${c.sector}`;
      const globalKey = 'GLOBAL';

      [compKey, sectorKey, globalKey].forEach(key => {
        if (activeNewsModifiers.has(key)) {
          const mod = activeNewsModifiers.get(key)!;
          if (now < mod.expiresAt) {
            // Apply directional drift (e.g. +12% impact spread over ~20 ticks -> +0.6% per tick)
            newsBoost += mod.impact / 25.0;
          } else {
            activeNewsModifiers.delete(key);
          }
        }
      });

      priceChangePercent = randomWalk + (newsBoost / 100.0);
    } else if (currentGameState.round === 3) {
      // Round 3: Market Chaos! Double volatility, sudden turbulent swings
      const randomWalk = (Math.random() - 0.5) * 2 * (c.volatility * 2.5);
      let newsBoost = 0.0;
      if (activeNewsModifiers.has('GLOBAL')) {
        const mod = activeNewsModifiers.get('GLOBAL')!;
        if (now < mod.expiresAt) newsBoost += mod.impact / 15.0;
      }
      priceChangePercent = randomWalk + (newsBoost / 100.0);
    } else {
      continue;
    }

    // Apply price change
    let newPrice = c.currentPrice * (1 + priceChangePercent);
    // Ensure prices never become negative or drop below $1.00
    if (newPrice < 1.0) newPrice = 1.0;
    newPrice = parseFloat(newPrice.toFixed(2));

    await db.update(companies)
      .set({ previousPrice: c.currentPrice, currentPrice: newPrice })
      .where(eq(companies.id, c.id));

    const updated = { ...c, previousPrice: c.currentPrice, currentPrice: newPrice };
    updatedCompanies.push(updated);

    // Record price history
    if (!priceHistory.has(c.id)) {
      priceHistory.set(c.id, [{ time: timeStr, price: c.initialPrice }]);
    }
    const history = priceHistory.get(c.id)!;
    history.push({ time: timeStr, price: newPrice });
    if (history.length > 60) history.shift(); // Keep last 60 ticks
  }

  // Broadcast live market update to all clients
  broadcastMarketUpdate(updatedCompanies);

  // Recalculate and broadcast leaderboard
  const leaderboardData = await calculateLeaderboard();
  broadcastLeaderboard(leaderboardData);
};

export const applyTradeSupplyDemandImpact = async (companyId: string, type: 'BUY' | 'SELL', shares: number): Promise<void> => {
  const compList = await db.select().from(companies).where(eq(companies.id, companyId));
  if (compList.length === 0) return;

  const comp = compList[0];
  // Calculate price impact: e.g. buying 1000 shares out of 50000 total = 2% of float -> +0.8% price boost
  const floatRatio = shares / comp.totalShares;
  const impactMultiplier = type === 'BUY' ? 0.35 : -0.35;
  const priceChangePercent = floatRatio * impactMultiplier;

  let newPrice = comp.currentPrice * (1 + priceChangePercent);
  if (newPrice < 1.0) newPrice = 1.0;
  newPrice = parseFloat(newPrice.toFixed(2));

  let newAvailable = comp.availableShares + (type === 'BUY' ? -shares : shares);
  if (newAvailable < 0) newAvailable = 0;
  if (newAvailable > comp.totalShares) newAvailable = comp.totalShares;

  await db.update(companies)
    .set({ previousPrice: comp.currentPrice, currentPrice: newPrice, availableShares: newAvailable })
    .where(eq(companies.id, companyId));

  const allComps = await db.select().from(companies);
  broadcastMarketUpdate(allComps);
};

export const calculateLeaderboard = async (): Promise<any[]> => {
  const allUsers = await db.select().from(users).where(eq(users.role, 'TRADER'));
  const allCompanies = await db.select().from(companies);
  const allPortfolios = await db.select().from(portfolios);

  const compMap = new Map<string, Company>();
  allCompanies.forEach(c => compMap.set(c.id, c));

  const leaderboard = allUsers.map(u => {
    const userPortfolios = allPortfolios.filter(p => p.userId === u.id);
    let portfolioValue = 0.0;
    let investedValue = 0.0;
    let shortLiabilities = 0.0;
    let shortProceeds = 0.0;

    userPortfolios.forEach(p => {
      const comp = compMap.get(p.companyId);
      if (comp) {
        if (p.shares > 0) {
          portfolioValue += p.shares * comp.currentPrice;
          investedValue += p.shares * p.averagePrice;
        }
        if (p.shortShares > 0) {
          shortLiabilities += p.shortShares * comp.currentPrice;
          shortProceeds += p.shortShares * p.shortAveragePrice;
        }
      }
    });

    const netWorth = u.cash + portfolioValue - shortLiabilities;
    const profitLoss = (portfolioValue - investedValue) + (shortProceeds - shortLiabilities);

    return {
      userId: u.id,
      teamName: u.teamName,
      username: u.username,
      cash: parseFloat(u.cash.toFixed(2)),
      portfolioValue: parseFloat(portfolioValue.toFixed(2)),
      netWorth: parseFloat(netWorth.toFixed(2)),
      profitLoss: parseFloat(profitLoss.toFixed(2)),
    };
  });

  // Sort descending by Net Worth
  leaderboard.sort((a, b) => b.netWorth - a.netWorth);

  // Assign ranks
  return leaderboard.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
};

export const getPriceHistory = (companyId: string): Array<{ time: string; price: number }> => {
  return priceHistory.get(companyId) || [];
};

export const processPendingOrders = async (): Promise<void> => {
  const pendingOrders = await db.select().from(orders).where(eq(orders.status, 'PENDING'));
  if (pendingOrders.length === 0) return;

  const allComps = await db.select().from(companies);
  const compMap = new Map<string, Company>();
  allComps.forEach(c => compMap.set(c.id, c));

  for (const order of pendingOrders) {
    const comp = compMap.get(order.companyId);
    if (!comp) continue;

    let shouldExecute = false;
    let executionType: 'BUY' | 'SELL' = 'BUY';

    if (order.type === 'LIMIT_BUY') {
      if (comp.currentPrice <= order.targetPrice) {
        shouldExecute = true;
        executionType = 'BUY';
      }
    } else if (order.type === 'LIMIT_SELL') {
      if (comp.currentPrice >= order.targetPrice) {
        shouldExecute = true;
        executionType = 'SELL';
      }
    } else if (order.type === 'STOP_LOSS') {
      if (comp.currentPrice <= order.targetPrice) {
        shouldExecute = true;
        executionType = 'SELL';
      }
    }

    if (shouldExecute) {
      try {
        const userList = await db.select().from(users).where(eq(users.id, order.userId));
        if (userList.length === 0) continue;
        const user = userList[0];
        
        const execPrice = comp.currentPrice;
        const totalCost = parseFloat((execPrice * order.shares).toFixed(2));
        let failedReason = '';

        if (executionType === 'BUY') {
          if (user.cash < totalCost) failedReason = 'Insufficient funds';
          else if (comp.availableShares < order.shares) failedReason = 'Insufficient market liquidity';
        } else if (executionType === 'SELL') {
          const portList = await db.select().from(portfolios).where(and(eq(portfolios.userId, user.id), eq(portfolios.companyId, comp.id)));
          if (portList.length === 0 || portList[0].shares < order.shares) failedReason = 'Insufficient shares';
        }

        if (failedReason) {
          await db.update(orders).set({ status: 'FAILED' }).where(eq(orders.id, order.id));
          // Just broadcast the failure if needed, or silently mark as FAILED
          continue;
        }

        // Execute the trade
        if (executionType === 'BUY') {
          const newCash = parseFloat((user.cash - totalCost).toFixed(2));
          await db.update(users).set({ cash: newCash }).where(eq(users.id, user.id));
    
          const portList = await db.select().from(portfolios).where(and(eq(portfolios.userId, user.id), eq(portfolios.companyId, comp.id)));
          if (portList.length > 0) {
            const port = portList[0];
            const newShares = port.shares + order.shares;
            const totalValueOld = port.shares * port.averagePrice;
            const newAvgPrice = parseFloat(((totalValueOld + totalCost) / newShares).toFixed(2));
            await db.update(portfolios).set({ shares: newShares, averagePrice: newAvgPrice }).where(eq(portfolios.id, port.id));
          } else {
            const newPort: NewPortfolio = {
              id: `port-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              userId: user.id,
              companyId: comp.id,
              shares: order.shares,
              averagePrice: execPrice,
            };
            await db.insert(portfolios).values(newPort);
          }
        } else {
          const portList = await db.select().from(portfolios).where(and(eq(portfolios.userId, user.id), eq(portfolios.companyId, comp.id)));
          const port = portList[0];
          const newShares = port.shares - order.shares;
          const newCash = parseFloat((user.cash + totalCost).toFixed(2));
          await db.update(users).set({ cash: newCash }).where(eq(users.id, user.id));
    
          if (newShares === 0 && port.shortShares === 0) {
            await db.delete(portfolios).where(eq(portfolios.id, port.id));
          } else {
            await db.update(portfolios).set({ shares: newShares }).where(eq(portfolios.id, port.id));
          }
        }
        
        await db.update(orders).set({ status: 'EXECUTED' }).where(eq(orders.id, order.id));

        const txId = `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const newTx: NewTransaction = {
          id: txId,
          userId: user.id,
          companyId: comp.id,
          type: executionType,
          shares: order.shares,
          price: execPrice,
          totalAmount: totalCost,
          timestamp: Date.now(),
        };
        await db.insert(transactions).values(newTx);
        
        await applyTradeSupplyDemandImpact(comp.id, executionType, order.shares);

        broadcastTradeExecuted({
          id: txId,
          teamName: user.teamName,
          symbol: comp.symbol,
          type: executionType,
          shares: order.shares,
          price: execPrice,
          totalAmount: totalCost,
          timestamp: newTx.timestamp,
        });
      } catch (err) {
        console.error('Error executing pending order:', err);
      }
    }
  }
};
