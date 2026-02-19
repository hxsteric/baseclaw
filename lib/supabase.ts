import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.PROXY_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.PROXY_SUPABASE_KEY || "";
    if (!url || !key) {
      throw new Error(`Supabase env vars missing (url=${url ? "set" : "MISSING"}, key=${key ? "set" : "MISSING"})`);
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ---------- Users ----------

export async function getUser(fid: number) {
  const { data, error } = await getSupabase()
    .from("users")
    .select("*")
    .eq("fid", fid)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
  return data;
}

export async function upsertUser(fid: number, walletAddress?: string) {
  const { data, error } = await getSupabase()
    .from("users")
    .upsert(
      {
        fid,
        wallet_address: walletAddress || null,
        plan: "free",
        plan_started_at: null,
        plan_expires_at: null,
      },
      { onConflict: "fid", ignoreDuplicates: true }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserPlan(
  fid: number,
  plan: "free" | "starter" | "pro" | "business",
  durationDays: number = 30
) {
  const now = new Date();
  const expires = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { data, error } = await getSupabase()
    .from("users")
    .update({
      plan,
      plan_started_at: now.toISOString(),
      plan_expires_at: expires.toISOString(),
    })
    .eq("fid", fid)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------- Usage ----------

export async function getUsage(fid: number, period: string) {
  const { data, error } = await getSupabase()
    .from("usage")
    .select("*")
    .eq("fid", fid)
    .eq("period", period)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || { fid, period, input_tokens: 0, output_tokens: 0, request_count: 0, cost_usd: 0, extra_budget: 0 };
}

export async function incrementUsage(
  fid: number,
  period: string,
  inputTokens: number,
  outputTokens: number
) {
  // Try to insert; if exists, update
  const existing = await getUsage(fid, period);

  if (existing?.id) {
    // Row exists — update
    const { error } = await getSupabase()
      .from("usage")
      .update({
        input_tokens: existing.input_tokens + inputTokens,
        output_tokens: existing.output_tokens + outputTokens,
        request_count: existing.request_count + 1,
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    // New row
    const { error } = await getSupabase().from("usage").insert({
      fid,
      period,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      request_count: 1,
    });

    if (error) throw error;
  }
}

// ---------- Extra Budget (Top-ups) ----------

export async function addExtraBudget(fid: number, amountUsd: number) {
  const period = getCurrentPeriod();
  const existing = await getUsage(fid, period);

  if (existing?.id) {
    const { error } = await getSupabase()
      .from("usage")
      .update({
        extra_budget: Number(existing.extra_budget || 0) + amountUsd,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await getSupabase().from("usage").insert({
      fid,
      period,
      input_tokens: 0,
      output_tokens: 0,
      request_count: 0,
      cost_usd: 0,
      extra_budget: amountUsd,
    });
    if (error) throw error;
  }
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ---------- Payments ----------

// ---------- Waitlist ----------

export async function addToWaitlist(email: string) {
  const normalized = email.toLowerCase().trim();

  // Check if already on waitlist
  const { data: existing, error: selectError } = await getSupabase()
    .from("waitlist")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  // maybeSingle returns null (no error) if not found
  if (selectError) throw selectError;

  if (existing) {
    return { alreadyExists: true };
  }

  const { error } = await getSupabase().from("waitlist").insert({
    email: normalized,
  });

  if (error) throw error;
  return { alreadyExists: false };
}

// ---------- Payments ----------

export async function recordPayment(
  fid: number,
  amountUsd: number,
  plan: string,
  txHash: string,
  network: string = "base"
) {
  const { error } = await getSupabase().from("payments").insert({
    fid,
    amount_usd: amountUsd,
    plan,
    tx_hash: txHash,
    network,
    status: "confirmed",
  });

  if (error) throw error;
}
