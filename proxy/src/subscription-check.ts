import { createClient } from "@supabase/supabase-js";
import {
  type SubscriptionPlan,
  calculateRequestCost,
  hasRemainingBudget,
  getRemainingBudget,
  getTotalBudget,
  isMetered,
  getProviderKey,
} from "./ai-router.js";

const SUPABASE_URL = process.env.PROXY_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PROXY_SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface SubscriptionStatus {
  valid: boolean;
  plan: SubscriptionPlan;
  error?: string;
  costUsd?: number;         // metered cost this period
  extraBudget?: number;     // purchased top-ups this period
  budgetRemaining?: number; // remaining budget (plan base + top-ups - spent)
  totalBudget?: number;     // total budget (plan base + top-ups)
  usage?: {
    input_tokens: number;
    output_tokens: number;
    request_count: number;
    cost_usd: number;
  };
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Verify a user's subscription is active and get budget info.
 */
export async function checkSubscription(fid: number): Promise<SubscriptionStatus> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { valid: false, plan: "free", error: "Subscription service not configured" };
  }

  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("fid", fid)
      .single();

    if (userError || !user) {
      return { valid: false, plan: "free", error: "User not found" };
    }

    const plan = user.plan as SubscriptionPlan;

    if (plan === "free") {
      return { valid: false, plan: "free", error: "Free plan — use your own API key" };
    }

    // Check expiry
    if (user.plan_expires_at) {
      const expiresAt = new Date(user.plan_expires_at);
      if (expiresAt < new Date()) {
        return { valid: false, plan: "free", error: "Subscription expired" };
      }
    }

    // Get current period usage + cost + extra budget
    const period = getCurrentPeriod();
    const { data: usage } = await supabase
      .from("usage")
      .select("*")
      .eq("fid", fid)
      .eq("period", period)
      .single();

    const currentUsage = usage || { input_tokens: 0, output_tokens: 0, request_count: 0, cost_usd: 0, extra_budget: 0 };
    const costUsd = Number(currentUsage.cost_usd) || 0;
    const extraBudget = Number(currentUsage.extra_budget) || 0;

    const budgetRemaining = getRemainingBudget(plan, costUsd, extraBudget);
    const totalBudget = getTotalBudget(plan, extraBudget);

    return {
      valid: true,
      plan,
      costUsd,
      extraBudget,
      budgetRemaining,
      totalBudget,
      usage: currentUsage,
    };
  } catch (err) {
    console.error("Subscription check error:", err);
    return { valid: false, plan: "free", error: "Subscription check failed" };
  }
}

/**
 * Track usage after a completed request.
 */
export async function trackUsage(
  fid: number,
  inputTokens: number,
  outputTokens: number,
  model: string
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const period = getCurrentPeriod();
  const requestCost = calculateRequestCost(model, inputTokens, outputTokens);

  try {
    const { data: existing } = await supabase
      .from("usage")
      .select("*")
      .eq("fid", fid)
      .eq("period", period)
      .single();

    if (existing?.id) {
      await supabase
        .from("usage")
        .update({
          input_tokens: existing.input_tokens + inputTokens,
          output_tokens: existing.output_tokens + outputTokens,
          request_count: existing.request_count + 1,
          cost_usd: Number(existing.cost_usd || 0) + requestCost,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("usage").insert({
        fid,
        period,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        request_count: 1,
        cost_usd: requestCost,
      });
    }
  } catch (err) {
    console.error("Usage tracking error:", err);
  }
}

/**
 * Add extra budget (top-up) for a user in the current period.
 */
export async function addExtraBudget(fid: number, amountUsd: number): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const period = getCurrentPeriod();

  try {
    const { data: existing } = await supabase
      .from("usage")
      .select("*")
      .eq("fid", fid)
      .eq("period", period)
      .single();

    if (existing?.id) {
      await supabase
        .from("usage")
        .update({
          extra_budget: Number(existing.extra_budget || 0) + amountUsd,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("usage").insert({
        fid,
        period,
        input_tokens: 0,
        output_tokens: 0,
        request_count: 0,
        cost_usd: 0,
        extra_budget: amountUsd,
      });
    }
  } catch (err) {
    console.error("Extra budget error:", err);
  }
}

export function getManagedKey(provider: string): string | null {
  return getProviderKey(provider);
}
