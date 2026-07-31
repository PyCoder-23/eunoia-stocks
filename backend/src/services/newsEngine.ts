import { db } from '../config/db.js';
import { companies, newsEvents, NewNewsEvent, NewsEvent } from '../schema/index.js';
import { eq } from 'drizzle-orm';
import { broadcastNewsEvent, broadcastChaosEvent, broadcastMarketUpdate } from '../sockets/socketHandler.js';

export interface NewsTemplate {
  headline: string;
  description: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedSector: string | null;
  expectedImpact: number; // e.g. 15.0 for +15% or -12.0 for -12%
}

export const NEWS_TEMPLATES: NewsTemplate[] = [
  // Technology News
  {
    headline: "Breakthrough in Quantum Processing Speed!",
    description: "Researchers announce a 100x speedup in quantum error correction algorithms, signaling a new era for commercial AI and computing.",
    category: "Technology",
    severity: "HIGH",
    affectedSector: "Technology",
    expectedImpact: 14.5
  },
  {
    headline: "Critical Zero-Day Vulnerability Discovered in Cloud Servers",
    description: "Major global tech providers scramble to patch a severe kernel exploit affecting 40% of enterprise cloud architectures.",
    category: "Technology",
    severity: "HIGH",
    affectedSector: "Technology",
    expectedImpact: -12.0
  },
  {
    headline: "Global Semiconductor Supply Chain Stabilizes",
    description: "New wafer fabrication plants come online ahead of schedule, reducing production costs and boosting tech margins.",
    category: "Technology",
    severity: "MEDIUM",
    affectedSector: "Technology",
    expectedImpact: 8.0
  },
  {
    headline: "AI Regulation Act Passed with Strict Compliance Penalties",
    description: "New international oversight framework mandates costly auditing for autonomous AI models, worrying tech investors.",
    category: "Technology",
    severity: "MEDIUM",
    affectedSector: "Technology",
    expectedImpact: -7.5
  },
  // Healthcare News
  {
    headline: "Revolutionary Gene Therapy Clears Phase 3 Clinical Trials!",
    description: "FDA grants expedited approval for a single-dose treatment targeting hereditary autoimmune disorders.",
    category: "Healthcare",
    severity: "CRITICAL",
    affectedSector: "Healthcare",
    expectedImpact: 22.0
  },
  {
    headline: "Unexpected Side Effects Prompt Voluntary Drug Recall",
    description: "Leading pharma lab suspends distribution of flagship cardiovascular medication following clinical reports.",
    category: "Healthcare",
    severity: "HIGH",
    affectedSector: "Healthcare",
    expectedImpact: -16.5
  },
  {
    headline: "Global Epidemic Alert Boosts Medical Supply Demand",
    description: "Hospitals worldwide increase procurement of diagnostic kits and robotic surgical monitoring equipment.",
    category: "Healthcare",
    severity: "MEDIUM",
    affectedSector: "Healthcare",
    expectedImpact: 9.5
  },
  // Energy News
  {
    headline: "OPEC+ Announces Surprise Production Cut!",
    description: "Global crude oil reserves tighten immediately, causing wholesale energy and petroleum prices to surge.",
    category: "Energy",
    severity: "HIGH",
    affectedSector: "Energy",
    expectedImpact: 15.0
  },
  {
    headline: "Commercial Nuclear Fusion Achieves Net Energy Gain!",
    description: "Historic experimental milestone threatens traditional fossil fuel reliance and supercharges clean energy stocks.",
    category: "Energy",
    severity: "CRITICAL",
    affectedSector: "Energy",
    expectedImpact: 25.0
  },
  {
    headline: "Severe Pipeline Leak Disrupts Regional Gas Supply",
    description: "Environmental regulators impose emergency shutdowns and investigation fines on major refinery operators.",
    category: "Energy",
    severity: "MEDIUM",
    affectedSector: "Energy",
    expectedImpact: -11.0
  },
  // Banking & Finance News
  {
    headline: "Central Bank Announces Surprise 50bps Rate Cut!",
    description: "Lower borrowing costs stimulate corporate investment and credit expansion across commercial banking sectors.",
    category: "Banking",
    severity: "HIGH",
    affectedSector: "Banking",
    expectedImpact: 13.5
  },
  {
    headline: "Regional Bank Fails Liquidity Stress Test",
    description: "Concerns over bad real estate loans trigger a localized flight to safety and heightened banking scrutiny.",
    category: "Banking",
    severity: "HIGH",
    affectedSector: "Banking",
    expectedImpact: -14.0
  },
  {
    headline: "New Algorithmic Trading Deregulation Boosts Market Liquidity",
    description: "Institutional wealth managers report record quarterly trading volume and advisory fees.",
    category: "Banking",
    severity: "MEDIUM",
    affectedSector: "Banking",
    expectedImpact: 7.0
  },
  // Global Economic News
  {
    headline: "Global Trade Agreement Slashes Cross-Border Tariffs",
    description: "Historic multilateral treaty eliminates import duties on tech, healthcare, and industrial goods worldwide.",
    category: "Global Market",
    severity: "CRITICAL",
    affectedSector: null, // Affects all
    expectedImpact: 12.0
  },
  {
    headline: "Unexpected Inflation Spike Rattles Global Markets",
    description: "Consumer price index jumps higher than forecast, prompting fears of aggressive monetary tightening and stagflation.",
    category: "Global Market",
    severity: "HIGH",
    affectedSector: null, // Affects all
    expectedImpact: -10.0
  },
  {
    headline: "Record GDP Growth Exceeds Analyst Expectations",
    description: "Robust consumer spending and technological capital expenditure fuel an economic boom across all sectors.",
    category: "Global Market",
    severity: "MEDIUM",
    affectedSector: null, // Affects all
    expectedImpact: 8.5
  }
];

