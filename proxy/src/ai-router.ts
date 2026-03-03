/**
 * AI Router — Clawdbot Agent Model Configuration
 *
 * 2-key setup:
 *   MANAGED_ANTHROPIC_KEY → Claude Opus/Sonnet (complex tasks only, metered)
 *   MANAGED_VENICE_KEY    → Everything else via Venice AI (private, uncensored)
 *
 * Task classification:
 *   complex    → Claude Opus 4.6              (direct Anthropic, metered)
 *   daily      → DeepSeek V3.2 via Venice     (code gen, research, content — private)
 *   simple     → Llama 3.3 70B via Venice     (lookups, classification — fast, private)
 *   uncensored → Venice Uncensored            (no refusals, crypto-native)
 *
 * Agent model config:
 *   complex:     anthropic/claude-opus-4-20250514       (direct Anthropic, metered)
 *   daily:       deepseek-v3.2                          (via Venice, private)
 *   simple:      llama-3.3-70b                          (via Venice, fast)
 *   heartbeat:   llama-3.3-70b                          (via Venice, every 30m)
 *   subagents:   deepseek-v3.2                          (via Venice, private)
 *   uncensored:  venice-uncensored                      (via Venice, 2.2% refusal)
 *   imageModel:  llama-3.3-70b                          (via Venice)
 *
 * Cost limits (only Opus/Sonnet counts):
 *   Starter:  $5/month  + top-ups
 *   Pro:      $15/month + top-ups
 *   Business: $35/month + top-ups
 */

export type SubscriptionPlan = "free" | "starter" | "pro" | "business";

export type TaskTier = "complex" | "daily" | "simple" | "uncensored";

export type ModelRole = "primary" | "daily" | "simple" | "heartbeat" | "subagent" | "image";

export interface ModelConfig {
  model: string;
  provider: string; // "anthropic" = direct key, "venice" = via Venice AI
}

// ─── Agent Model Stack ───────────────────────────────────────────────

export const AGENT_MODELS = {
  // Complex: Claude Opus via direct Anthropic key (metered)
  complex: {
    model: "claude-opus-4-20250514",
    provider: "anthropic",
  } as ModelConfig,

  // Daily work: DeepSeek V3.2 via Venice AI (private inference)
  // Code generation, research, content creation — private
  daily: {
    model: "deepseek-v3.2",
    provider: "venice",
  } as ModelConfig,

  // Simple: Llama 3.3 70B via Venice AI (fast, private)
  // Heartbeats, quick lookups, classification — fast response times
  simple: {
    model: "llama-3.3-70b",
    provider: "venice",
  } as ModelConfig,

  // Uncensored: Venice Uncensored (2.2% refusal rate)
  // No crypto discussion refusals — tokens, strategies, protocols
  uncensored: {
    model: "venice-uncensored",
    provider: "venice",
  } as ModelConfig,

  // Heartbeat: Llama 3.3 70B via Venice (every 30m, fast)
  heartbeat: {
    model: "llama-3.3-70b",
    provider: "venice",
    every: "30m",
    target: "last" as const,
  },

  // Subagents: DeepSeek V3.2 via Venice (private)
  subagents: {
    model: "deepseek-v3.2",
    provider: "venice",
    maxConcurrent: 1,
    archiveAfterMinutes: 60,
  },

  // Image/Vision: Llama 3.3 70B via Venice
  imageModel: {
    primary: { model: "llama-3.3-70b", provider: "venice" } as ModelConfig,
    fallbacks: [{ model: "deepseek-v3.2", provider: "venice" }] as ModelConfig[],
  },

  // Vision: Qwen3 VL for image/chart analysis via Venice
  vision: {
    model: "qwen3-vl-235b-a22b",
    provider: "venice",
  } as ModelConfig,
};

// ─── Task Classification ─────────────────────────────────────────────

// Complex patterns → Claude Opus/Sonnet (metered)
const COMPLEX_PATTERNS = [
  /\b(smart ?contract|solidity|audit|security review)\b/i,
  /\b(architect(ure)?|system ?design|scalab(le|ility))\b/i,
  /\b(production|deploy|mainnet|migration)\b/i,
  /\b(write (a |an )?(full|complete|entire|comprehensive))\b/i,
  /\b(critical|mission.?critical)\b/i,
  /\b(debug|refactor|optimize)\b.*\b(entire|whole|complete|full)\b/i,
  /\b(multi-?step|complex) (analysis|reasoning|review)\b/i,
  /\b(vulnerability|exploit|attack vector)\b/i,
];

