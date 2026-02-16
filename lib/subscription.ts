import type { Plan } from "./types";

export interface PlanConfig {
  id: Plan;
  tier: number; // Smart contract tier enum
  name: string;
  price: number; // USDC per month
  priceRaw: number; // USDC in 6 decimals (e.g. 10_000_000 = 10 USDC)
  description: string;
  features: string[];
  costLimit: number; // Monthly premium model budget (USD) — 0 = unlimited (BYOK)
  badge: string;
  popular?: boolean;
}

// Monthly cost caps per plan (USD) — only Opus/Sonnet usage counts
export const PLAN_COST_LIMITS: Record<Plan, number> = {
  free: 0,       // BYOK — no managed access
  starter: 5,    // $5/month
  pro: 15,       // $15/month
  business: 35,  // $35/month
};

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: "free",
    tier: 0,
    name: "Free",
    price: 0,
    priceRaw: 0,
    description: "Bring your own API key",
    features: [
      "Use your own API key (BYOK)",
      "All models supported",
      "Unlimited usage",
      "Web search included",
      "No monthly fee",
    ],
    costLimit: 0,
    badge: "BYOK",
  },
  starter: {
    id: "starter",
    tier: 1,
    name: "Starter",
    price: 10,
    priceRaw: 10_000_000, // 10 USDC (6 decimals)
    description: "For casual users",
    features: [
      "No API key needed",
      "Claude Opus 4.5 (primary)",
      "$5/mo premium model budget",
      "Unlimited free models",
      "Heartbeat + subagents included",
      "Web search included",
    ],
    costLimit: 5,
    badge: "$10/mo",
    popular: true,
  },
  pro: {
    id: "pro",
    tier: 2,
    name: "Pro",
    price: 30,
    priceRaw: 30_000_000, // 30 USDC
    description: "For power users",
    features: [
      "No API key needed",
      "Claude Opus 4.5 (primary)",
      "$15/mo premium model budget",
      "Unlimited free models",
      "Heartbeat + subagents included",
      "Vision model access",
      "Web search included",
    ],
    costLimit: 15,
    badge: "$30/mo",
  },
  business: {
    id: "business",
    tier: 3,
    name: "Business",
    price: 80,
    priceRaw: 80_000_000, // 80 USDC
    description: "Full power, no limits",
    features: [
      "No API key needed",
      "Claude Opus 4.5 (primary)",
      "$35/mo premium model budget",
      "Unlimited free models",
      "Heartbeat + subagents included",
      "Vision model access",
      "Priority support",
      "Web search included",
    ],
    costLimit: 35,
    badge: "$80/mo",
  },
};

/**
 * Get total budget (plan base + top-ups).
 */
export function getTotalBudget(plan: Plan, extraBudget: number = 0): number {
  return PLAN_COST_LIMITS[plan] + extraBudget;
}

/**
 * Get budget usage percentage (0-100) for progress bars.
 */
export function getBudgetPercent(plan: Plan, costUsd: number, extraBudget: number = 0): number {
  const total = getTotalBudget(plan, extraBudget);
  if (!total) return 0;
  return Math.min(100, Math.round((costUsd / total) * 100));
}

/**
 * Check if user has remaining premium model budget.
 */
export function hasRemainingBudget(plan: Plan, costUsd: number, extraBudget: number = 0): boolean {
  const total = getTotalBudget(plan, extraBudget);
  if (!total) return false;
  return costUsd < total;
}

/**
 * Get remaining budget in USD.
 */
export function getRemainingBudget(plan: Plan, costUsd: number, extraBudget: number = 0): number {
  const total = getTotalBudget(plan, extraBudget);
  if (!total) return 0;
  return Math.max(0, total - costUsd);
}

/**
 * Get the current billing period string (YYYY-MM).
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Approximate token count from text (chars / 4).
 */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
