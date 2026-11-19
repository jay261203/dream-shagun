import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { LANGUAGE_LABELS, TRADITION_LABELS, label, listTemplates } from "@/lib/templates/list";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-5 pb-10 pt-14 text-center sm:px-10 sm:pt-16">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Digital wedding invitations for Indian families
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            One WhatsApp link with your events, replies and blessings. Guests need no app. You see every reply in one place.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3">
            <Link
              href="#templates"
              className="inline-flex min-h-14 items-center rounded-xl bg-accent px-8 text-[17px] font-bold text-white transition hover:-translate-y-px hover:bg-accent-dark active:translate-y-px"
            >
              Try with your names
            </Link>
            <p className="text-[15px] text-muted">Free to try. No sign-in until you save.</p>
          </div>
        </section>

        <Suspense fallback={<GallerySkeleton />}>
          <Gallery searchParams={searchParams} />
        </Suspense>

        <section id="how" className="bg-surface px-5 py-16 sm:px-10 lg:px-20">
          <div className="mx-auto flex max-w-5xl flex-col gap-9">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">From first look to live link</h2>
            <ol className="grid gap-6 sm:grid-cols-3">
              {[
                ["Try it with your names", "Pick a template and see it with both names and your date. No account yet."],
                ["Add each event", "Venue, time and dress code for the mehendi, sangeet, pheras and reception."],
                ["Send one link", "Share it on WhatsApp. Replies and blessings arrive in your dashboard."],
              ].map(([title, text], i) => (
                <li key={title} className="flex flex-col gap-2.5 rounded-[20px] bg-white p-7">
                  <span className="flex size-11 items-center justify-center rounded-full bg-accent text-lg font-bold text-white">{i + 1}</span>
                  <h3 className="text-xl font-bold">{title}</h3>
                  <p className="leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <Suspense fallback={<SiteFooter />}>
        <Footer />
      </Suspense>
    </>
  );
}

async function Footer() {
  const credits = (await listTemplates()).map((t) => t.credit).filter((c): c is string => c !== null);
  return <SiteFooter credits={credits} />;
}

function GallerySkeleton() {
  return (
    <section id="templates" aria-busy="true" className="mx-auto w-full max-w-7xl px-5 pb-16 sm:px-10 lg:px-20">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="aspect-[4/5] animate-pulse rounded-[20px] bg-surface" />
      </div>
    </section>
  );
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

async function Gallery({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const all = await listTemplates();
  const tradition = first(params.tradition);
  const language = first(params.language);

  const traditions = [...new Set(all.flatMap((t) => t.tradition))];
  const languages = [...new Set(all.flatMap((t) => t.languages))];
  const shown = all.filter((t) => (!tradition || t.tradition.includes(tradition)) && (!language || t.languages.includes(language)));

  const href = (next: { tradition?: string; language?: string }) => {
    const q = new URLSearchParams();
    const t = next.tradition ?? tradition;
    const l = next.language ?? language;
    if (t) q.set("tradition", t);
    if (l) q.set("language", l);
    const s = q.toString();
    return `/${s ? `?${s}` : ""}#templates`;
  };

  return (
    <section id="templates" className="mx-auto flex w-full max-w-7xl scroll-mt-4 flex-col gap-6 px-5 pb-16 sm:px-10 lg:px-20">
      {all.length > 1 || traditions.length > 1 || languages.length > 1 ? (
        <div className="flex flex-col gap-1 border-b border-line pb-1">
          <FilterRow name="Tradition" current={tradition} allHref={href({ tradition: "" })} options={traditions.map((t) => ({ value: t, text: label(TRADITION_LABELS, t), href: href({ tradition: t }) }))} />
          <FilterRow name="Language" current={language} allHref={href({ language: "" })} options={languages.map((l) => ({ value: l, text: label(LANGUAGE_LABELS, l), href: href({ language: l }) }))} />
        </div>
      ) : null}

      {shown.length === 0 ? (
        <p className="py-10 text-center text-muted">
          No template matches that yet. <Link href="/#templates" className="font-semibold text-ink underline">Show all templates</Link>
        </p>
      ) : (
        <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((t) => (
            <li key={t.id}>
              <Link href={`/templates/${t.id}`} className="group flex flex-col gap-3 text-ink no-underline">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[20px] bg-surface transition group-hover:-translate-y-0.5">
                  {t.preview ? (
                    <Image src={t.preview} alt="" fill unoptimized sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                  ) : null}
                </div>
                <div>
                  <h3 className="text-base font-bold">{t.name}</h3>
                  <p className="text-[15px] text-muted">
                    {t.tradition.map((x) => label(TRADITION_LABELS, x)).join(", ")} · {t.languages.map((x) => label(LANGUAGE_LABELS, x)).join(", ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FilterRow({ name, current, allHref, options }: { name: string; current: string; allHref: string; options: { value: string; text: string; href: string }[] }) {
  if (options.length < 2) return null;
  const tab = "inline-flex min-h-11 items-center border-b-2 px-4 text-[15px] -mb-px";
  return (
    <nav aria-label={name} className="flex flex-wrap items-center gap-1">
      <span className="pr-2 text-[13px] font-bold uppercase tracking-wide text-muted">{name}</span>
      <Link href={allHref} aria-current={current === "" ? "true" : undefined} className={`${tab} ${current === "" ? "border-ink font-bold" : "border-transparent font-medium text-muted"}`}>
        All
      </Link>
      {options.map((o) => (
        <Link key={o.value} href={o.href} aria-current={current === o.value ? "true" : undefined} className={`${tab} ${current === o.value ? "border-ink font-bold" : "border-transparent font-medium text-muted"}`}>
          {o.text}
        </Link>
      ))}
    </nav>
  );
}