// Simple patterns → Gemini Flash-Lite (cheapest)
const SIMPLE_PATTERNS = [
  /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|bye|cool|nice|good|great)\b/i,
  /^(what('s| is) (up|good)|how are you)/i,
  /^(yes|no|yeah|nah|sure|alright)\b/i,
  /^.{0,25}$/,  // Very short messages (<25 chars)
  /\b(status|ping|check|test)\b/i,
  /^(show|list|get|what is)\b/i,
];

// Research/lookup patterns → Gemini Flash-Lite (fast, web-search-augmented)
// These queries don't need deep reasoning — a fast model + search results is sufficient
const RESEARCH_PATTERNS = [
  /\b(price|prices|pricing)\b.*\b(of|for)\b/i,
  /\b(how much|current|latest|today)\b.{0,30}\b(price|worth|value|trading)\b/i,
  /\b(tell me|what do you know|info|information|explain|describe)\b.{0,10}\b(about)\b/i,
  /\b(look up|search for|find|research)\b/i,
  /\bmarket ?cap\b/i,
  /\btvl\b/i,
  /\b(airdrop|tokenomics|supply|volume|liquidity|staking|yield)\b/i,
  /\b(bitcoin|btc|ethereum|eth|solana|sol|base|degen|brett|toshi|higher|virtual|virtuals|nox)\b/i,
  /\b(token|coin|nft|protocol|defi|dao)\b.{0,30}\b(revenue|data|stats|metrics|performance)\b/i,
  /\b(who|which|what)\b.{0,30}\b(most|best|top|highest|biggest)\b/i,
];

/**
 * Classify a user prompt into a task tier.
 *   complex → Claude Opus (metered, expensive)
 *   daily   → DeepSeek R1 via OpenRouter (free, great for code/reasoning)
 *   simple  → Gemini Flash-Lite via OpenRouter (free, fast, for lookups + search)
 */
export function classifyTask(prompt: string): TaskTier {
  const trimmed = prompt.trim();

  // Simple: greetings, short msgs, status checks
  for (const pattern of SIMPLE_PATTERNS) {
    if (pattern.test(trimmed)) return "simple";
  }

  // Research: crypto lookups, price queries, data questions
  // Route to fast model — web search provides the actual data
  for (const pattern of RESEARCH_PATTERNS) {
    if (pattern.test(trimmed)) return "simple";
  }

  // Complex: architecture, production, security, full implementations
  for (const pattern of COMPLEX_PATTERNS) {
    if (pattern.test(trimmed)) return "complex";
  }

  // Long code blocks (500+ chars) → complex
  if (/```[\s\S]{500,}/.test(trimmed)) return "complex";

  // Default: daily work (code gen, research, content)
  return "daily";
}

// ─── Cost Tracking ───────────────────────────────────────────────────

// Cost per 1M tokens (USD)
export const MODEL_COSTS: Record<string, { input: number; output: number; metered: boolean }> = {
  // METERED — direct Anthropic, counts against tier cost limit
  "claude-opus-4-20250514": { input: 15.0, output: 75.0, metered: true },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0, metered: true },
  // UNMETERED — via Venice AI, private inference for all tiers
  "deepseek-v3.2": { input: 0.0, output: 0.0, metered: false },
  "llama-3.3-70b": { input: 0.0, output: 0.0, metered: false },
  "venice-uncensored": { input: 0.0, output: 0.0, metered: false },
};

// Monthly cost caps per plan (USD) — only metered model usage counts
export const PLAN_COST_LIMITS: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 5,
  pro: 15,
  business: 35,
};

export function isMetered(model: string): boolean {
  return MODEL_COSTS[model]?.metered ?? false;
}

export function calculateRequestCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = MODEL_COSTS[model];
  if (!costs || !costs.metered) return 0;
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
}

/**
 * Check remaining budget. Includes plan base limit + any top-ups.
 */
export function hasRemainingBudget(
  plan: SubscriptionPlan,
  currentCostUsd: number,
  extraBudget: number = 0
): boolean {
  if (plan === "free") return false;
  const totalBudget = PLAN_COST_LIMITS[plan] + extraBudget;
  return currentCostUsd < totalBudget;
}

export function getRemainingBudget(
  plan: SubscriptionPlan,
  currentCostUsd: number,
  extraBudget: number = 0
): number {
  if (plan === "free") return 0;
  const totalBudget = PLAN_COST_LIMITS[plan] + extraBudget;
  return Math.max(0, totalBudget - currentCostUsd);
}

export function getTotalBudget(plan: SubscriptionPlan, extraBudget: number = 0): number {
  return PLAN_COST_LIMITS[plan] + extraBudget;
}

// ─── Model Resolution ────────────────────────────────────────────────

export interface ResolvedModel extends ModelConfig {
  role: ModelRole;
  tier: TaskTier;
  budgetExceeded: boolean;
}

/**
 * Resolve which model to use based on task classification and budget.
 *
 * Flow:
 *   1. If uncensored mode → Venice Uncensored (no refusals)
 *   2. Classify task → complex / daily / simple
 *   3. If complex AND has budget → Claude Opus (metered)
 *   4. If complex AND no budget → DeepSeek R1 (fallback, private)
 *   5. If daily → DeepSeek R1 (private)
 *   6. If simple → Llama 3.3 70B (fast, private)
 */
export function resolveModel(
  prompt: string,
  plan: SubscriptionPlan,
  currentCostUsd: number,
  extraBudget: number = 0,
  uncensored: boolean = false,
  hasImages: boolean = false
): ResolvedModel {
  // Vision: route to Qwen3 VL when message has images
  if (hasImages) {
    return { ...AGENT_MODELS.vision, role: "image", tier: "daily", budgetExceeded: false };
  }

  // Uncensored mode: route everything through Venice Uncensored
  if (uncensored) {
    return { ...AGENT_MODELS.uncensored, role: "daily", tier: "uncensored", budgetExceeded: false };
  }

  const tier = classifyTask(prompt);

  if (tier === "complex") {
    // Try Claude Opus if budget available
    if (hasRemainingBudget(plan, currentCostUsd, extraBudget)) {
      const key = getProviderKey("anthropic");
      if (key) {
        return { ...AGENT_MODELS.complex, role: "primary", tier, budgetExceeded: false };
      }
    }
    // Budget exceeded or no key → fall to DeepSeek V3.2 (still good reasoning)
    return { ...AGENT_MODELS.daily, role: "daily", tier, budgetExceeded: true };
  }

  if (tier === "daily") {
    return { ...AGENT_MODELS.daily, role: "daily", tier, budgetExceeded: false };
  }

  // simple
  return { ...AGENT_MODELS.simple, role: "simple", tier, budgetExceeded: false };
}

// ─── Convenience model getters ───────────────────────────────────────

export function getHeartbeatModel(): ModelConfig & { role: ModelRole } {
  return { model: AGENT_MODELS.heartbeat.model, provider: AGENT_MODELS.heartbeat.provider, role: "heartbeat" };
}

export function getSubagentModel(): ModelConfig & { role: ModelRole } {
  return { model: AGENT_MODELS.subagents.model, provider: AGENT_MODELS.subagents.provider, role: "subagent" };
}

export function getImageModel(): ModelConfig & { role: ModelRole } {
  return { ...AGENT_MODELS.imageModel.primary, role: "image" };
}

// ─── Provider Key Lookup (2-key setup) ───────────────────────────────

export function getProviderKey(provider: string): string | null {
  switch (provider) {
    case "anthropic":
      return process.env.MANAGED_ANTHROPIC_KEY || null;
    case "venice":
      return process.env.MANAGED_VENICE_KEY || null;
    default:
      return null;
  }
}

// ─── Labels ──────────────────────────────────────────────────────────

export function tierLabel(tier: TaskTier): string {
  switch (tier) {
    case "complex":
      return "🎯 Opus";
    case "daily":
      return "🤖 DeepSeek V3";
    case "simple":
      return "⚡ Llama";
    case "uncensored":
      return "🔓 Uncensored";
  }
}

export function roleLabel(role: ModelRole): string {
  switch (role) {
    case "primary":
      return "🎯 Opus";
    case "daily":
      return "🤖 Daily";
    case "simple":
      return "⚡ Quick";
    case "heartbeat":
      return "💓 Heartbeat";
    case "subagent":
      return "🔧 Subagent";
    case "image":
      return "🖼️ Vision";
  }
}
