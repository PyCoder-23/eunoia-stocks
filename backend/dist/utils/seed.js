"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTablesIfNotExist = createTablesIfNotExist;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_js_1 = require("../config/db.js");
const schema = __importStar(require("../schema/index.js"));
async function createTablesIfNotExist() {
    console.log('Creating database tables if they do not exist...');
    await db_js_1.client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'TRADER',
      team_name TEXT NOT NULL,
      cash REAL NOT NULL DEFAULT 100000.0,
      created_at INTEGER NOT NULL
    );
  `);
    await db_js_1.client.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      symbol TEXT NOT NULL UNIQUE,
      sector TEXT NOT NULL,
      description TEXT NOT NULL,
      initial_price REAL NOT NULL,
      current_price REAL NOT NULL,
      previous_price REAL NOT NULL,
      total_shares INTEGER NOT NULL,
      available_shares INTEGER NOT NULL,
      volatility REAL NOT NULL DEFAULT 0.02,
      created_at INTEGER NOT NULL
    );
  `);
    await db_js_1.client.execute(`
    CREATE TABLE IF NOT EXISTS portfolios (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      shares INTEGER NOT NULL DEFAULT 0,
      average_price REAL NOT NULL DEFAULT 0.0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);
    await db_js_1.client.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      type TEXT NOT NULL,
      shares INTEGER NOT NULL,
      price REAL NOT NULL,
      total_amount REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
    );
  `);
    await db_js_1.client.execute(`
    CREATE TABLE IF NOT EXISTS news_events (
      id TEXT PRIMARY KEY,
      headline TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      affected_sector TEXT,
      affected_company_id TEXT,
      expected_impact REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
  `);
    await db_js_1.client.execute(`
    CREATE TABLE IF NOT EXISTS game_state (
      id TEXT PRIMARY KEY,
      round INTEGER NOT NULL DEFAULT 0,
      round_name TEXT NOT NULL DEFAULT 'Competition Ready - Awaiting Start',
      status TEXT NOT NULL DEFAULT 'STOPPED',
      market_trend TEXT NOT NULL DEFAULT 'STABLE'
    );
  `);
    console.log('Tables verified/created successfully.');
}
async function seed() {
    try {
        await createTablesIfNotExist();
        console.log('Clearing existing data for a fresh seed...');
        await db_js_1.client.execute('DELETE FROM transactions;');
        await db_js_1.client.execute('DELETE FROM portfolios;');
        await db_js_1.client.execute('DELETE FROM news_events;');
        await db_js_1.client.execute('DELETE FROM companies;');
        await db_js_1.client.execute('DELETE FROM users;');
        await db_js_1.client.execute('DELETE FROM game_state;');
        const now = Date.now();
        const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
        const traderPassword = await bcryptjs_1.default.hash('password123', 10);
        console.log('Seeding Users (Admin and 6 Demo Teams)...');
        const usersData = [
            {
                id: 'user-admin',
                username: 'admin',
                password: adminPassword,
                role: 'ADMIN',
                teamName: 'Admin Control Center',
                cash: 1000000.0,
                createdAt: now,
            },
            {
                id: 'user-team-alpha',
                username: 'team_alpha',
                password: traderPassword,
                role: 'TRADER',
                teamName: 'Alpha Capital',
                cash: 100000.0,
                createdAt: now,
            },
            {
                id: 'user-team-beta',
                username: 'team_beta',
                password: traderPassword,
                role: 'TRADER',
                teamName: 'Beta Ventures',
                cash: 100000.0,
                createdAt: now,
            },
            {
                id: 'user-team-gamma',
                username: 'team_gamma',
                password: traderPassword,
                role: 'TRADER',
                teamName: 'Gamma Hedge Fund',
                cash: 100000.0,
                createdAt: now,
            },
            {
                id: 'user-team-delta',
                username: 'team_delta',
                password: traderPassword,
                role: 'TRADER',
                teamName: 'Delta Investments',
                cash: 100000.0,
                createdAt: now,
            },
            {
                id: 'user-team-epsilon',
                username: 'team_epsilon',
                password: traderPassword,
                role: 'TRADER',
                teamName: 'Epsilon Traders',
                cash: 100000.0,
                createdAt: now,
            },
            {
                id: 'user-team-zeta',
                username: 'team_zeta',
                password: traderPassword,
                role: 'TRADER',
                teamName: 'Zeta Financial Group',
                cash: 100000.0,
                createdAt: now,
            },
        ];
        for (const u of usersData) {
            await db_js_1.db.insert(schema.users).values(u);
        }
        console.log('Seeding 12 Realistic Companies Across Sectors...');
        const companiesData = [
            // Technology
            {
                id: 'comp-apex',
                name: 'Apex Technologies',
                symbol: 'APEX',
                sector: 'Technology',
                description: 'Global leader in AI infrastructure and high-performance quantum semiconductors.',
                initialPrice: 150.0,
                currentPrice: 150.0,
                previousPrice: 150.0,
                totalShares: 50000,
                availableShares: 50000,
                volatility: 0.025,
                createdAt: now,
            },
            {
                id: 'comp-cybr',
                name: 'CyberShield AI',
                symbol: 'CYBR',
                sector: 'Technology',
                description: 'Next-gen enterprise cybersecurity solutions powered by autonomous threat detection.',
                initialPrice: 95.0,
                currentPrice: 95.0,
                previousPrice: 95.0,
                totalShares: 80000,
                availableShares: 80000,
                volatility: 0.03,
                createdAt: now,
            },
            {
                id: 'comp-qntm',
                name: 'Quantum Compute Corp',
                symbol: 'QNTM',
                sector: 'Technology',
                description: 'Pioneering commercial quantum cloud computing processors for financial modeling.',
                initialPrice: 210.0,
                currentPrice: 210.0,
                previousPrice: 210.0,
                totalShares: 40000,
                availableShares: 40000,
                volatility: 0.035,
                createdAt: now,
            },
            // Healthcare
            {
                id: 'comp-zent',
                name: 'Zenith Pharma',
                symbol: 'ZENT',
                sector: 'Healthcare',
                description: 'Innovative biotechnology firm developing breakthrough mRNA immunotherapies.',
                initialPrice: 120.0,
                currentPrice: 120.0,
                previousPrice: 120.0,
                totalShares: 60000,
                availableShares: 60000,
                volatility: 0.02,
                createdAt: now,
            },
            {
                id: 'comp-biox',
                name: 'BioGenetics Lab',
                symbol: 'BIOX',
                sector: 'Healthcare',
                description: 'Specializing in genomic sequencing, personalized diagnostics, and gene therapy.',
                initialPrice: 65.0,
                currentPrice: 65.0,
                previousPrice: 65.0,
                totalShares: 100000,
                availableShares: 100000,
                volatility: 0.025,
                createdAt: now,
            },
            {
                id: 'comp-medi',
                name: 'MedPulse Systems',
                symbol: 'MEDI',
                sector: 'Healthcare',
                description: 'Leading manufacturer of robotic surgery devices and smart patient monitoring tech.',
                initialPrice: 85.0,
                currentPrice: 85.0,
                previousPrice: 85.0,
                totalShares: 75000,
                availableShares: 75000,
                volatility: 0.018,
                createdAt: now,
            },
            // Energy
            {
                id: 'comp-vnrg',
                name: 'Vanguard Energy',
                symbol: 'VNRG',
                sector: 'Energy',
                description: 'Integrated energy corporation pioneering next-generation fusion and renewable grids.',
                initialPrice: 110.0,
                currentPrice: 110.0,
                previousPrice: 110.0,
                totalShares: 70000,
                availableShares: 70000,
                volatility: 0.022,
                createdAt: now,
            },
            {
                id: 'comp-solr',
                name: 'Helios Solar Power',
                symbol: 'SOLR',
                sector: 'Energy',
                description: 'Global provider of high-efficiency perovskite solar cells and grid storage batteries.',
                initialPrice: 45.0,
                currentPrice: 45.0,
                previousPrice: 45.0,
                totalShares: 120000,
                availableShares: 120000,
                volatility: 0.028,
                createdAt: now,
            },
            {
                id: 'comp-petr',
                name: 'PetroGlobal Corp',
                symbol: 'PETR',
                sector: 'Energy',
                description: 'Traditional petrochemical producer with expanding LNG and offshore drilling operations.',
                initialPrice: 80.0,
                currentPrice: 80.0,
                previousPrice: 80.0,
                totalShares: 90000,
                availableShares: 90000,
                volatility: 0.02,
                createdAt: now,
            },
            // Banking & Finance
            {
                id: 'comp-cent',
                name: 'Central Trust Bank',
                symbol: 'CENT',
                sector: 'Banking',
                description: 'Multinational retail and commercial banking institution with extensive wealth management.',
                initialPrice: 140.0,
                currentPrice: 140.0,
                previousPrice: 140.0,
                totalShares: 55000,
                availableShares: 55000,
                volatility: 0.015,
                createdAt: now,
            },
            {
                id: 'comp-glbn',
                name: 'Global Financial Group',
                symbol: 'GLBN',
                sector: 'Banking',
                description: 'Tier-1 investment bank dominating mergers, acquisitions, and algorithmic trading.',
                initialPrice: 175.0,
                currentPrice: 175.0,
                previousPrice: 175.0,
                totalShares: 45000,
                availableShares: 45000,
                volatility: 0.022,
                createdAt: now,
            },
            {
                id: 'comp-prsc',
                name: 'Prosperity Capital',
                symbol: 'PRSC',
                sector: 'Banking',
                description: 'Modern fintech bank offering decentralized asset custody and institutional crypto lending.',
                initialPrice: 90.0,
                currentPrice: 90.0,
                previousPrice: 90.0,
                totalShares: 85000,
                availableShares: 85000,
                volatility: 0.03,
                createdAt: now,
            },
        ];
        for (const c of companiesData) {
            await db_js_1.db.insert(schema.companies).values(c);
        }
        console.log('Seeding Game State...');
        await db_js_1.db.insert(schema.gameState).values({
            id: 'current',
            round: 0,
            roundName: 'Ready to Start - Awaiting Admin Command',
            status: 'STOPPED',
            marketTrend: 'STABLE',
        });
        console.log('✅ Database seeding completed successfully! Admin login: admin / admin123');
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}
seed();
