import bcrypt from 'bcryptjs';
import { client, db } from '../config/db.js';
import * as schema from '../schema/index.js';

async function createTablesIfNotExist() {
  console.log('Creating database tables if they do not exist...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'TRADER',
      team_name TEXT NOT NULL,
      cash REAL NOT NULL DEFAULT 1000000.0,
      created_at INTEGER NOT NULL
    );
  `);

  await client.execute(`
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

  await client.execute(`
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

  await client.execute(`
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

  await client.execute(`
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

  await client.execute(`
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

async function seed(exitOnComplete = true) {
  try {
    await createTablesIfNotExist();

    console.log('Clearing existing data for a fresh seed...');
    await client.execute('DELETE FROM transactions;');
    await client.execute('DELETE FROM portfolios;');
    await client.execute('DELETE FROM news_events;');
    await client.execute('DELETE FROM companies;');
    await client.execute('DELETE FROM users;');
    await client.execute('DELETE FROM game_state;');

    const now = Date.now();
    const accounts = [
      { username: 'admin_eunoia', plainPass: 'Admin@Eunoia2026!', role: 'ADMIN', teamName: 'Eunoia Administration' },
      { username: 'apex_capital', plainPass: 'ApexCap2026!', role: 'TRADER', teamName: 'Apex Capital Partners' },
      { username: 'vanguard_inv', plainPass: 'VanGuard$99', role: 'TRADER', teamName: 'Vanguard Investments' },
      { username: 'quantum_hedge', plainPass: 'QuantHedge#1', role: 'TRADER', teamName: 'Quantum Hedge Fund' },
      { username: 'stellar_wealth', plainPass: 'StellarWealth7', role: 'TRADER', teamName: 'Stellar Wealth Management' },
      { username: 'nexus_financial', plainPass: 'NexusFin@26', role: 'TRADER', teamName: 'Nexus Financial Group' },
      { username: 'horizon_equities', plainPass: 'HorizonEq8!', role: 'TRADER', teamName: 'Horizon Equities' },
      { username: 'pinnacle_asset', plainPass: 'PinnacleAsset#', role: 'TRADER', teamName: 'Pinnacle Asset Management' },
      { username: 'crestview_partners', plainPass: 'CrestView44$', role: 'TRADER', teamName: 'Crestview Partners' },
      { username: 'summit_trading', plainPass: 'SummitTrade2!', role: 'TRADER', teamName: 'Summit Trading Firm' },
      { username: 'meridian_capital', plainPass: 'MeridianCap88', role: 'TRADER', teamName: 'Meridian Capital' },
      { username: 'orion_investment', plainPass: 'OrionInvest$', role: 'TRADER', teamName: 'Orion Investment Bank' }
    ];

    console.log('Seeding Users (1 Admin and 11 Professional Teams)...');
    const usersData: schema.NewUser[] = [];
    
    for (const acc of accounts) {
      const hashedPassword = await bcrypt.hash(acc.plainPass, 10);
      usersData.push({
        id: `user-${acc.username}`,
        username: acc.username,
        password: hashedPassword,
        role: acc.role,
        teamName: acc.teamName,
        cash: 1000000.0,
        createdAt: now,
      });
    }

    for (const u of usersData) {
      await db.insert(schema.users).values(u);
    }

    console.log('Seeding Indian Companies...');
    const companiesData: schema.NewCompany[] = [
      // Banking and Finance
      {
        id: 'comp-hdfc', name: 'HDFC Bank', symbol: 'HDFCBANK', sector: 'Banking and Finance', description: "India's largest private sector bank by assets.",
        initialPrice: 1650.0, currentPrice: 1650.0, previousPrice: 1650.0, totalShares: 100000, availableShares: 100000, volatility: 0.015, createdAt: now,
      },
      {
        id: 'comp-icici', name: 'ICICI Bank', symbol: 'ICICIBANK', sector: 'Banking and Finance', description: 'Multinational banking and financial services company.',
        initialPrice: 1100.0, currentPrice: 1100.0, previousPrice: 1100.0, totalShares: 120000, availableShares: 120000, volatility: 0.018, createdAt: now,
      },
      {
        id: 'comp-sbi', name: 'State Bank of India', symbol: 'SBIN', sector: 'Banking and Finance', description: 'Largest Indian statutory body for banking and financial services.',
        initialPrice: 850.0, currentPrice: 850.0, previousPrice: 850.0, totalShares: 150000, availableShares: 150000, volatility: 0.02, createdAt: now,
      },
      {
        id: 'comp-bajajfin', name: 'Bajaj Finance', symbol: 'BAJFINANCE', sector: 'Banking and Finance', description: 'Leading non-banking financial company focused on lending and wealth management.',
        initialPrice: 6500.0, currentPrice: 6500.0, previousPrice: 6500.0, totalShares: 50000, availableShares: 50000, volatility: 0.025, createdAt: now,
      },
      {
        id: 'comp-lichsg', name: 'Lic Housing Finance', symbol: 'LICHSGFIN', sector: 'Banking and Finance', description: 'One of the largest housing finance companies in India.',
        initialPrice: 600.0, currentPrice: 600.0, previousPrice: 600.0, totalShares: 80000, availableShares: 80000, volatility: 0.022, createdAt: now,
      },
      // FMCG
      {
        id: 'comp-hul', name: 'Hindustan Unilever', symbol: 'HINDUNILVR', sector: 'FMCG', description: 'Largest fast-moving consumer goods company in India.',
        initialPrice: 2500.0, currentPrice: 2500.0, previousPrice: 2500.0, totalShares: 90000, availableShares: 90000, volatility: 0.012, createdAt: now,
      },
      {
        id: 'comp-itc', name: 'ITC', symbol: 'ITC', sector: 'FMCG', description: 'Conglomerate with diversified presence in FMCG, hotels, and packaging.',
        initialPrice: 420.0, currentPrice: 420.0, previousPrice: 420.0, totalShares: 200000, availableShares: 200000, volatility: 0.015, createdAt: now,
      },
      {
        id: 'comp-nestle', name: 'Nestlé India', symbol: 'NESTLEIND', sector: 'FMCG', description: 'Indian subsidiary of the global food and beverage giant.',
        initialPrice: 2450.0, currentPrice: 2450.0, previousPrice: 2450.0, totalShares: 40000, availableShares: 40000, volatility: 0.012, createdAt: now,
      },
      {
        id: 'comp-britannia', name: 'Britannia Industries', symbol: 'BRITANNIA', sector: 'FMCG', description: 'Major Indian food and beverage company known for biscuits and dairy.',
        initialPrice: 4800.0, currentPrice: 4800.0, previousPrice: 4800.0, totalShares: 45000, availableShares: 45000, volatility: 0.018, createdAt: now,
      },
      {
        id: 'comp-godrej', name: 'Godrej Consumer Products', symbol: 'GODREJCP', sector: 'FMCG', description: 'Leading emerging markets FMCG company focused on personal care.',
        initialPrice: 1200.0, currentPrice: 1200.0, previousPrice: 1200.0, totalShares: 75000, availableShares: 75000, volatility: 0.02, createdAt: now,
      },
      // Automobile
      {
        id: 'comp-maruti', name: 'Maruti Suzuki India', symbol: 'MARUTI', sector: 'Automobile', description: "India's largest passenger car manufacturer.",
        initialPrice: 12500.0, currentPrice: 12500.0, previousPrice: 12500.0, totalShares: 30000, availableShares: 30000, volatility: 0.025, createdAt: now,
      },
      {
        id: 'comp-mahindra', name: 'Mahindra & Mahindra', symbol: 'M&M', sector: 'Automobile', description: 'Multinational automotive manufacturing corporation, market leader in SUVs.',
        initialPrice: 2100.0, currentPrice: 2100.0, previousPrice: 2100.0, totalShares: 85000, availableShares: 85000, volatility: 0.022, createdAt: now,
      },
      {
        id: 'comp-tatamotors', name: 'Tata Motors', symbol: 'TATAMOTORS', sector: 'Automobile', description: 'Global automobile manufacturer of cars, utility vehicles, buses, and trucks.',
        initialPrice: 950.0, currentPrice: 950.0, previousPrice: 950.0, totalShares: 110000, availableShares: 110000, volatility: 0.03, createdAt: now,
      },
      {
        id: 'comp-bajajauto', name: 'Bajaj Auto', symbol: 'BAJAJ-AUTO', sector: 'Automobile', description: "World's third-largest manufacturer of motorcycles and largest three-wheeler maker.",
        initialPrice: 8200.0, currentPrice: 8200.0, previousPrice: 8200.0, totalShares: 40000, availableShares: 40000, volatility: 0.022, createdAt: now,
      },
      {
        id: 'comp-hero', name: 'Hero MotoCorp', symbol: 'HEROMOTOCO', sector: 'Automobile', description: "The world's largest manufacturer of two-wheelers.",
        initialPrice: 4500.0, currentPrice: 4500.0, previousPrice: 4500.0, totalShares: 55000, availableShares: 55000, volatility: 0.02, createdAt: now,
      },
      // Information Technology
      {
        id: 'comp-tcs', name: 'Tata Consultancy Services', symbol: 'TCS', sector: 'Information Technology', description: 'Global leader in IT services, consulting, and business solutions.',
        initialPrice: 3800.0, currentPrice: 3800.0, previousPrice: 3800.0, totalShares: 100000, availableShares: 100000, volatility: 0.015, createdAt: now,
      },
      {
        id: 'comp-infosys', name: 'Infosys', symbol: 'INFY', sector: 'Information Technology', description: 'Multinational corporation providing business consulting and IT services.',
        initialPrice: 1400.0, currentPrice: 1400.0, previousPrice: 1400.0, totalShares: 120000, availableShares: 120000, volatility: 0.018, createdAt: now,
      },
      {
        id: 'comp-hcl', name: 'HCLTech', symbol: 'HCLTECH', sector: 'Information Technology', description: 'Global technology company specializing in IT services and consulting.',
        initialPrice: 1300.0, currentPrice: 1300.0, previousPrice: 1300.0, totalShares: 95000, availableShares: 95000, volatility: 0.02, createdAt: now,
      },
      {
        id: 'comp-wipro', name: 'Wipro', symbol: 'WIPRO', sector: 'Information Technology', description: 'Leading technology services and consulting company.',
        initialPrice: 450.0, currentPrice: 450.0, previousPrice: 450.0, totalShares: 140000, availableShares: 140000, volatility: 0.022, createdAt: now,
      },
      {
        id: 'comp-techm', name: 'Tech Mahindra', symbol: 'TECHM', sector: 'Information Technology', description: 'Provides IT networking technology solutions and BPO to the telecommunications industry.',
        initialPrice: 1250.0, currentPrice: 1250.0, previousPrice: 1250.0, totalShares: 80000, availableShares: 80000, volatility: 0.025, createdAt: now,
      },
      // Defence
      {
        id: 'comp-hal', name: 'Hindustan Aeronautics', symbol: 'HAL', sector: 'Defence', description: 'State-owned aerospace and defence company.',
        initialPrice: 3200.0, currentPrice: 3200.0, previousPrice: 3200.0, totalShares: 60000, availableShares: 60000, volatility: 0.035, createdAt: now,
      },
      {
        id: 'comp-bel', name: 'Bharat Electronics', symbol: 'BEL', sector: 'Defence', description: 'Aerospace and defence electronics company.',
        initialPrice: 220.0, currentPrice: 220.0, previousPrice: 220.0, totalShares: 180000, availableShares: 180000, volatility: 0.03, createdAt: now,
      },
      {
        id: 'comp-bdl', name: 'Bharat Dynamics', symbol: 'BDL', sector: 'Defence', description: 'Manufacturer of ammunitions and missile systems.',
        initialPrice: 1750.0, currentPrice: 1750.0, previousPrice: 1750.0, totalShares: 50000, availableShares: 50000, volatility: 0.04, createdAt: now,
      },
      {
        id: 'comp-mazagon', name: 'Mazagon Dock', symbol: 'MAZDOCK', sector: 'Defence', description: 'Shipyard manufacturing warships and submarines for the Indian Navy.',
        initialPrice: 2100.0, currentPrice: 2100.0, previousPrice: 2100.0, totalShares: 45000, availableShares: 45000, volatility: 0.035, createdAt: now,
      },
      {
        id: 'comp-cochin', name: 'Cochin Shipyard', symbol: 'COCHINSHIP', sector: 'Defence', description: 'Largest shipbuilding and maintenance facility in India.',
        initialPrice: 1100.0, currentPrice: 1100.0, previousPrice: 1100.0, totalShares: 55000, availableShares: 55000, volatility: 0.032, createdAt: now,
      },
      // Healthcare
      {
        id: 'comp-sunpharma', name: 'Sun Pharma', symbol: 'SUNPHARMA', sector: 'Healthcare', description: 'Largest Indian pharmaceutical company by market capitalization.',
        initialPrice: 1550.0, currentPrice: 1550.0, previousPrice: 1550.0, totalShares: 90000, availableShares: 90000, volatility: 0.02, createdAt: now,
      },
      {
        id: 'comp-drreddy', name: "Dr. Reddy's Labs", symbol: 'DRREDDY', sector: 'Healthcare', description: 'Multinational pharmaceutical company manufacturing generic formulations.',
        initialPrice: 6200.0, currentPrice: 6200.0, previousPrice: 6200.0, totalShares: 35000, availableShares: 35000, volatility: 0.022, createdAt: now,
      },
      {
        id: 'comp-cipla', name: 'Cipla', symbol: 'CIPLA', sector: 'Healthcare', description: 'Leading pharmaceutical company focused on respiratory and cardiovascular products.',
        initialPrice: 1450.0, currentPrice: 1450.0, previousPrice: 1450.0, totalShares: 85000, availableShares: 85000, volatility: 0.018, createdAt: now,
      },
      {
        id: 'comp-lupin', name: 'Lupin', symbol: 'LUPIN', sector: 'Healthcare', description: 'Prominent generic pharmaceutical company with strong international presence.',
        initialPrice: 1650.0, currentPrice: 1650.0, previousPrice: 1650.0, totalShares: 70000, availableShares: 70000, volatility: 0.025, createdAt: now,
      },
      {
        id: 'comp-divis', name: "Divi's Laboratories", symbol: 'DIVISLAB', sector: 'Healthcare', description: 'Producer of active pharmaceutical ingredients (APIs) and intermediates.',
        initialPrice: 3800.0, currentPrice: 3800.0, previousPrice: 3800.0, totalShares: 45000, availableShares: 45000, volatility: 0.028, createdAt: now,
      },
      // Oil and Gas
      {
        id: 'comp-reliance', name: 'Reliance Industries', symbol: 'RELIANCE', sector: 'Oil and Gas', description: "India's largest conglomerate with major interests in energy and petrochemicals.",
        initialPrice: 2950.0, currentPrice: 2950.0, previousPrice: 2950.0, totalShares: 150000, availableShares: 150000, volatility: 0.015, createdAt: now,
      },
      {
        id: 'comp-ongc', name: 'ONGC', symbol: 'ONGC', sector: 'Oil and Gas', description: 'State-owned oil and gas explorer and producer.',
        initialPrice: 275.0, currentPrice: 275.0, previousPrice: 275.0, totalShares: 200000, availableShares: 200000, volatility: 0.02, createdAt: now,
      },
      {
        id: 'comp-ioc', name: 'Indian Oil Corp', symbol: 'IOC', sector: 'Oil and Gas', description: 'Largest commercial oil company in India.',
        initialPrice: 160.0, currentPrice: 160.0, previousPrice: 160.0, totalShares: 250000, availableShares: 250000, volatility: 0.018, createdAt: now,
      },
      {
        id: 'comp-bpcl', name: 'Bharat Petroleum', symbol: 'BPCL', sector: 'Oil and Gas', description: 'Major state-owned oil and gas refining and marketing company.',
        initialPrice: 600.0, currentPrice: 600.0, previousPrice: 600.0, totalShares: 110000, availableShares: 110000, volatility: 0.022, createdAt: now,
      },
      {
        id: 'comp-hpcl', name: 'Hindustan Petroleum', symbol: 'HINDPETRO', sector: 'Oil and Gas', description: 'Government-owned oil and natural gas corporation.',
        initialPrice: 450.0, currentPrice: 450.0, previousPrice: 450.0, totalShares: 130000, availableShares: 130000, volatility: 0.025, createdAt: now,
      },
      // Metals and Mining
      {
        id: 'comp-tatasteel', name: 'Tata Steel', symbol: 'TATASTEEL', sector: 'Metals and Mining', description: 'Among the top steel producing companies in the world.',
        initialPrice: 165.0, currentPrice: 165.0, previousPrice: 165.0, totalShares: 250000, availableShares: 250000, volatility: 0.028, createdAt: now,
      },
      {
        id: 'comp-jswsteel', name: 'JSW Steel', symbol: 'JSWSTEEL', sector: 'Metals and Mining', description: 'Fastest-growing steel company in India.',
        initialPrice: 850.0, currentPrice: 850.0, previousPrice: 850.0, totalShares: 120000, availableShares: 120000, volatility: 0.03, createdAt: now,
      },
      {
        id: 'comp-hindalco', name: 'Hindalco Industries', symbol: 'HINDALCO', sector: 'Metals and Mining', description: 'Aluminium and copper manufacturing company.',
        initialPrice: 580.0, currentPrice: 580.0, previousPrice: 580.0, totalShares: 140000, availableShares: 140000, volatility: 0.032, createdAt: now,
      },
      {
        id: 'comp-vedanta', name: 'Vedanta', symbol: 'VEDL', sector: 'Metals and Mining', description: 'Globally diversified natural resources company.',
        initialPrice: 380.0, currentPrice: 380.0, previousPrice: 380.0, totalShares: 160000, availableShares: 160000, volatility: 0.035, createdAt: now,
      },
      {
        id: 'comp-nmdc', name: 'NMDC', symbol: 'NMDC', sector: 'Metals and Mining', description: "India's single largest iron ore producer.",
        initialPrice: 210.0, currentPrice: 210.0, previousPrice: 210.0, totalShares: 180000, availableShares: 180000, volatility: 0.03, createdAt: now,
      },
      {
        id: 'comp-jindal', name: 'Jindal Steel', symbol: 'JINDALSTEL', sector: 'Metals and Mining', description: 'Industrial powerhouse with dominant presence in steel and power.',
        initialPrice: 820.0, currentPrice: 820.0, previousPrice: 820.0, totalShares: 90000, availableShares: 90000, volatility: 0.032, createdAt: now,
      },
      // Telecommunications
      {
        id: 'comp-bharti', name: 'Bharti Airtel', symbol: 'AIRTEL', sector: 'Telecommunications', description: 'Global telecommunications services company.',
        initialPrice: 1250.0, currentPrice: 1250.0, previousPrice: 1250.0, totalShares: 110000, availableShares: 110000, volatility: 0.02, createdAt: now,
      },
      {
        id: 'comp-vodafone', name: 'Vodafone Idea', symbol: 'VI', sector: 'Telecommunications', description: 'Pan-India telecom service provider.',
        initialPrice: 15.0, currentPrice: 15.0, previousPrice: 15.0, totalShares: 500000, availableShares: 500000, volatility: 0.05, createdAt: now,
      },
      {
        id: 'comp-tatacomm', name: 'Tata Communications', symbol: 'TATACOMM', sector: 'Telecommunications', description: 'Global telecommunications and digital infrastructure services provider.',
        initialPrice: 1950.0, currentPrice: 1950.0, previousPrice: 1950.0, totalShares: 70000, availableShares: 70000, volatility: 0.02, createdAt: now,
      },
      {
        id: 'comp-tejas', name: 'Tejas Networks', symbol: 'TEJASNET', sector: 'Telecommunications', description: 'Optical and data networking products company.',
        initialPrice: 800.0, currentPrice: 800.0, previousPrice: 800.0, totalShares: 60000, availableShares: 60000, volatility: 0.035, createdAt: now,
      },
    ];

    for (const c of companiesData) {
      await db.insert(schema.companies).values(c);
    }

    console.log('Seeding Game State...');
    await db.insert(schema.gameState).values({
      id: 'current',
      round: 0,
      roundName: 'Ready to Start - Awaiting Admin Command',
      status: 'STOPPED',
      marketTrend: 'STABLE',
    });

    console.log('✅ Database seeding completed successfully! Teams generated.');
    if (exitOnComplete) {
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (exitOnComplete) {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

if (process.argv[1]?.includes('seed')) {
  seed();
}

export { createTablesIfNotExist, seed };
