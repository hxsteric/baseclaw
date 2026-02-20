import { NextRequest, NextResponse } from "next/server";
import { getUser, recordPayment } from "@/lib/supabase";
import { addExtraBudget } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, amount, txHash } = body;

    if (!fid || fid === 0) {
      return NextResponse.json({ error: "Please sign in to top up" }, { status: 401 });
    }
    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }
    if (!txHash) {
      return NextResponse.json({ error: "Transaction hash is required" }, { status: 400 });
    }

    const amountNum = Number(amount);
    if (amountNum < 5 || amountNum > 20) {
      return NextResponse.json({ error: "Top-up must be between $5 and $20" }, { status: 400 });
    }

    // Verify user exists and has a paid plan
    const user = await getUser(fid);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.plan === "free") {
      return NextResponse.json({ error: "Top-ups require an active subscription" }, { status: 400 });
    }

    // Record payment
    await recordPayment(fid, amountNum, "topup", txHash, "base");

    // Add extra budget to current period
    await addExtraBudget(fid, amountNum);

    return NextResponse.json({
      success: true,
      addedBudget: amountNum,
    });
  } catch (error) {
    console.error("Top-up error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Top-up failed: ${msg}` }, { status: 500 });
  }
}
