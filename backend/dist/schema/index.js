"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameState = exports.newsEvents = exports.transactions = exports.portfolios = exports.companies = exports.users = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
exports.users = (0, sqlite_core_1.sqliteTable)('users', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    username: (0, sqlite_core_1.text)('username').notNull().unique(),
    password: (0, sqlite_core_1.text)('password').notNull(),
    role: (0, sqlite_core_1.text)('role').notNull().default('TRADER'), // 'ADMIN' or 'TRADER'
    teamName: (0, sqlite_core_1.text)('team_name').notNull(),
    cash: (0, sqlite_core_1.real)('cash').notNull().default(100000.0),
    createdAt: (0, sqlite_core_1.integer)('created_at').notNull(),
});
exports.companies = (0, sqlite_core_1.sqliteTable)('companies', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    symbol: (0, sqlite_core_1.text)('symbol').notNull().unique(),
    sector: (0, sqlite_core_1.text)('sector').notNull(), // 'Technology', 'Healthcare', 'Banking', 'Energy', etc.
    description: (0, sqlite_core_1.text)('description').notNull(),
    initialPrice: (0, sqlite_core_1.real)('initial_price').notNull(),
    currentPrice: (0, sqlite_core_1.real)('current_price').notNull(),
    previousPrice: (0, sqlite_core_1.real)('previous_price').notNull(),
    totalShares: (0, sqlite_core_1.integer)('total_shares').notNull(),
    availableShares: (0, sqlite_core_1.integer)('available_shares').notNull(),
    volatility: (0, sqlite_core_1.real)('volatility').notNull().default(0.02), // 2% default volatility
    createdAt: (0, sqlite_core_1.integer)('created_at').notNull(),
});
exports.portfolios = (0, sqlite_core_1.sqliteTable)('portfolios', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    userId: (0, sqlite_core_1.text)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    companyId: (0, sqlite_core_1.text)('company_id').notNull().references(() => exports.companies.id, { onDelete: 'cascade' }),
    shares: (0, sqlite_core_1.integer)('shares').notNull().default(0),
    averagePrice: (0, sqlite_core_1.real)('average_price').notNull().default(0.0),
});
exports.transactions = (0, sqlite_core_1.sqliteTable)('transactions', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    userId: (0, sqlite_core_1.text)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    companyId: (0, sqlite_core_1.text)('company_id').notNull().references(() => exports.companies.id, { onDelete: 'cascade' }),
    type: (0, sqlite_core_1.text)('type').notNull(), // 'BUY' or 'SELL'
    shares: (0, sqlite_core_1.integer)('shares').notNull(),
    price: (0, sqlite_core_1.real)('price').notNull(),
    totalAmount: (0, sqlite_core_1.real)('total_amount').notNull(),
    timestamp: (0, sqlite_core_1.integer)('timestamp').notNull(),
});
exports.newsEvents = (0, sqlite_core_1.sqliteTable)('news_events', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    headline: (0, sqlite_core_1.text)('headline').notNull(),
    description: (0, sqlite_core_1.text)('description').notNull(),
    category: (0, sqlite_core_1.text)('category').notNull(), // 'Company News', 'Economic News', 'Technology', etc.
    severity: (0, sqlite_core_1.text)('severity').notNull(), // 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    affectedSector: (0, sqlite_core_1.text)('affected_sector'), // null if global or single company
    affectedCompanyId: (0, sqlite_core_1.text)('affected_company_id'), // null if sector or global
    expectedImpact: (0, sqlite_core_1.real)('expected_impact').notNull(), // percentage e.g. 12.0 for +12%
    timestamp: (0, sqlite_core_1.integer)('timestamp').notNull(),
    active: (0, sqlite_core_1.integer)('active').notNull().default(1), // 1 for active impact, 0 for decayed
});
exports.gameState = (0, sqlite_core_1.sqliteTable)('game_state', {
    id: (0, sqlite_core_1.text)('id').primaryKey(), // singleton: 'current'
    round: (0, sqlite_core_1.integer)('round').notNull().default(0), // 0: Not started, 1: Round 1, 2: Round 2, 3: Round 3
    roundName: (0, sqlite_core_1.text)('round_name').notNull().default('Competition Ready - Awaiting Start'),
    status: (0, sqlite_core_1.text)('status').notNull().default('STOPPED'), // 'ACTIVE', 'PAUSED', 'STOPPED', 'ENDED'
    marketTrend: (0, sqlite_core_1.text)('market_trend').notNull().default('STABLE'), // 'STABLE', 'BULLISH', 'BEARISH', 'CRASHING', 'BOOMING'
});
