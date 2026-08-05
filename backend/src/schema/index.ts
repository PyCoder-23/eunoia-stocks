import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  role: text('role').notNull().default('TRADER'), // 'ADMIN' or 'TRADER'
  teamName: text('team_name').notNull(),
  cash: real('cash').notNull().default(1000000.0), // 10 Lakh starting cash
  createdAt: integer('created_at').notNull(),
});

export const companies = sqliteTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull().unique(),
  sector: text('sector').notNull(), // 'Technology', 'Healthcare', 'Banking', 'Energy', etc.
  description: text('description').notNull(),
  initialPrice: real('initial_price').notNull(),
  currentPrice: real('current_price').notNull(),
  previousPrice: real('previous_price').notNull(),
  totalShares: integer('total_shares').notNull(),
  availableShares: integer('available_shares').notNull(),
  volatility: real('volatility').notNull().default(0.02), // 2% default volatility
  createdAt: integer('created_at').notNull(),
});

export const portfolios = sqliteTable('portfolios', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  shares: integer('shares').notNull().default(0),
  averagePrice: real('average_price').notNull().default(0.0),
  shortShares: integer('short_shares').notNull().default(0),
  shortAveragePrice: real('short_average_price').notNull().default(0.0),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'BUY' or 'SELL'
  shares: integer('shares').notNull(),
  price: real('price').notNull(),
  totalAmount: real('total_amount').notNull(),
  timestamp: integer('timestamp').notNull(),
});

export const newsEvents = sqliteTable('news_events', {
  id: text('id').primaryKey(),
  headline: text('headline').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // 'Company News', 'Economic News', 'Technology', etc.
  severity: text('severity').notNull(), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  affectedSector: text('affected_sector'), // null if global or single company
  affectedCompanyId: text('affected_company_id'), // null if sector or global
  expectedImpact: real('expected_impact').notNull(), // percentage e.g. 12.0 for +12%
  timestamp: integer('timestamp').notNull(),
  active: integer('active').notNull().default(1), // 1 for active impact, 0 for decayed
});

export const gameState = sqliteTable('game_state', {
  id: text('id').primaryKey(), // singleton: 'current'
  round: integer('round').notNull().default(0), // 0: Not started, 1: Round 1, 2: Round 2, 3: Round 3
  roundName: text('round_name').notNull().default('Competition Ready - Awaiting Start'),
  status: text('status').notNull().default('STOPPED'), // 'ACTIVE', 'PAUSED', 'STOPPED', 'ENDED'
  marketTrend: text('market_trend').notNull().default('STABLE'), // 'STABLE', 'BULLISH', 'BEARISH', 'CRASHING', 'BOOMING'
});

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: text('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'LIMIT_BUY', 'LIMIT_SELL', 'STOP_LOSS'
  shares: integer('shares').notNull(),
  targetPrice: real('target_price').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING', 'EXECUTED', 'CANCELLED', 'FAILED'
  timestamp: integer('timestamp').notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Portfolio = typeof portfolios.$inferSelect;
export type NewPortfolio = typeof portfolios.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type NewsEvent = typeof newsEvents.$inferSelect;
export type NewNewsEvent = typeof newsEvents.$inferInsert;
export type GameState = typeof gameState.$inferSelect;
export type NewGameState = typeof gameState.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
