import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], display: "swap", variable: "--font-figtree" });

export const metadata: Metadata = {
  title: "Dream Shagun: digital wedding invitations for Indian families",
  description: "One WhatsApp link with your events, replies and blessings. Guests need no app.",
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
