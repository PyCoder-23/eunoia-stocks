import { db } from '../config/db.js';
import { companies, gameState, users, portfolios, Company } from '../schema/index.js';
import { eq } from 'drizzle-orm';
import { broadcastMarketUpdate, broadcastLeaderboard } from '../sockets/socketHandler.js';
import { activeNewsModifiers } from './newsEngine.js';

// In-memory price history for candlestick/line charts (last 60 ticks per stock)
const priceHistory: Map<string, Array<{ time: string; price: number }>> = new Map();
let tickInterval: NodeJS.Timeout | null = null;

export const startMarketEngine = (): void => {
  if (tickInterval) clearInterval(tickInterval);

  console.log('📈 Starting Market Mayhem Real-Time Simulation Engine (Tick: 3000ms)...');

  tickInterval = setInterval(async () => {
    try {
      await processMarketTick();
    } catch (error) {
      console.error('❌ Error in market tick loop:', error);
    }
  }, 3000);
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
    const userPortfolios = allPortfolios.filter(p => p.userId === u.id && p.shares > 0);
    let portfolioValue = 0.0;
    let investedValue = 0.0;

    userPortfolios.forEach(p => {
      const comp = compMap.get(p.companyId);
      if (comp) {
        portfolioValue += p.shares * comp.currentPrice;
        investedValue += p.shares * p.averagePrice;
      }
    });

    const netWorth = u.cash + portfolioValue;
    const profitLoss = portfolioValue - investedValue; // Unrealized profit/loss

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
