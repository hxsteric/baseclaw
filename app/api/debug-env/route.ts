import { NextResponse } from "next/server";

export async function GET() {
  const env = process.env;
  return NextResponse.json({
    SUPABASE_URL: env["SUPABASE_URL"] ? "set" : "MISSING",
    SUPABASE_SERVICE_KEY: env["SUPABASE_SERVICE_KEY"] ? "set" : "MISSING",
    PROXY_SUPABASE_URL: env["PROXY_SUPABASE_URL"] ? "set" : "MISSING",
    PROXY_SUPABASE_KEY: env["PROXY_SUPABASE_KEY"] ? "set" : "MISSING",
    // Show first 10 chars to verify it's the right type of key
    KEY_PREFIX: (env["SUPABASE_SERVICE_KEY"] || env["PROXY_SUPABASE_KEY"] || "EMPTY").substring(0, 10) + "...",
    URL_PREFIX: (env["SUPABASE_URL"] || env["PROXY_SUPABASE_URL"] || "EMPTY").substring(0, 20) + "...",
  });
}
