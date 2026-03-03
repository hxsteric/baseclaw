/**
 * Crypto Data APIs — Basescan + DeFi Llama + CoinGecko
 *
 * Pre-fetches on-chain data based on user message patterns.
 * Results are injected into the AI system prompt as live context.
 * Venice doesn't support tool calling, so we detect intent via regex.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface TokenPrice {
  id: string;
  symbol: string;
  name: string;
  price_usd: number;
  market_cap?: number;
  volume_24h?: number;
  price_change_24h?: number;
}

export interface ProtocolData {
  name: string;
  slug: string;
  tvl: number;
  chain?: string;
  category?: string;
  change_1d?: number;
  change_7d?: number;
}

export interface TokenHolderData {
  address: string;
  balance: string;
  share?: string;
}

export interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply?: string;
  decimals?: string;
  contractAddress?: string;
  holders?: number;
}

export type CryptoQueryType = "price" | "tvl" | "holders" | "token_info" | "protocol";

// ─── Pattern Detection ───────────────────────────────────────────────

const PRICE_PATTERNS = [
  /\b(price|prices|pricing|worth|value|trading at)\b.*\b(of|for|is)?\b/i,
  /\bhow much\b/i,
  /\bmarket ?cap\b/i,
  /\b(volume|24h|daily)\b.*\b(volume|trading)\b/i,
];

const TVL_PATTERNS = [
  /\btvl\b/i,
  /\btotal value locked\b/i,
  /\b(protocol|defi)\b.*\b(tvl|locked|deposits)\b/i,
];

const HOLDER_PATTERNS = [
  /\b(holders?|holding|distribution|whale|whales|top holders)\b/i,
  /\bbubble ?map/i,
  /\b(who|which)\b.*\b(holds?|own|biggest)\b/i,
];

const TOKEN_INFO_PATTERNS = [
  /\b(token ?info|contract|supply|decimals|total supply)\b/i,
  /\b(token|coin)\b.*\b(details|information|data)\b/i,
  /\b0x[a-fA-F0-9]{40}\b/, // Ethereum address
];

/**
 * Detect what crypto data the user is asking about.
 * Returns array of query types to fetch in parallel.
 */
export function detectCryptoQuery(message: string): CryptoQueryType[] {
  const types: CryptoQueryType[] = [];

  for (const p of PRICE_PATTERNS) {
    if (p.test(message)) { types.push("price"); break; }
  }
  for (const p of TVL_PATTERNS) {
    if (p.test(message)) { types.push("tvl"); break; }
  }
  for (const p of HOLDER_PATTERNS) {
    if (p.test(message)) { types.push("holders"); break; }
  }
  for (const p of TOKEN_INFO_PATTERNS) {
    if (p.test(message)) { types.push("token_info"); break; }
  }

  return types;
}

/**
 * Extract token/protocol names from the user message.
 * Returns lowercase identifiers to use with APIs.
 */
export function extractSubject(message: string): string[] {
  // Common token aliases
  const ALIASES: Record<string, string> = {
    btc: "bitcoin", bitcoin: "bitcoin",
    eth: "ethereum", ethereum: "ethereum",
    sol: "solana", solana: "solana",
    base: "base", bnb: "binancecoin",
    usdc: "usd-coin", usdt: "tether",
    degen: "degen-base", brett: "brett",
    toshi: "toshi", higher: "higher",
    virtual: "virtuals-protocol", virtuals: "virtuals-protocol",
    vvv: "virtuals-protocol",
    aero: "aerodrome-finance", aerodrome: "aerodrome-finance",
    op: "optimism", arb: "arbitrum",
    avax: "avalanche-2", matic: "polygon",
    link: "chainlink", uni: "uniswap",
    aave: "aave", comp: "compound-governance-token",
    mkr: "maker", snx: "synthetix-network-token",
    crv: "curve-dao-token", ldo: "lido-dao",
    pepe: "pepe", wif: "dogwifcoin",
    bonk: "bonk", floki: "floki",
    nox: "nox",
  };

  const words = message.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
  const subjects: string[] = [];
  const seen = new Set<string>();

  for (const w of words) {
    const alias = ALIASES[w];
    if (alias && !seen.has(alias)) {
      seen.add(alias);
      subjects.push(alias);
    }
  }

  // Also extract Ethereum addresses
  const addresses = message.match(/0x[a-fA-F0-9]{40}/g);
  if (addresses) {
    for (const addr of addresses) {
      if (!seen.has(addr)) {
        seen.add(addr);
        subjects.push(addr);
      }
    }
  }

  return subjects;
}

