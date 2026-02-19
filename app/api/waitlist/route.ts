import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Create supabase client at request time — NOT at module load
function getClient() {
  // Try every possible env var name
  const url =
    process.env.SUPABASE_URL ||
    process.env.PROXY_SUPABASE_URL ||
    "";

  // Read ALL key variations
  const key =
    process.env.SB_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.PROXY_SUPABASE_KEY ||
    "";

  if (!url || !key) {
    // Dump all env var names for debugging
    const allVarNames = Object.keys(process.env).sort().join(", ");
    throw new Error(
      `Supabase env vars missing (url=${url ? "set" : "MISSING"}, key=${key ? "set" : "MISSING"}). Available vars: ${allVarNames}`
    );
  }

  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const supabase = getClient();
    const normalized = email.toLowerCase().trim();

    // Check if already on waitlist
    const { data: existing, error: selectError } = await supabase
      .from("waitlist")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist!",
      });
    }

    const { error } = await supabase.from("waitlist").insert({
      email: normalized,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "You've been added to the waitlist!",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Waitlist error:", msg);
    return NextResponse.json({ error: `Failed to join waitlist: ${msg}` }, { status: 500 });
  }
}
