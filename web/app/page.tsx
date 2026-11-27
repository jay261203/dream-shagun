import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { EventMarquee } from "@/components/home/event-marquee";
import { HeroCollage } from "@/components/home/hero-collage";
import { WordHighlight } from "@/components/home/word-highlight";
import { Logo, SiteHeader, TRY_HREF, TRY_LABEL } from "@/components/site-chrome";
import { brand } from "@/lib/brand";
import { listTemplates } from "@/lib/templates/list";

/* The home page, direction D (DS-35): the invitation collage, every reply beside the invitation, replies per event,
   three steps, questions, and a dark close. Every picture is the product's own output; the reply counts are those of
   the demo invitation built in the local app on 28 Nov 2026 (13 guests). */

const wrap = "mx-auto w-full max-w-[1440px] px-5 sm:px-10 lg:px-20";
const section = "py-24 sm:py-28 lg:min-h-[100svh] lg:py-32";
const h2 = "text-[32px] leading-[1.1] tracking-tight sm:text-5xl";
const primary = "inline-flex items-center justify-center gap-2 rounded-lg bg-accent font-medium text-white transition hover:-translate-y-px hover:bg-accent-dark active:translate-y-px";

const EVENTS = [
  ["Mehendi", 19],
  ["Sangeet", 26],
  ["Pheras", 33],
  ["Reception", 32],
] as const;

type Reply = { who: string; what: string; reply: "Coming" | "Maybe"; people: number };
const REPLIES: Reply[] = [
  { who: "Mehta family", what: "All four events · veg", reply: "Coming", people: 4 },
  { who: "Sharma uncle", what: "Not at the mehendi · Jain", reply: "Coming", people: 2 },
  { who: "Rohan", what: "Pheras: maybe", reply: "Maybe", people: 1 },
  { who: "Iyer family", what: "All four events · veg", reply: "Coming", people: 3 },
  { who: "Patel aunty", what: "Sangeet: maybe", reply: "Maybe", people: 2 },
  { who: "Kapoor family", what: "Pheras and reception · veg", reply: "Coming", people: 5 },
  { who: "Joshi family", what: "Not at the reception · Jain", reply: "Coming", people: 2 },
  { who: "Nair family", what: "Mehendi: maybe", reply: "Maybe", people: 2 },
  { who: "Bose family", what: "Not at the mehendi", reply: "Coming", people: 3 },
  { who: "Desai family", what: "All four events · veg", reply: "Coming", people: 3 },
  { who: "Menon family", what: "Not at the mehendi", reply: "Coming", people: 2 },
  { who: "Gupta family", what: "All four events · Jain", reply: "Coming", people: 4 },
  { who: "Reddy uncle", what: "Mehendi and sangeet: maybe", reply: "Maybe", people: 1 },
];

const STEPS = [
  { title: "Add each event", text: "The mehendi, sangeet, pheras and reception each get a time, a place and a dress code.", img: "/home/editor-events.png", alt: "The Events screen with the mehendi and sangeet, their times, the venue and dress code" },
  { title: "Guests reply on their phone", text: "They open your link and tap Coming, Maybe or Can't come for each event.", img: "/home/guest-reply.png", alt: "The reply form: name, phone and a choice for each event" },
  { title: "Count who is coming", text: "Each event shows how many are coming, with every guest's food choice.", img: "/home/host-replies.png", alt: "The Replies screen: 19 coming to the mehendi, 26 to the sangeet" },
];

const EVENT_NAMES = ["Mehendi", "Haldi", "Sangeet", "Pheras", "Reception", "Engagement", "Roka", "Cocktail evening", "Bidaai lunch"] as const;

const FAQ = [
  ["Do guests need an app or an account?", "No. They open the link in their phone's browser and type their name."],
  ["Can I change the invitation after sending it?", "Yes. The link stays the same, so guests see the change the next time they open it."],
  ["Can a guest change their reply?", "Yes. After replying, each guest gets a private link to change it."],
  ["Does it ask guests for money?", "No. A gift page is optional, asks no amount, and you can switch it off."],
  ["Who can see the replies?", "Only the hosts of the invitation. Guests never see each other's answers."],
  ["Which occasions does it cover?", "Weddings today. Birthday, baby shower and anniversary invitations are next."],
] as const;

const PREVIEW = "/preview/marigold?bride=Meera&groom=Dev&date=2027-02-13";

