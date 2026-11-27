import Link from "next/link";
import { Suspense } from "react";

import { currentClaims } from "@/lib/supabase/server";
import { brand } from "@/lib/brand";

/** The ring mark and the name, as in the header and the footer. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex min-h-12 items-center gap-2.5 text-xl font-medium tracking-tight ${className}`}>
      <span aria-hidden="true" className="size-[18px] rounded-full border-[4.5px] border-accent" />
      {brand.name}
    </Link>
  );
}

/** The main action, worded the same wherever it appears. */
export const TRY_HREF = "/templates/marigold";
export const TRY_LABEL = "Try it with your names";

const HOME_LINKS = [
  { href: "/#invitation", label: "Invitation" },
  { href: "/#how", label: "Steps" },
  { href: "/#faq", label: "Questions" },
] as const;

/** The bar on every page. The home page adds its section links and the main action. */
export function SiteHeader({ home = false }: { home?: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4 px-5 py-2.5 sm:px-10 lg:px-20">
        <div className="flex items-center gap-8">
          <Logo />
          {home ? (
            <nav aria-label="Sections" className="hidden items-center gap-1 text-[15px] font-medium md:flex">
              {HOME_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="inline-flex min-h-12 items-center rounded-full px-3.5 hover:bg-surface">
                  {l.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <nav aria-label="Account" className="flex items-center gap-2 text-[15px] font-medium">
          <Suspense fallback={<AccountLink signedIn={false} />}>
            <AccountLinkLoader />
          </Suspense>
          {home ? (
            <Link href={TRY_HREF} className="hidden min-h-12 items-center rounded-lg bg-accent px-5 font-medium text-white transition hover:-translate-y-px hover:bg-accent-dark active:translate-y-px sm:inline-flex">
              {TRY_LABEL}
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

const pill = "inline-flex min-h-12 items-center rounded-full px-4 hover:bg-surface";

function AccountLink({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <Link href="/dashboard" className={pill}>
      Your invitations
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
      <span>{credits.length > 0 ? credits.join(" · ") : `${brand.name} is a working name.`}</span>
      <span>Invitations with replies per event.</span>
    </footer>
  );
}
