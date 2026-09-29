import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Imprint — mint your Base passport",
  description:
    "A 1/1 NFT of your Base wallet. Unique type from your transactions, tokens, NFTs, and Basename. OpenSea rarity. Mint $4 in ETH on Base.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Imprint",
    description: "Mint your Base passport. $4 in ETH. 1/1 type from your wallet.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Imprint" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Imprint",
    description: "Mint your Base passport. $4 in ETH. 1/1 type from your wallet.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
