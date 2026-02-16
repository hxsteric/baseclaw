import { NextRequest, NextResponse } from "next/server";
import { getUsage } from "@/lib/supabase";
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

    const period = getCurrentPeriod();
    const usage = await getUsage(fidNum, period);

    return NextResponse.json({
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      request_count: usage.request_count,
      cost_usd: usage.cost_usd || 0,
      extra_budget: usage.extra_budget || 0,
      period: usage.period || period,
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
