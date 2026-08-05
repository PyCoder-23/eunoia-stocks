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
  // Banking and Finance
  {
    headline: "Central Bank Announces Surprise 50bps Rate Cut!",
    description: "Lower borrowing costs stimulate corporate investment and credit expansion across commercial banking sectors.",
    category: "Banking and Finance",
    severity: "HIGH",
    affectedSector: "Banking and Finance",
    expectedImpact: 13.5
  },
  {
    headline: "Regulatory Oversight Tightens on Non-Banking Financial Firms",
    description: "New capital adequacy mandates trigger a temporary contraction in credit growth and wealth management revenue.",
    category: "Banking and Finance",
    severity: "HIGH",
    affectedSector: "Banking and Finance",
    expectedImpact: -12.0
  },

  // FMCG
  {
    headline: "Bumper Harvest Drives Record Rural FMCG Consumption!",
    description: "Favorable monsoon season boosts disposable income across rural households, driving strong volume growth for consumer goods.",
    category: "FMCG",
    severity: "HIGH",
    affectedSector: "FMCG",
    expectedImpact: 11.5
  },
  {
    headline: "Raw Material Input Costs Surge for Food and Beverage Manufacturers",
    description: "Global commodity price spikes squeeze profit margins for consumer staples and packaged goods brands.",
    category: "FMCG",
    severity: "MEDIUM",
    affectedSector: "FMCG",
    expectedImpact: -8.5
  },

  // Automobile
  {
    headline: "EV Subsidy Extension and Green Mobility Policy Unveiled!",
    description: "Government tax incentives supercharge consumer demand for electric SUVs, commercial vehicles, and two-wheelers.",
    category: "Automobile",
    severity: "HIGH",
    affectedSector: "Automobile",
    expectedImpact: 15.0
  },
  {
    headline: "Global Auto Part Bottlenecks Delay Vehicle Shipments",
    description: "Supply chain disruptions slow assembly line output across major passenger vehicle manufacturers.",
    category: "Automobile",
    severity: "HIGH",
    affectedSector: "Automobile",
    expectedImpact: -11.0
  },

  // Information Technology
  {
    headline: "Enterprise AI Adoption Fuels Massive IT Outsourcing Contracts!",
    description: "Global Fortune 500 corporations sign multi-billion dollar digital transformation deals with top IT services firms.",
    category: "Information Technology",
    severity: "CRITICAL",
    affectedSector: "Information Technology",
    expectedImpact: 18.0
  },
  {
    headline: "Western IT Spending Slowdown Squeezes Q3 Order Pipeline",
    description: "Macroeconomic uncertainty in overseas markets leads to delayed project starts and client budget cuts.",
    category: "Information Technology",
    severity: "HIGH",
    affectedSector: "Information Technology",
    expectedImpact: -10.5
  },

  // Defence
  {
    headline: "Record National Defence Budget Allocation Boosts Indigenous Orders!",
    description: "Government prioritizes local procurement of fighter jets, missile systems, warship electronics, and radar equipment.",
    category: "Defence",
    severity: "CRITICAL",
    affectedSector: "Defence",
    expectedImpact: 20.0
  },
  {
    headline: "Defence Export License Delays Cause Short-Term Shipping Backlog",
    description: "Strict international compliance auditing temporarily halts export dispatches for defence hardware.",
    category: "Defence",
    severity: "MEDIUM",
    affectedSector: "Defence",
    expectedImpact: -7.0
  },

  // Oil and Gas
  {
    headline: "OPEC Production Adjustments Send Energy & Crude Prices Soaring!",
    description: "Tightening global energy supply yields record refining margins and exploration profits for oil & gas giants.",
    category: "Oil and Gas",
    severity: "HIGH",
    affectedSector: "Oil and Gas",
    expectedImpact: 14.0
  },
  {
    headline: "Emergency Windfall Tax Levied on Fuel Exporters",
    description: "Government imposes temporary levies on refining profits to curb domestic fuel price inflation.",
    category: "Oil and Gas",
    severity: "HIGH",
    affectedSector: "Oil and Gas",
    expectedImpact: -13.0
  },

  // Healthcare
  {
    headline: "Breakthrough Drug Approvals Expand Global Pharma Reach!",
    description: "Regulatory authorities approve novel generic formulations and bio-similar treatments for international markets.",
    category: "Healthcare",
    severity: "CRITICAL",
    affectedSector: "Healthcare",
    expectedImpact: 16.5
  },
  {
    headline: "Strict Price Controls Mandated on Essential Lifesaving Medicines",
    description: "New price caps on critical pharmaceuticals pressure operating margins for drug makers and healthcare labs.",
    category: "Healthcare",
    severity: "HIGH",
    affectedSector: "Healthcare",
    expectedImpact: -9.5
  },

  // Metals and Mining
  {
    headline: "Infrastructure Megaprojects Trigger Huge Steel & Aluminium Demand!",
    description: "Surging construction activity across Asian economies lifts metal prices and mining revenues.",
    category: "Metals and Mining",
    severity: "HIGH",
    affectedSector: "Metals and Mining",
    expectedImpact: 15.5
  },
  {
    headline: "Export Duties Doubled on Raw Ore Shipments",
    description: "New tariff policy restricts international metal exports, dampening revenue forecasts for mining operations.",
    category: "Metals and Mining",
    severity: "HIGH",
    affectedSector: "Metals and Mining",
    expectedImpact: -11.5
  },

  // Telecommunications
  {
    headline: "5G & Digital Infrastructure Rollout Drives Record ARPU Growth!",
    description: "Rapid adoption of high-speed data plans, cloud interconnectivity, and enterprise fiber drives telecom earnings.",
    category: "Telecommunications",
    severity: "HIGH",
    affectedSector: "Telecommunications",
    expectedImpact: 14.5
  },
  {
    headline: "Spectrum Auction Costs Exceed Expectations Across Telecom Operators",
    description: "High bidding prices for next-generation spectrum rights increase debt burden on telecom networks.",
    category: "Telecommunications",
    severity: "MEDIUM",
    affectedSector: "Telecommunications",
    expectedImpact: -8.0
  },

  // Global Market
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
    description: "Consumer price index jumps higher than forecast, prompting fears of aggressive monetary tightening.",
    category: "Global Market",
    severity: "HIGH",
    affectedSector: null, // Affects all
    expectedImpact: -10.0
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

