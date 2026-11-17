import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dream Shagun",
  description: "Wedding invitations with RSVP, blessings and a Shagun ledger.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
