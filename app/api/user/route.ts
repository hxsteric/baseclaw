import { NextRequest, NextResponse } from "next/server";
import { getUser, upsertUser, getUsage } from "@/lib/supabase";
import { getCurrentPeriod } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  try {
    const fid = request.nextUrl.searchParams.get("fid");

    if (!fid) {
      return NextResponse.json({ error: "Missing fid parameter" }, { status: 400 });
    }

    const fidNum = parseInt(fid, 10);
    if (isNaN(fidNum)) {
      return NextResponse.json({ error: "Invalid fid" }, { status: 400 });
    }

    // Get or create user
    let user = await getUser(fidNum);
    if (!user) {
      user = await upsertUser(fidNum);
    }

    // Check if plan has expired
    if (user.plan !== "free" && user.plan_expires_at) {
      const expiresAt = new Date(user.plan_expires_at);
      if (expiresAt < new Date()) {
        // Plan expired — revert to free
        user.plan = "free";
        user.plan_started_at = null;
        user.plan_expires_at = null;
      }
    }

    // Get current month usage
    const period = getCurrentPeriod();
    const usage = await getUsage(fidNum, period);

    return NextResponse.json({
      user: {
        fid: user.fid,
        wallet_address: user.wallet_address,
        plan: user.plan,
        plan_started_at: user.plan_started_at,
        plan_expires_at: user.plan_expires_at,
      },
      usage: {
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        request_count: usage.request_count,
        cost_usd: usage.cost_usd || 0,
        extra_budget: usage.extra_budget || 0,
        period: usage.period || period,
      },
    });
  } catch (error) {
    console.error("User API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