export const triggerChaosEvent = async (
  type: string,
  customTitle?: string,
  customMessage?: string,
  targetSector?: string | null,
  customImpact?: number
): Promise<void> => {
  const allCompanies = await db.select().from(companies);
  const now = Date.now();

  let title = customTitle || "⚡ MARKET CHAOS EVENT";
  let message = customMessage || "An unprecedented market event is unfolding!";
  let newsHeadline = "";
  let newsDesc = "";
  let impactPercent = customImpact || 0;
  let affectedSec: string | null = targetSector || null;

  if (type === 'CRASH') {
    title = customTitle || "💥 GLOBAL MARKET CRASH (-30%)";
    message = customMessage || "Global financial markets are experiencing a severe panic sell-off! Stock valuations are plunging across the board!";
    newsHeadline = "BLACK MONDAY: Global Market Crash Erases Trillions in Valuation!";
    newsDesc = "Panic grips virtual trading floors as systemic liquidity freezes cause an immediate 30% drop across all listed equities.";
    impactPercent = customImpact || -30;
    affectedSec = null;
  } else if (type === 'BOOM') {
    title = customTitle || "🚀 GLOBAL MARKET BOOM (+30%)";
    message = customMessage || "An unprecedented wave of institutional capital has entered the market! Equities are soaring!";
    newsHeadline = "MEGA BOOM: Global Investment Surge Sends Equities Skyward!";
    newsDesc = "Central bank stimulus and record retail investor optimism ignite a massive 30% rally across all sectors.";
    impactPercent = customImpact || 30;
    affectedSec = null;
  } else if (type === 'BLACK_SWAN') {
    const randomComp = allCompanies[Math.floor(Math.random() * allCompanies.length)];
    title = customTitle || `🦢 BLACK SWAN EVENT: ${randomComp.symbol} PLUNGES -50%`;
    message = customMessage || `Catastrophic accounting fraud and regulatory freeze uncovered at ${randomComp.name}!`;
    newsHeadline = `CRITICAL ALERT: ${randomComp.name} (${randomComp.symbol}) Halts Operations Amid Fraud Scandal!`;
    newsDesc = `Shares of ${randomComp.symbol} lose 50% of their value in minutes as regulators seize corporate assets.`;
    impactPercent = customImpact || -50;

    const newPrice = Math.max(1.0, parseFloat((randomComp.currentPrice * 0.50).toFixed(2)));
    await db.update(companies).set({ previousPrice: randomComp.currentPrice, currentPrice: newPrice }).where(eq(companies.id, randomComp.id));
  } else if (type === 'BANKING_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Banking and Finance')) {
    title = customTitle || "🏦 BANKING & FINANCE MEGA-BOOM (+35%)";
    message = customMessage || "Central bank rate cuts and credit expansion ignite a massive rally in Banking and Finance stocks!";
    newsHeadline = "FINANCIAL SURGE: Banking and Finance Sector Rallies 35% on Credit Boom!";
    newsDesc = "Surging deposit growth and record net interest income send banking and finance valuations soaring.";
    impactPercent = customImpact || 35;
    affectedSec = "Banking and Finance";
  } else if (type === 'BANKING_CRISIS' || (type === 'SECTOR_CRASH' && targetSector === 'Banking and Finance')) {
    title = customTitle || "🏦 BANKING LIQUIDITY CRISIS (-35%)";
    message = customMessage || "A major financial institution has defaulted! Banking and Finance sector stocks are collapsing!";
    newsHeadline = "SYSTEMIC RISK: Banking and Finance Sector Reels from Massive Liquidity Freeze!";
    newsDesc = "Interbank lending halts as credit default fears cause banking & finance stocks to plummet 35%.";
    impactPercent = customImpact || -35;
    affectedSec = "Banking and Finance";
  } else if (type === 'FMCG_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'FMCG')) {
    title = customTitle || "🛒 FMCG RURAL CONSUMPTION BOOM (+35%)";
    message = customMessage || "Bumper harvest and consumer spending boom send FMCG stock valuations soaring!";
    newsHeadline = "FMCG RALLY: Consumer Goods Sector Surges 35% on Record Sales Volume!";
    newsDesc = "Strong volume growth across rural and urban retail markets supercharges FMCG corporate earnings.";
    impactPercent = customImpact || 35;
    affectedSec = "FMCG";
  } else if (type === 'FMCG_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'FMCG')) {
    title = customTitle || "🛒 FMCG RAW MATERIAL COST CRUNCH (-35%)";
    message = customMessage || "Severe commodity inflation squeezes FMCG margins, triggering heavy sell-offs!";
    newsHeadline = "MARGIN SQUEEZE: FMCG Sector Drops 35% Amid Raw Material Cost Spikes!";
    newsDesc = "Surging agricultural input prices crush quarterly profitability forecasts for consumer staple manufacturers.";
    impactPercent = customImpact || -35;
    affectedSec = "FMCG";
  } else if (type === 'AUTO_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Automobile')) {
    title = customTitle || "🚗 AUTOMOBILE GREEN MOBILITY SURGE (+35%)";
    message = customMessage || "Unprecedented EV subsidies and festive sales drive a massive rally in Automobile stocks!";
    newsHeadline = "AUTO SURGE: EV Policy and Record Shipments Send Auto Stocks Up 35%!";
    newsDesc = "Strong order books across passenger vehicles and commercial fleets propel automobile valuations.";
    impactPercent = customImpact || 35;
    affectedSec = "Automobile";
  } else if (type === 'AUTO_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'Automobile')) {
    title = customTitle || "🚗 AUTOMOBILE SUPPLY CHAIN HALT (-35%)";
    message = customMessage || "Global component shortages halt assembly lines! Automobile stocks plummet!";
    newsHeadline = "PRODUCTION HALT: Automobile Sector Plunges 35% on Component Bottlenecks!";
    newsDesc = "Widespread assembly line shutdowns delay quarterly delivery targets for major automakers.";
    impactPercent = customImpact || -35;
    affectedSec = "Automobile";
  } else if (type === 'BUBBLE_TECH' || type === 'IT_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Information Technology')) {
    title = customTitle || "🌐 IT & TECH BUBBLE SURGE (+40%)";
    message = customMessage || "Explosive enterprise AI adoption has triggered an unprecedented mania in Information Technology stocks!";
    newsHeadline = "AI MANIA: Information Technology Sector Experiences Unprecedented Bubble Growth!";
    newsDesc = "Investors pour billions exclusively into Information Technology stocks, driving valuations up by 40% almost instantly.";
    impactPercent = customImpact || 40;
    affectedSec = "Information Technology";
  } else if (type === 'IT_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'Information Technology')) {
    title = customTitle || "💻 IT GLOBAL SPENDING SLOWDOWN (-35%)";
    message = customMessage || "Western enterprise IT budget cuts trigger a massive sell-off in Information Technology stocks!";
    newsHeadline = "CONTRACT CUTS: Information Technology Stocks Fall 35% on Overseas Slowdown!";
    newsDesc = "Major multinational clients delay digital transformation spending, hitting IT services margins.";
    impactPercent = customImpact || -35;
    affectedSec = "Information Technology";
  } else if (type === 'DEFENCE_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Defence')) {
    title = customTitle || "🛡️ DEFENCE INDIGENIZATION SURGE (+35%)";
    message = customMessage || "Record defense order book expansions announced! Defence sector stocks surge!";
    newsHeadline = "DEFENCE RALLY: Defence Manufacturing Sector Valuations Jump 35%!";
    newsDesc = "Multi-billion dollar government procurement contracts supercharge military hardware & electronics producers.";
    impactPercent = customImpact || 35;
    affectedSec = "Defence";
  } else if (type === 'DEFENCE_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'Defence')) {
    title = customTitle || "🛡️ DEFENCE AUDIT & EMBARGO FREEZE (-35%)";
    message = customMessage || "Strict international export compliance audits halt Defence shipments! Sector drops 35%!";
    newsHeadline = "EXPORT FREEZE: Defence Hardware Producers Drop 35% on Compliance Audit!";
    newsDesc = "Regulatory reviews delay international deliveries and contractual milestone payments for defence contractors.";
    impactPercent = customImpact || -35;
    affectedSec = "Defence";
  } else if (type === 'OIL_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Oil and Gas')) {
    title = customTitle || "🛢️ OIL & GAS ENERGY CRUNCH (+35%)";
    message = customMessage || "Global energy supply shortages send Oil and Gas refining margins and stock prices soaring!";
    newsHeadline = "ENERGY RALLY: Oil and Gas Stocks Surge 35% on Record Refining Margins!";
    newsDesc = "Tight global crude supplies and elevated gas demand boost revenues across exploration and refining majors.";
    impactPercent = customImpact || 35;
    affectedSec = "Oil and Gas";
  } else if (type === 'OIL_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'Oil and Gas')) {
    title = customTitle || "🛢️ OIL & GAS WINDFALL TAX SLAM (-35%)";
    message = customMessage || "Emergency export taxes and price caps hit Oil and Gas corporate earnings!";
    newsHeadline = "TAX LEVY: Oil and Gas Stocks Plunge 35% Following Surprise Export Duties!";
    newsDesc = "Unplanned fiscal levies and domestic price controls pressure profit margins for energy producers.";
    impactPercent = customImpact || -35;
    affectedSec = "Oil and Gas";
  } else if (type === 'HEALTHCARE_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Healthcare')) {
    title = customTitle || "💊 HEALTHCARE BREAKTHROUGH APPROVALS (+35%)";
    message = customMessage || "FDA drug approvals and global clinical trial victories supercharge Healthcare stocks!";
    newsHeadline = "PHARMA SURGE: Healthcare & Pharma Stocks Rally 35% on Blockbuster Approvals!";
    newsDesc = "Expedited regulatory greenlights for new treatments expand global market access for healthcare leaders.";
    impactPercent = customImpact || 35;
    affectedSec = "Healthcare";
  } else if (type === 'HEALTHCARE_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'Healthcare')) {
    title = customTitle || "💊 HEALTHCARE PRICE CONTROL CAPS (-35%)";
    message = customMessage || "Government mandates strict price controls on essential drugs, sparking a 35% Healthcare drop!";
    newsHeadline = "PRICE CAPS: Healthcare Sector Drops 35% on Mandatory Drug Pricing Controls!";
    newsDesc = "Unforeseen pricing restrictions on key formulation portfolios squeeze pharmaceutical earnings.";
    impactPercent = customImpact || -35;
    affectedSec = "Healthcare";
  } else if (type === 'METALS_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Metals and Mining')) {
    title = customTitle || "🏗️ METALS & MINING MEGAPROJECT DEMAND (+35%)";
    message = customMessage || "Global infrastructure projects trigger a huge demand boom in Metals and Mining stocks!";
    newsHeadline = "STEEL SURGE: Metals and Mining Sector Jumps 35% on Infrastructure Demand!";
    newsDesc = "Record construction activity and rising commodity prices drive strong revenue growth for metal producers.";
    impactPercent = customImpact || 35;
    affectedSec = "Metals and Mining";
  } else if (type === 'METALS_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'Metals and Mining')) {
    title = customTitle || "🏗️ METALS EXPORT TARIFF SLAM (-35%)";
    message = customMessage || "Doubled tariffs on raw metal exports send Metals and Mining stocks tumbling 35%!";
    newsHeadline = "TARIFF SURGE: Metals and Mining Stocks Plunge 35% on Export Duties!";
    newsDesc = "Increased international export levies restrict overseas sales and lower domestic spot prices.";
    impactPercent = customImpact || -35;
    affectedSec = "Metals and Mining";
  } else if (type === 'TELECOM_BOOM' || (type === 'SECTOR_BOOM' && targetSector === 'Telecommunications')) {
    title = customTitle || "📡 TELECOM 5G REVOLUTION (+35%)";
    message = customMessage || "Global 5G integration and data monetization boom! Telecommunications stocks surge!";
    newsHeadline = "DIGITAL SURGE: Telecommunications Sector Rallies 35% on Record ARPU!";
    newsDesc = "Rapid enterprise cloud migration and subscriber upgrades ignite massive gains across Telecommunications stocks.";
    impactPercent = customImpact || 35;
    affectedSec = "Telecommunications";
  } else if (type === 'TELECOM_CRASH' || (type === 'SECTOR_CRASH' && targetSector === 'Telecommunications')) {
    title = customTitle || "📡 TELECOM SPECTRUM COST CRUNCH (-35%)";
    message = customMessage || "Sky-high spectrum auction bidding costs trigger heavy debt fears in Telecommunications!";
    newsHeadline = "SPECTRUM DEBT: Telecommunications Sector Falls 35% on Auction Liabilities!";
    newsDesc = "Elevated capital expenditure requirements for next-gen spectrum weigh heavily on telecom balances.";
    impactPercent = customImpact || -35;
    affectedSec = "Telecommunications";
  } else {
    // Custom dynamic fallback
    impactPercent = customImpact || 0;
    affectedSec = targetSector || null;
  }

  // Apply price changes to targeted sector (or all companies if affectedSec is null)
  if (type !== 'BLACK_SWAN' && impactPercent !== 0) {
    const multiplier = 1 + (impactPercent / 100.0);
    for (const c of allCompanies) {
      if (!affectedSec || c.sector.toLowerCase() === affectedSec.toLowerCase() || (affectedSec === 'Information Technology' && c.sector === 'Technology')) {
        const newPrice = Math.max(1.0, parseFloat((c.currentPrice * multiplier).toFixed(2)));
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
    category: affectedSec || 'Global Market',
    severity: 'CRITICAL',
    affectedSector: affectedSec,
    affectedCompanyId: null,
    expectedImpact: impactPercent,
    timestamp: now,
    active: 1
  });

  const updatedCompanies = await db.select().from(companies);
  broadcastMarketUpdate(updatedCompanies);
  broadcastChaosEvent({ title, message, type });
  console.log(`💥 [CHAOS EVENT FIRED]: ${title} (Sector: ${affectedSec || 'ALL'}, Impact: ${impactPercent}%)`);
};
