import { NextRequest, NextResponse } from "next/server";
import { getUser, upsertUser, updateUserPlan, recordPayment } from "@/lib/supabase";
import { PLANS } from "@/lib/subscription";
import type { Plan } from "@/lib/types";

const PAY_TO_ADDRESS = process.env.EVM_PAY_TO_ADDRESS || "";

const VALID_PLANS: Plan[] = ["starter", "pro", "business"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) {
  try {
    const { plan: planId } = await params;

    if (!VALID_PLANS.includes(planId as Plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const plan = PLANS[planId as Plan];
    const body = await request.json();
    const { fid, txHash, walletAddress } = body;

    if (!fid || !txHash) {
      return NextResponse.json({ error: "Missing fid or txHash" }, { status: 400 });
    }

    // Ensure user exists
    let user = await getUser(fid);
    if (!user) {
      user = await upsertUser(fid, walletAddress);
    }

    // Record payment
    await recordPayment(fid, plan.price, plan.id, txHash, "base");

    // Activate plan (30 days)
    const updatedUser = await updateUserPlan(fid, planId as "starter" | "pro" | "business", 30);

    return NextResponse.json({
      success: true,
      user: {
        fid: updatedUser.fid,
        plan: updatedUser.plan,
        plan_started_at: updatedUser.plan_started_at,
        plan_expires_at: updatedUser.plan_expires_at,
      },
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json({ error: "Subscription failed" }, { status: 500 });
  }
}

/**
 * GET — return payment requirements for this plan.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ plan: string }> }
) {
  const { plan: planId } = await params;

  if (!VALID_PLANS.includes(planId as Plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const plan = PLANS[planId as Plan];

  return NextResponse.json({
    plan: plan.id,
    name: plan.name,
    price: plan.price,
    priceRaw: plan.priceRaw.toString(),
    currency: "USDC",
    network: "base",
    payTo: PAY_TO_ADDRESS,
    description: plan.description,
  });
}
