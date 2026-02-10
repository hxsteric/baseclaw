import type { Metadata, Viewport } from "next";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { APP_NAME, APP_DESCRIPTION, APP_URL } from "@/lib/constants";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const ibmPlexMono = IBM_Plex_Mono({
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
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: `${url}/og-image.png`,
        button: {
          title: "Launch Clawdbot",
          action: {
            type: "launch_miniapp",
            name: APP_NAME,
            url,
            splashImageUrl: `${url}/splash.png`,
            splashBackgroundColor: "#06060b",
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
        className={`${dmSans.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
