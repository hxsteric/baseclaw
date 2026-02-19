import { NextRequest, NextResponse } from "next/server";
import { addToWaitlist } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const result = await addToWaitlist(email);

    if (result.alreadyExists) {
      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist!",
      });
    }

    return NextResponse.json({
      success: true,
      message: "You've been added to the waitlist!",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Waitlist error:", msg, error);
    return NextResponse.json({ error: `Failed to join waitlist: ${msg}` }, { status: 500 });
  }
}
