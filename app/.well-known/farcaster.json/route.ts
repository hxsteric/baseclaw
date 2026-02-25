import { NextResponse } from "next/server";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

// Use the verified domain for all manifest URLs
const VERIFIED_URL = "https://baseclaw.dev";

export async function GET() {
  const manifest = {
    // Account association cleared — regenerate for baseclaw.dev domain at:
    // https://www.base.dev/preview?tab=account&url=https://baseclaw.dev/
    accountAssociation: {},
    miniapp: {
      version: "1",
      name: APP_NAME,
      homeUrl: VERIFIED_URL,
      iconUrl: `${VERIFIED_URL}/logonew.JPG`,
      splashImageUrl: `${VERIFIED_URL}/logonew.JPG`,
      splashBackgroundColor: "#111114",
      subtitle: "One-click AI Agent",
      description: APP_DESCRIPTION,
      primaryCategory: "utility",
      tags: ["ai", "agent", "baseclaw", "openclaw", "base"],
      heroImageUrl: `${VERIFIED_URL}/logonew.JPG`,
      tagline: "Your AI, your keys, your rules",
      ogTitle: APP_NAME,
      ogDescription: APP_DESCRIPTION,
      ogImageUrl: `${VERIFIED_URL}/logonew.JPG`,
      noindex: false,
    },
  };

  return NextResponse.json(manifest);
}
