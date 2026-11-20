import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { safeNext } from "@/lib/safe-next";
import { currentClaims } from "@/lib/supabase/server";

import { DraftSummary } from "./draft-summary";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = { title: "Sign in | Dream Shagun" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-7 px-5 py-14">
        <div className="flex flex-col gap-2.5">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight">Sign in to save your invitation</h1>
          <p className="text-lg leading-relaxed text-muted">Use your Google account. There is no password to remember.</p>
        </div>
        <DraftSummary />
        <Suspense fallback={<div className="min-h-14" aria-busy="true" />}>
          <SignInBody searchParams={searchParams} />
        </Suspense>
        <Link href="/" className="inline-flex min-h-11 items-center justify-center text-[15px] font-semibold underline">
          Back to templates
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}

async function SignInBody({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const next = safeNext(first(params.next));

  // Already signed in: nothing to do here, carry on.
  if (await currentClaims().catch(() => null)) redirect(next);

  return (
    <div className="mt-auto flex flex-col gap-3">
      {first(params.error) ? (
        <p role="alert" className="rounded-xl border border-danger px-4 py-3 text-sm font-semibold text-danger">
          Google sign-in did not finish. Please try again.
        </p>
      ) : null}
      <GoogleButton next={next} />
      <p className="text-center text-sm text-muted">Only the family signs in. Your guests open the link with nothing to sign in to.</p>
    </div>
  );
}
