import type { Metadata } from "next";
import { APP_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Join the Waitlist — Baseclaw Pro",
  description: "Get early access to Baseclaw Pro. Managed API keys, team workspaces, usage analytics, and dedicated support.",
  openGraph: {
    title: "Join the Waitlist — Baseclaw Pro",
    description: "Get early access to Baseclaw Pro. Managed keys, team workspaces, and dedicated support.",
    url: `${APP_URL}/waitlist`,
    siteName: "Baseclaw",
    type: "website",
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Join the Waitlist — Baseclaw Pro",
    description: "Get early access to Baseclaw Pro. Managed keys, team workspaces, and dedicated support.",
    images: [`${APP_URL}/og-image.png`],
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
