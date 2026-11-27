import type { Metadata, Viewport } from "next";
import { Chivo } from "next/font/google";
import "./globals.css";
import { brand } from "@/lib/brand";

const chivo = Chivo({ subsets: ["latin"], display: "swap", variable: "--font-chivo" });

export const metadata: Metadata = {
  title: `${brand.name}: ${brand.tagline}`,
  description: brand.description,
};

// The product is designed in light colours only. Declaring that stops the browser, or its dark mode, from restyling
// the page or its native controls (the date picker), which would put dark text on white cards.
export const viewport: Viewport = { colorScheme: "light", themeColor: "#f3f1ec" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${chivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">{children}</body>
    </html>
  );
}
