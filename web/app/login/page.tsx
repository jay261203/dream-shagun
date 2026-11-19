import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";

import { DraftSummary } from "./draft-summary";

export const metadata: Metadata = { title: "Sign in | Dream Shagun" };

// The sign-in itself is task DS-12 (Google). This page holds the place and shows the draft that will carry over.
export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-5 py-14">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight">Sign in to save your invitation</h1>
          <p className="text-lg leading-relaxed text-muted">Use your Google account. There is no password to remember.</p>
        </div>
        <DraftSummary />
        <div className="mt-auto flex flex-col gap-3">
          <button type="button" disabled className="inline-flex min-h-14 items-center justify-center rounded-xl border border-ink text-[17px] font-bold opacity-50">
            Continue with Google
          </button>
          <p className="text-center text-sm text-muted">Google sign-in is the next task. Your names are kept in this browser until then.</p>
          <Link href="/" className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold underline">
            Back to templates
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