export const activeNewsModifiers: Map<string, { impact: number; expiresAt: number }> = new Map();

export const triggerAINews = async (categoryFilter?: string, sectorFilter?: string): Promise<NewsEvent> => {
  let filtered = NEWS_TEMPLATES;
  if (categoryFilter && categoryFilter !== 'ALL') {
    filtered = filtered.filter(t => t.category.toLowerCase() === categoryFilter.toLowerCase());
  }
  if (sectorFilter && sectorFilter !== 'ALL') {
    filtered = filtered.filter(t => t.affectedSector && t.affectedSector.toLowerCase() === sectorFilter.toLowerCase());
  }

  if (filtered.length === 0) {
    filtered = NEWS_TEMPLATES;
  }

  const template = filtered[Math.floor(Math.random() * filtered.length)];
  const now = Date.now();
  const id = `news-${now}-${Math.floor(Math.random() * 1000)}`;

  const newEventData: NewNewsEvent = {
    id,
    headline: template.headline,
    description: template.description,
    category: template.category,
    severity: template.severity,
    affectedSector: template.affectedSector || null,
    affectedCompanyId: null,
    expectedImpact: template.expectedImpact,
    timestamp: now,
    active: 1
  };

  await db.insert(newsEvents).values(newEventData);

  // Store active impact modifier (lasts for 90 seconds in tick loop)
  const targetKey = template.affectedSector ? `SECTOR_${template.affectedSector}` : 'GLOBAL';
  activeNewsModifiers.set(targetKey, {
    impact: template.expectedImpact,
    expiresAt: now + 90000 // 90 seconds
  });

  // Fetch created row
  const createdList = await db.select().from(newsEvents).where(eq(newsEvents.id, id));
  const created = createdList[0];

  broadcastNewsEvent(created);
  console.log(`📰 [NEWS RELEASED]: ${created.headline} (Impact: ${created.expectedImpact}%)`);
  return created;
};

export const triggerManualNews = async (data: {
  headline: string;
  description: string;
  category: string;
  severity: string;
  affectedSector?: string | null;
  affectedCompanyId?: string | null;
  expectedImpact: number;
}): Promise<NewsEvent> => {
  const now = Date.now();
  const id = `manual-news-${now}-${Math.floor(Math.random() * 1000)}`;

  const newEventData: NewNewsEvent = {
    id,
    headline: data.headline,
    description: data.description,
    category: data.category || 'Company News',
    severity: data.severity || 'MEDIUM',
    affectedSector: data.affectedSector || null,
    affectedCompanyId: data.affectedCompanyId || null,
    expectedImpact: data.expectedImpact || 0.0,
    timestamp: now,
    active: 1
  };

  await db.insert(newsEvents).values(newEventData);

  if (data.affectedCompanyId) {
    activeNewsModifiers.set(`COMP_${data.affectedCompanyId}`, { impact: data.expectedImpact, expiresAt: now + 90000 });
  } else if (data.affectedSector) {
    activeNewsModifiers.set(`SECTOR_${data.affectedSector}`, { impact: data.expectedImpact, expiresAt: now + 90000 });
  } else {
    activeNewsModifiers.set('GLOBAL', { impact: data.expectedImpact, expiresAt: now + 90000 });
  }

  const createdList = await db.select().from(newsEvents).where(eq(newsEvents.id, id));
  const created = createdList[0];

  broadcastNewsEvent(created);
  console.log(`📰 [MANUAL NEWS RELEASED]: ${created.headline} (Impact: ${created.expectedImpact}%)`);
  return created;
};

