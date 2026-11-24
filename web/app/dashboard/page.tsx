import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { createClient, currentClaims } from "@/lib/supabase/server";
import { pageTitle } from "@/lib/brand";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("Your weddings") };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Wedding = { id: string; slug: string; status: string; bride_name: string; groom_name: string; wedding_date: string | null };
type Membership = { role: string; side: string; weddings: Wedding | Wedding[] | null };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function longDate(value: string | null): string | null {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  if (!m) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
}

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-5 py-12 sm:px-10">
        <Suspense fallback={<p className="text-muted">Loading your weddings...</p>}>
          <Weddings searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Weddings({ searchParams }: { searchParams: SearchParams }) {
  const claims = await currentClaims().catch(() => null);
  if (!claims) redirect("/login?next=/dashboard");

  const created = first((await searchParams).created);
  // Row-level security means this returns only the weddings this person belongs to.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("family_members")
    .select("role, side, weddings(id, slug, status, bride_name, groom_name, wedding_date)")
    .order("created_at", { ascending: false });

  const weddings = ((data ?? []) as unknown as Membership[])
    .map((m) => ({ role: m.role, side: m.side, wedding: Array.isArray(m.weddings) ? m.weddings[0] : m.weddings }))
    .filter((m): m is { role: string; side: string; wedding: Wedding } => Boolean(m.wedding));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-bold tracking-tight">Your weddings</h1>
          {typeof claims.email === "string" ? <p className="text-[15px] text-muted">Signed in as {claims.email}</p> : null}
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-semibold hover:bg-surface">
            Sign out
          </button>
        </form>
      </div>

      {created ? (
        <p role="status" className="rounded-2xl bg-[#e7f4ea] px-5 py-4 text-[15px] font-semibold text-[#1b4a2a]">
          Your wedding was created. It is a draft, so guests cannot see it yet.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="font-semibold text-danger">We could not load your weddings. Please refresh the page.</p>
      ) : weddings.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-[20px] border border-line p-7">
          <p className="text-lg text-muted">You have no weddings yet.</p>
          <Link href="/create" className="inline-flex min-h-12 items-center rounded-xl bg-accent px-6 font-bold text-white hover:bg-accent-dark">
            Create your wedding
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {weddings.map(({ role, side, wedding }) => (
            <li key={wedding.id} className="flex flex-col gap-3 rounded-[20px] border border-line p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  {wedding.bride_name} and {wedding.groom_name}
                </h2>
                <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-[13px] font-bold ${wedding.status === "published" ? "bg-[#e7f4ea] text-[#1b4a2a]" : "bg-[#fff3d6] text-[#5e4408]"}`}>
                  {wedding.status === "published" ? "Live" : "Draft"}
                </span>
              </div>
              <p className="text-[15px] text-muted">
                {[longDate(wedding.wedding_date), `${side === "bride" ? "Bride" : "Groom"}'s side`, role === "owner" ? "Owner" : "Helper"].filter(Boolean).join(" · ")}
              </p>
              <p className="text-[15px]">
                <span className="text-muted">Link: </span>
                <span className="font-semibold">{brand.domain}/w/{wedding.slug}</span>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link href={`/editor/${wedding.id}/events`} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-bold hover:bg-surface">
                  Edit invitation
                </Link>
                {wedding.status === "published" ? (
                  <Link href={`/w/${wedding.slug}`} className="inline-flex min-h-11 items-center text-[15px] font-bold text-accent underline">
                    View invitation
                  </Link>
                ) : (
                  <Link href={`/editor/${wedding.id}/publish`} className="inline-flex min-h-11 items-center text-[15px] font-bold text-accent underline">
                    Publish
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
