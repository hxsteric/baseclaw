import { NextResponse } from "next/server";

export async function GET() {
  // Dump ALL env var names that might be related to supabase or keys
  const allKeys = Object.keys(process.env).filter(
    (k) =>
      k.includes("SUPABASE") ||
      k.includes("SB_") ||
      k.includes("_KEY") ||
      k.includes("DATABASE")
  );

  const result: Record<string, string> = {};
  for (const k of allKeys) {
    const val = process.env[k] || "";
    result[k] = val ? `set (${val.substring(0, 8)}...)` : "EMPTY";
  }

  result["_TOTAL_ENV_VARS"] = String(Object.keys(process.env).length);
  result["_MATCHED_VARS"] = String(allKeys.length);

  return NextResponse.json(result);
}
