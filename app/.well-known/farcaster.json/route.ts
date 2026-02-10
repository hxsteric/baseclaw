import { NextResponse } from "next/server";
import { APP_NAME, APP_DESCRIPTION, APP_URL } from "@/lib/constants";

export async function GET() {
  const url = APP_URL;

  const manifest = {
    accountAssociation: {
      header: process.env.NEXT_PUBLIC_FARCASTER_HEADER || "",
      payload: process.env.NEXT_PUBLIC_FARCASTER_PAYLOAD || "",
      signature: process.env.NEXT_PUBLIC_FARCASTER_SIGNATURE || "",
    },
    miniapp: {
      version: "1",
      name: APP_NAME,
      homeUrl: url,
      iconUrl: `${url}/logo.svg`,
      splashImageUrl: `${url}/splash.png`,
      splashBackgroundColor: "#0a0a0f",
      webhookUrl: `${url}/api/webhook`,
      subtitle: "One-click AI Agent",
      description: APP_DESCRIPTION,
      primaryCategory: "utility",
      tags: ["ai", "agent", "clawdbot", "openclaw", "chatbot"],
      ogTitle: APP_NAME,
      ogDescription: APP_DESCRIPTION,
      ogImageUrl: `${url}/og-image.png`,
    },
  };

  return NextResponse.json(manifest);
}