// ─── CoinGecko (free, 30 calls/min) ─────────────────────────────────

const CG_BASE = "https://api.coingecko.com/api/v3";

export async function fetchTokenPrice(idOrSymbol: string): Promise<TokenPrice | null> {
  try {
    const url = `${CG_BASE}/simple/price?ids=${encodeURIComponent(idOrSymbol)}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json() as Record<string, any>;
    const entry = data[idOrSymbol];
    if (!entry) return null;

    return {
      id: idOrSymbol,
      symbol: idOrSymbol,
      name: idOrSymbol,
      price_usd: entry.usd || 0,
      market_cap: entry.usd_market_cap,
      volume_24h: entry.usd_24h_vol,
      price_change_24h: entry.usd_24h_change,
    };
  } catch (err) {
    console.error(`[CoinGecko] Price fetch failed for ${idOrSymbol}:`, err);
    return null;
  }
}

export async function searchCoinGecko(query: string): Promise<string | null> {
  try {
    const url = `${CG_BASE}/search?query=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const coin = data.coins?.[0];
    return coin?.id || null;
  } catch {
    return null;
  }
}

// ─── DeFi Llama (free, unlimited) ────────────────────────────────────

const LLAMA_BASE = "https://api.llama.fi";

export async function fetchProtocolTVL(slug: string): Promise<ProtocolData | null> {
  try {
    const url = `${LLAMA_BASE}/protocol/${encodeURIComponent(slug)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json() as any;
    return {
      name: data.name || slug,
      slug: data.slug || slug,
      tvl: data.currentChainTvls?.total || data.tvl?.[data.tvl.length - 1]?.totalLiquidityUSD || 0,
      chain: data.chain || data.chains?.join(", "),
      category: data.category,
      change_1d: data.change_1d,
      change_7d: data.change_7d,
    };
  } catch (err) {
    console.error(`[DeFi Llama] TVL fetch failed for ${slug}:`, err);
    return null;
  }
}

export async function fetchTokenPriceByAddress(chain: string, address: string): Promise<number | null> {
  try {
    const url = `https://coins.llama.fi/prices/current/${chain}:${address}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json() as any;
    const key = `${chain}:${address}`;
    return data.coins?.[key]?.price || null;
  } catch {
    return null;
  }
}

// ─── Basescan (5 calls/sec, needs API key) ───────────────────────────

const BASESCAN_BASE = "https://api.basescan.org/api";

