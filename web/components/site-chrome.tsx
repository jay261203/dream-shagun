import Link from "next/link";
import { Suspense } from "react";

import { currentClaims } from "@/lib/supabase/server";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-10 lg:px-20">
      <Link href="/" className="text-2xl font-bold tracking-tight text-accent">
        dream shagun
      </Link>
      <nav className="flex items-center gap-2 text-[15px] font-semibold">
        <Link href="/#how" className="inline-flex min-h-11 items-center rounded-full px-3.5 hover:bg-surface">
          How it works
        </Link>
        <Suspense fallback={<AccountLink signedIn={false} />}>
          <AccountLinkLoader />
        </Suspense>
      </nav>
    </header>
  );
}

const pill = "inline-flex min-h-11 items-center rounded-full border border-line px-[18px] hover:bg-surface";

function AccountLink({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <Link href="/dashboard" className={pill}>
      Your weddings
    </Link>
  ) : (
    <Link href="/login" className={pill}>
      Sign in
    </Link>
  );
}

/** Reads the login cookie, so it sits inside a Suspense boundary and the rest of the header can be built ahead of time. */
async function AccountLinkLoader() {
  const claims = await currentClaims().catch(() => null);
  return <AccountLink signedIn={claims !== null} />;
}

export function SiteFooter({ credits = [] }: { credits?: string[] }) {
  return (
    <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line px-5 py-6 text-[13px] leading-relaxed text-muted sm:px-10 lg:px-20">
      <span>{credits.length > 0 ? credits.join(" · ") : "Dream Shagun is a working name."}</span>
      <span>Shagun goes straight from guest to family. We never hold it.</span>
    </footer>
  );
}