export const triggerChaosEvent = async (type: string): Promise<void> => {
  const allCompanies = await db.select().from(companies);
  const now = Date.now();

  let title = "⚡ MARKET CHAOS EVENT";
  let message = "An unprecedented market event is unfolding!";
  let newsHeadline = "";
  let newsDesc = "";

  if (type === 'CRASH') {
    title = "💥 MARKET CRASH TRIGGERED (-30%)";
    message = "Global financial markets are experiencing a severe panic sell-off! Stock valuations are plunging across the board!";
    newsHeadline = "BLACK MONDAY: Global Market Crash Erases Trillions in Valuation!";
    newsDesc = "Panic grips virtual trading floors as systemic liquidity freezes cause an immediate 30% drop across all listed equities.";

    for (const c of allCompanies) {
      const newPrice = Math.max(1.0, parseFloat((c.currentPrice * 0.70).toFixed(2)));
      await db.update(companies).set({ previousPrice: c.currentPrice, currentPrice: newPrice }).where(eq(companies.id, c.id));
    }
  } else if (type === 'BOOM') {
    title = "🚀 MARKET BOOM TRIGGERED (+30%)";
    message = "An unprecedented wave of institutional capital has entered the market! Equities are soaring!";
    newsHeadline = "MEGA BOOM: Global Investment Surge Sends Equities Skyward!";
    newsDesc = "Central bank stimulus and record retail investor optimism ignite a massive 30% rally across all sectors.";

    for (const c of allCompanies) {
      const newPrice = parseFloat((c.currentPrice * 1.30).toFixed(2));
      await db.update(companies).set({ previousPrice: c.currentPrice, currentPrice: newPrice }).where(eq(companies.id, c.id));
    }
  } else if (type === 'BUBBLE_TECH') {
    title = "🌐 TECHNOLOGY BUBBLE SURGE (+40% TO TECH)";
    message = "Explosive AI adoption has triggered an unprecedented mania in technology stocks!";
    newsHeadline = "AI MANIA: Technology Sector Experiences Unprecedented Bubble Growth!";
    newsDesc = "Investors pour billions exclusively into tech stocks, driving valuations up by 40% almost instantly.";

    for (const c of allCompanies) {
      if (c.sector === 'Technology') {
        const newPrice = parseFloat((c.currentPrice * 1.40).toFixed(2));
        await db.update(companies).set({ previousPrice: c.currentPrice, currentPrice: newPrice }).where(eq(companies.id, c.id));
      }
    }
  } else if (type === 'BLACK_SWAN') {
    const randomComp = allCompanies[Math.floor(Math.random() * allCompanies.length)];
    title = `🦢 BLACK SWAN EVENT: ${randomComp.symbol} PLUNGES -50%`;
    message = `Catastrophic accounting fraud and regulatory freeze uncovered at ${randomComp.name}!`;
    newsHeadline = `CRITICAL ALERT: ${randomComp.name} (${randomComp.symbol}) Halts Operations Amid Fraud Scandal!`;
    newsDesc = `Shares of ${randomComp.symbol} lose 50% of their value in minutes as regulators seize corporate assets.`;

    const newPrice = Math.max(1.0, parseFloat((randomComp.currentPrice * 0.50).toFixed(2)));
    await db.update(companies).set({ previousPrice: randomComp.currentPrice, currentPrice: newPrice }).where(eq(companies.id, randomComp.id));
  } else if (type === 'BANKING_CRISIS') {
    title = "🏦 BANKING LIQUIDITY CRISIS (-35% TO BANKING)";
    message = "A major financial institution has defaulted! Banking sector stocks are collapsing!";
    newsHeadline = "SYSTEMIC RISK: Banking Sector Reels from Massive Liquidity Freeze!";
    newsDesc = "Interbank lending halts as credit default fears cause banking stocks to plummet 35%.";

    for (const c of allCompanies) {
      if (c.sector === 'Banking') {
        const newPrice = Math.max(1.0, parseFloat((c.currentPrice * 0.65).toFixed(2)));
        await db.update(companies).set({ previousPrice: c.currentPrice, currentPrice: newPrice }).where(eq(companies.id, c.id));
      }
    }
  }

  // Insert matching news event
  const id = `chaos-${now}`;
  await db.insert(newsEvents).values({
    id,
    headline: newsHeadline || title,
    description: newsDesc || message,
    category: 'Global Market',
    severity: 'CRITICAL',
    affectedSector: null,
    affectedCompanyId: null,
    expectedImpact: type === 'BOOM' || type === 'BUBBLE_TECH' ? 35.0 : -35.0,
    timestamp: now,
    active: 1
  });

  const updatedCompanies = await db.select().from(companies);
  broadcastMarketUpdate(updatedCompanies);
  broadcastChaosEvent({ title, message, type });
  console.log(`💥 [CHAOS EVENT FIRED]: ${title}`);
};
