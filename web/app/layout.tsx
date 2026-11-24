import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";

const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-figtree" });

export const metadata: Metadata = {
  title: `${brand.name}: ${brand.tagline}`,
  description: brand.description,
};

// The product is designed in light colours only. Declaring that stops the browser, or its dark mode, from restyling
// the page or its native controls (the date picker), which would put dark text on white cards.
export const viewport: Viewport = { colorScheme: "light", themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white text-ink">{children}</body>
    </html>
  );
}
