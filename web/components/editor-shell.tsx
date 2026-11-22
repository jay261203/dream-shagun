import Link from "next/link";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-chrome";

/** The sections of the editor, as in the design. A section with no `href` is not built yet and is shown but not linked. */
const SECTIONS = [
  { key: "story", label: "Couple and story", href: null },
  { key: "journey", label: "Our journey", href: "journey" },
  { key: "events", label: "Events", href: "events" },
  { key: "sections", label: "Sections", href: null },
  { key: "look", label: "Look and music", href: null },
  { key: "wishes", label: "Wishes and UPI", href: null },
] as const;

export type EditorSection = (typeof SECTIONS)[number]["key"];

type Props = {
  weddingId: string;
  names: string;
  status: string;
  active: EditorSection;
  children: ReactNode;
};

/** Header, section list and footer shared by every editor screen. */
export function EditorShell({ weddingId, names, status, active, children }: Props) {
  return (
    <>
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-muted hover:text-ink">
              ← Your weddings
            </Link>
            <span className="text-base font-bold">{names}</span>
            <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[13px] font-bold ${status === "published" ? "border-[#b6dfc0] bg-[#e7f4ea] text-[#1b4a2a]" : "border-line bg-surface"}`}>
              {status === "published" ? "Live" : "Draft"}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:px-10 lg:flex-row lg:gap-10">
        <nav aria-label="Invitation sections" className="flex gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
          {SECTIONS.map((s) =>
            s.href ? (
              <Link
                key={s.key}
                href={`/editor/${weddingId}/${s.href}`}
                aria-current={s.key === active ? "page" : undefined}
                className={`inline-flex min-h-12 shrink-0 items-center rounded-xl px-4 text-base ${s.key === active ? "bg-surface font-bold" : "font-medium hover:bg-surface"}`}
              >
                {s.label}
              </Link>
            ) : (
              <span key={s.key} aria-disabled="true" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl px-4 text-base text-muted">
                {s.label}
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">Soon</span>
              </span>
            ),
          )}
        </nav>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <SiteFooter />
    </>
  );
}