function Arrow() {
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 6h8M4.5 2.5 8 6l-3.5 3.5" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <SiteHeader home />
      <main id="top">
        {/* Hero: the headline, the collage of invitation screens, one big button */}
        <section className={`${wrap} grid gap-8 pb-16 pt-10 lg:min-h-[calc(100svh-65px)] lg:grid-cols-12 lg:items-center lg:gap-6 lg:py-12`}>
          <div className="lg:col-span-3">
            <h1 className="text-[40px] leading-[1.04] tracking-[-0.03em] sm:text-[52px]">Invitations with replies per event</h1>
            <p className="mt-4 max-w-[30ch] text-base leading-relaxed">One link for every event. Guests answer from any phone browser, Android or iPhone, with no app and no login.</p>
          </div>
          <div className="lg:col-span-6 lg:h-[min(680px,calc(100svh-160px))]">
            <HeroCollage />
          </div>
          <div className="lg:col-span-3 lg:flex lg:justify-end">
            <Link href={TRY_HREF} className={`${primary} h-14 w-full px-6 text-lg lg:h-16 lg:w-auto lg:text-xl`}>
              {TRY_LABEL}
              <Arrow />
            </Link>
          </div>
        </section>

        {/* Every reply, next to the invitation */}
        <section id="invitation" className={`${section} scroll-mt-16`}>
          <div className={wrap}>
            <div className="grid gap-6 lg:grid-cols-12">
              <h2 className={`${h2} lg:col-span-5`}>Every reply, next to the invitation</h2>
              <p className="max-w-[62ch] text-base leading-relaxed lg:col-span-6 lg:col-start-7">
                Guests answer Coming, Maybe or Can&apos;t come for each event and say how many are with them. The count for each event changes the moment they send it.{" "}
                <Link href="#how" className="font-medium underline underline-offset-4">See the three steps</Link>
              </p>
            </div>
            <div className="mt-12 grid overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(0_0_0/0.05),0_16px_40px_rgb(29_37_48/0.08)] lg:h-[560px] lg:grid-cols-12">
              <div role="img" aria-label="The replies to Meera and Dev's invitation, guest by guest, with the number coming to each event" className="hidden overflow-hidden border-r border-line lg:col-span-5 lg:flex lg:flex-col">
                <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm" aria-hidden="true">
                  <span className="flex gap-1.5"><i className="size-2.5 rounded-full bg-line" /><i className="size-2.5 rounded-full bg-line" /><i className="size-2.5 rounded-full bg-line" /></span>
                  <span className="ml-2 text-muted">Meera and Dev /</span> <b className="font-medium">Replies</b>
                </div>
                <div className="flex min-h-0 flex-1" aria-hidden="true">
                  <ul className="w-36 shrink-0 border-r border-line p-2 text-[13px]">
                    <li className="flex justify-between rounded-md bg-surface px-2 py-1.5 font-medium"><span>All guests</span><span>{REPLIES.length}</span></li>
                    <li className="px-2 pb-1 pt-3 text-xs text-muted">Events</li>
                    {EVENTS.map(([name, n]) => (
                      <li key={name} className="flex justify-between px-2 py-1.5 text-muted"><span>{name}</span><span className="tabular-nums">{n}</span></li>
                    ))}
                  </ul>
                  <ul className="relative min-w-0 flex-1 overflow-hidden text-[13px] after:absolute after:inset-x-0 after:bottom-0 after:h-16 after:bg-gradient-to-t after:from-white">
                    {REPLIES.map((r) => (
                      <li key={r.who} className="flex items-center gap-3 border-b border-line px-3 py-2.5">
                        <span className="min-w-0 flex-1">
                          <b className="block truncate font-medium">{r.who}</b>
                          <span className="block truncate text-muted">{r.what}</span>
                        </span>
                        <span className={`rounded-md border px-2 py-0.5 text-xs ${r.reply === "Maybe" ? "border-ink/30 bg-surface font-medium" : "border-line text-muted"}`}>{r.reply}</span>
                        <span className="w-4 text-right tabular-nums text-muted">{r.people}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <iframe src={PREVIEW} title="Meera and Dev's invitation, live" tabIndex={-1} loading="lazy" className="h-[560px] w-full border-0 lg:col-span-7 lg:h-full" />
            </div>
          </div>
        </section>

        {/* Replies per event: the statement */}
        <section id="statement" className={section}>
          <div className={wrap}>
            <h2 className={h2}>Replies per event</h2>
            <div className="mt-12 grid gap-6 lg:grid-cols-12">
              <WordHighlight
                className="text-[26px] leading-[1.3] tracking-tight sm:text-[36px] lg:col-span-6"
                accent={brand.name}
                text={`A guest can come to the sangeet, skip the mehendi and bring four people to the reception. ${brand.name} keeps each answer with its event, so your caterer gets one number for each day.`}
              />
              <figure className="relative hidden h-[min(560px,calc(100svh-340px))] overflow-hidden rounded-2xl bg-surface lg:col-span-6 lg:col-start-7 lg:block">
                <Image src="/home/inv-forest-story.png" alt="The story and events of the invitation in the Forest colours" width={780} height={1520} unoptimized className="absolute left-1/2 top-6 w-[260px] -translate-x-1/2 rounded-2xl" />
              </figure>
            </div>
          </div>
        </section>

        {/* Three steps, then the event names */}
        <section id="how" className={`${section} scroll-mt-16`}>
          <div className={wrap}>
            <h2 className={h2}>Send an invitation in 3 steps</h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-white p-6">
                  <span className="flex size-8 items-center justify-center rounded-full border border-line text-sm">{i + 1}</span>
                  <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
                  <p className="mt-2 text-base leading-relaxed">{s.text}</p>
                  <div className="relative mt-6 h-[260px] overflow-hidden rounded-xl bg-surface lg:h-[300px]">
                    <Image src={s.img} alt={s.alt} fill unoptimized sizes="(min-width: 768px) 30vw, 100vw" className="object-cover object-top" />
                  </div>
                </li>
              ))}
            </ol>
            <EventMarquee names={EVENT_NAMES} />
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className={`${section} scroll-mt-16`}>
          <div className={`${wrap} grid gap-10 lg:grid-cols-12 lg:gap-6`}>
            <div className="lg:col-span-5">
              <h2 className={h2}>Questions hosts ask</h2>
              <p className="mt-4 text-base">
                Something else on your mind?{" "}
                <a href={`mailto:hello@${brand.domain}`} className="font-medium underline underline-offset-4">Email the team</a>
              </p>
              <div className="relative mt-10 h-[340px] overflow-hidden rounded-2xl bg-surface">
                <Image src="/home/gift-page.png" alt="The optional gift page: a QR code and an Open my UPI app button, with no amount asked" width={780} height={1520} unoptimized className="absolute left-1/2 top-6 w-[240px] -translate-x-1/2 rounded-2xl" />
              </div>
            </div>
            <dl className="lg:col-span-6 lg:col-start-7">
              {FAQ.map(([q, a]) => (
                <div key={q} className="border-b border-line py-5 first:pt-0">
                  <dt className="text-lg font-medium">{q}</dt>
                  <dd className="mt-1.5 text-base leading-relaxed">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      {/* The close and the footer, on the dark ground */}
      <footer className="bg-night pb-8 pt-24 text-night-ink sm:pt-28">
        <div className={wrap}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className={h2}>See your names on the invitation</h2>
              <p className="mt-4 text-lg text-night-muted">Type two names and the invitation opens with them, before you sign in.</p>
            </div>
            <Link href={TRY_HREF} className="inline-flex h-14 items-center justify-center gap-2 rounded-lg bg-night-ink px-6 text-lg font-medium text-night transition hover:-translate-y-px active:translate-y-px lg:h-16 lg:text-xl">
              {TRY_LABEL}
              <Arrow />
            </Link>
          </div>
          <p aria-hidden="true" className="mt-16 overflow-hidden whitespace-nowrap text-[19vw] leading-[1.05] tracking-[-0.045em] lg:text-[16vw]">{brand.name}</p>
          <div className="mt-12 grid gap-8 border-t border-white/15 pt-10 sm:grid-cols-2 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Logo className="[&>span]:border-night-ink" />
              <p className="mt-2 text-night-muted">Invitations with replies per event.</p>
            </div>
            {[
              ["Invitation", "/#invitation", "Replies"],
              ["Steps", "/#how", "Three steps"],
              ["Questions", "/#faq", "Answers"],
            ].map(([head, href, text]) => (
              <div key={head} className="lg:col-span-2">
                <h3 className="text-sm text-night-muted">{head}</h3>
                <Link href={href} className="mt-2 inline-flex min-h-12 items-center hover:underline">{text}</Link>
              </div>
            ))}
            <div className="lg:col-span-2">
              <h3 className="text-sm text-night-muted">Contact</h3>
              <a href={`mailto:hello@${brand.domain}`} className="mt-2 inline-flex min-h-12 items-center hover:underline">Email the team</a>
            </div>
          </div>
          <Suspense fallback={<p className="mt-10 text-[13px] text-night-muted">&copy; 2026 {brand.name}</p>}>
            <Credits />
          </Suspense>
        </div>
      </footer>
    </>
  );
}

/** The year, the name and the template photographs' credits (a licence condition). */
async function Credits() {
  const credits = (await listTemplates()).map((t) => t.credit).filter((c): c is string => c !== null);
  return (
    <p className="mt-10 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-night-muted">
      <span>&copy; 2026 {brand.name}. {brand.name} is a working name.</span>
      {credits.length ? <span>{credits.join(" · ")}</span> : null}
    </p>
  );
}
