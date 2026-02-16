/**
 * AI Router — Clawdbot Agent Model Configuration
 *
 * 2-key setup:
 *   MANAGED_ANTHROPIC_KEY  → Claude Opus/Sonnet (complex tasks only, metered)
 *   MANAGED_OPENROUTER_KEY → Everything else via OpenRouter (unlimited)
 *
 * Task classification:
 *   complex  → Claude Opus 4.6 or Sonnet 4.5  (direct Anthropic, metered)
 *   daily    → DeepSeek R1 via OpenRouter       (code gen, research, content — free)
 *   simple   → Gemini Flash-Lite via OpenRouter  (heartbeats, lookups, classification — free)
 *
 * Agent model config:
 *   complex:    anthropic/claude-opus-4-20250514       (direct Anthropic, metered)
 *   daily:      deepseek/deepseek-reasoner             (via OpenRouter, free)
 *   simple:     google/gemini-2.5-flash-lite           (via OpenRouter, free)
 *   heartbeat:  google/gemini-2.5-flash-lite           (via OpenRouter, free, every 30m)
 *   subagents:  deepseek/deepseek-reasoner             (via OpenRouter, free)
 *   imageModel: google/gemini-3-flash                  (via OpenRouter, free)
 *
 * Cost limits (only Opus/Sonnet counts):
 *   Starter:  $5/month  + top-ups
 *   Pro:      $15/month + top-ups
 *   Business: $35/month + top-ups
 */

export type SubscriptionPlan = "free" | "starter" | "pro" | "business";

export type TaskTier = "complex" | "daily" | "simple";

export type ModelRole = "primary" | "daily" | "simple" | "heartbeat" | "subagent" | "image";

export interface ModelConfig {
  model: string;
  provider: string; // "anthropic" = direct key, "openrouter" = via OpenRouter
}

// ─── Agent Model Stack ───────────────────────────────────────────────

export const AGENT_MODELS = {
  // Complex: Claude Opus via direct Anthropic key (metered)
  complex: {
    model: "claude-opus-4-20250514",
    provider: "anthropic",
  } as ModelConfig,

  // Daily work: DeepSeek R1 via OpenRouter (free)
  // Code generation, research, content creation — 90% cheaper than Opus
  daily: {
    model: "deepseek/deepseek-reasoner",
    provider: "openrouter",
  } as ModelConfig,

  // Simple: Gemini Flash-Lite via OpenRouter (free)
  // Heartbeats, quick lookups, classification — ~$0.50/M tokens
  simple: {
    model: "google/gemini-2.5-flash-lite",
    provider: "openrouter",
  } as ModelConfig,

  // Heartbeat: same as simple (every 30m, unlimited)
  heartbeat: {
    model: "google/gemini-2.5-flash-lite",
    provider: "openrouter",
    every: "30m",
    target: "last" as const,
  },

  // Subagents: DeepSeek R1 via OpenRouter (free)
  subagents: {
    model: "deepseek/deepseek-reasoner",
    provider: "openrouter",
    maxConcurrent: 1,
    archiveAfterMinutes: 60,
  },

  // Image/Vision: Gemini 3 Flash via OpenRouter (free)
  imageModel: {
    primary: { model: "google/gemini-3-flash", provider: "openrouter" } as ModelConfig,
    fallbacks: [{ model: "openai/gpt-5.2", provider: "openrouter" }] as ModelConfig[],
  },
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

/**
 * Classify a user prompt into a task tier.
 *   complex → Claude Opus (metered, expensive)
 *   daily   → DeepSeek R1 via OpenRouter (free, great for code/research)
 *   simple  → Gemini Flash-Lite via OpenRouter (free, cheapest)
 */
export function classifyTask(prompt: string): TaskTier {
  const trimmed = prompt.trim();

  // Simple: greetings, short msgs, status checks
  for (const pattern of SIMPLE_PATTERNS) {
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
  // UNMETERED — via OpenRouter, free for all tiers
  "deepseek/deepseek-reasoner": { input: 0.0, output: 0.0, metered: false },
  "google/gemini-2.5-flash-lite": { input: 0.0, output: 0.0, metered: false },
  "google/gemini-3-flash": { input: 0.0, output: 0.0, metered: false },
  "openai/gpt-5.2": { input: 0.0, output: 0.0, metered: false },
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
 *   1. Classify task → complex / daily / simple
 *   2. If complex AND has budget → Claude Opus (metered)
 *   3. If complex AND no budget → DeepSeek R1 (fallback, free)
 *   4. If daily → DeepSeek R1 (free)
 *   5. If simple → Gemini Flash-Lite (free)
 */
export function resolveModel(
  prompt: string,
  plan: SubscriptionPlan,
  currentCostUsd: number,
  extraBudget: number = 0
): ResolvedModel {
  const tier = classifyTask(prompt);

  if (tier === "complex") {
    // Try Claude Opus if budget available
    if (hasRemainingBudget(plan, currentCostUsd, extraBudget)) {
      const key = getProviderKey("anthropic");
      if (key) {
        return { ...AGENT_MODELS.complex, role: "primary", tier, budgetExceeded: false };
      }
    }
    // Budget exceeded or no key → fall to DeepSeek R1 (still good reasoning)
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
    case "openrouter":
      return process.env.MANAGED_OPENROUTER_KEY || null;
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
      return "🤖 DeepSeek";
    case "simple":
      return "⚡ Flash";
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