export async function fetchTokenHolders(
  contractAddress: string,
  apiKey: string
): Promise<TokenHolderData[]> {
  try {
    const params = new URLSearchParams({
      module: "token",
      action: "tokenholderlist",
      contractaddress: contractAddress,
      page: "1",
      offset: "20",
      apikey: apiKey,
    });

    const res = await fetch(`${BASESCAN_BASE}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const data = await res.json() as any;
    if (data.status !== "1") return [];

    return (data.result || []).map((h: any) => ({
      address: h.TokenHolderAddress || h.address || "",
      balance: h.TokenHolderQuantity || h.value || "0",
      share: h.share,
    }));
  } catch (err) {
    console.error(`[Basescan] Holder fetch failed:`, err);
    return [];
  }
}

export async function fetchBasescanTokenInfo(
  contractAddress: string,
  apiKey: string
): Promise<TokenInfo | null> {
  try {
    const params = new URLSearchParams({
      module: "token",
      action: "tokeninfo",
      contractaddress: contractAddress,
      apikey: apiKey,
    });

    const res = await fetch(`${BASESCAN_BASE}?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json() as any;
    if (data.status !== "1") return null;

    const info = Array.isArray(data.result) ? data.result[0] : data.result;
    return {
      name: info?.tokenName || info?.name || "",
      symbol: info?.symbol || "",
      totalSupply: info?.totalSupply,
      decimals: info?.divisor || info?.decimals,
      contractAddress,
      holders: info?.holdersCount ? parseInt(info.holdersCount) : undefined,
    };
  } catch (err) {
    console.error(`[Basescan] Token info fetch failed:`, err);
    return null;
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────

export interface CryptoContext {
  prices: TokenPrice[];
  protocols: ProtocolData[];
  holders: TokenHolderData[];
  tokenInfos: TokenInfo[];
}

/**
 * Fetch all relevant crypto data based on the user's message.
 * Returns formatted context string to inject into the system prompt.
 */
export async function fetchCryptoContext(
  message: string,
  basescanApiKey?: string
): Promise<string> {
  const queryTypes = detectCryptoQuery(message);
  if (queryTypes.length === 0) return "";

  const subjects = extractSubject(message);
  if (subjects.length === 0) return "";

  const ctx: CryptoContext = {
    prices: [],
    protocols: [],
    holders: [],
    tokenInfos: [],
  };

  // Build fetch promises based on detected query types
  const promises: Promise<void>[] = [];

  if (queryTypes.includes("price")) {
    for (const subj of subjects) {
      if (subj.startsWith("0x")) continue; // Skip addresses for CoinGecko
      promises.push(
        fetchTokenPrice(subj).then(p => { if (p) ctx.prices.push(p); })
      );
    }
  }

  if (queryTypes.includes("tvl") || queryTypes.includes("protocol")) {
    for (const subj of subjects) {
      if (subj.startsWith("0x")) continue;
      promises.push(
        fetchProtocolTVL(subj).then(p => { if (p) ctx.protocols.push(p); })
      );
    }
  }

  if (queryTypes.includes("holders") && basescanApiKey) {
    for (const subj of subjects) {
      if (subj.startsWith("0x")) {
        promises.push(
          fetchTokenHolders(subj, basescanApiKey).then(h => { ctx.holders.push(...h); })
        );
      }
    }
  }

  if (queryTypes.includes("token_info") && basescanApiKey) {
    for (const subj of subjects) {
      if (subj.startsWith("0x")) {
        promises.push(
          fetchBasescanTokenInfo(subj, basescanApiKey).then(t => { if (t) ctx.tokenInfos.push(t); })
        );
      }
    }
  }

  // Fetch all in parallel with a global timeout
  try {
    await Promise.allSettled(promises);
  } catch (err) {
    console.error("[CryptoData] Fetch error:", err);
  }

  // Format results
  return formatCryptoContext(ctx);
}

function formatCryptoContext(ctx: CryptoContext): string {
  const sections: string[] = [];

  if (ctx.prices.length > 0) {
    const lines = ctx.prices.map(p => {
      let s = `• ${p.name} (${p.symbol}): $${p.price_usd.toLocaleString()}`;
      if (p.market_cap) s += ` | MCap: $${formatLargeNumber(p.market_cap)}`;
      if (p.volume_24h) s += ` | 24h Vol: $${formatLargeNumber(p.volume_24h)}`;
      if (p.price_change_24h !== undefined) s += ` | 24h: ${p.price_change_24h.toFixed(2)}%`;
      return s;
    });
    sections.push(`LIVE PRICES:\n${lines.join("\n")}`);
  }

  if (ctx.protocols.length > 0) {
    const lines = ctx.protocols.map(p => {
      let s = `• ${p.name}: TVL $${formatLargeNumber(p.tvl)}`;
      if (p.chain) s += ` | Chain: ${p.chain}`;
      if (p.category) s += ` | Category: ${p.category}`;
      if (p.change_1d !== undefined) s += ` | 1d: ${p.change_1d.toFixed(2)}%`;
      if (p.change_7d !== undefined) s += ` | 7d: ${p.change_7d.toFixed(2)}%`;
      return s;
    });
    sections.push(`PROTOCOL DATA:\n${lines.join("\n")}`);
  }

  if (ctx.tokenInfos.length > 0) {
    const lines = ctx.tokenInfos.map(t => {
      let s = `• ${t.name} (${t.symbol})`;
      if (t.totalSupply) s += ` | Supply: ${t.totalSupply}`;
      if (t.holders !== undefined) s += ` | Holders: ${t.holders.toLocaleString()}`;
      if (t.contractAddress) s += ` | Contract: ${t.contractAddress}`;
      return s;
    });
    sections.push(`TOKEN INFO:\n${lines.join("\n")}`);
  }

  if (ctx.holders.length > 0) {
    const top = ctx.holders.slice(0, 10);
    const lines = top.map((h, i) =>
      `${i + 1}. ${h.address.slice(0, 6)}...${h.address.slice(-4)} — ${h.balance}${h.share ? ` (${h.share}%)` : ""}`
    );
    sections.push(`TOP HOLDERS:\n${lines.join("\n")}`);
  }

  if (sections.length === 0) return "";

  return `\n\n[LIVE ON-CHAIN DATA — fetched ${new Date().toISOString()}]\n${sections.join("\n\n")}`;
}

function formatLargeNumber(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}
