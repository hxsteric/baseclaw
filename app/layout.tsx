import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "@/components/Providers";
import { APP_NAME, APP_DESCRIPTION, APP_URL } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-title",
  subsets: ["latin"],
  weight: ["700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const url = APP_URL;
  return {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    other: {
      "virtual-protocol-site-verification": "f3a6d3ae03ab88449f1503ed03488d08",
      "base:app_id": "698ccbcf0dbccf843e8642cc",
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: `${url}/og-image.png`,
        button: {
          title: "Launch Base Claw",
          action: {
            type: "launch_miniapp",
            name: APP_NAME,
            url,
            splashImageUrl: `${url}/splash.png`,
            splashBackgroundColor: "#111114",
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
