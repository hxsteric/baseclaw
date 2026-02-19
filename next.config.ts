import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverRuntimeConfig: {
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
    PROXY_SUPABASE_KEY: process.env.PROXY_SUPABASE_KEY,
    SB_KEY: process.env.SB_KEY,
  },
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || "",
    PROXY_SUPABASE_URL: process.env.PROXY_SUPABASE_URL || "",
    PROXY_SUPABASE_KEY: process.env.PROXY_SUPABASE_KEY || "",
    SB_KEY: process.env.SB_KEY || "",
  },
};

export default nextConfig;
