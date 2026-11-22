"use client";

import { useEffect, useState } from "react";

import { PREVIEW_EVENT } from "@/lib/preview-bus";

/**
 * A phone-sized view of the invitation as it is saved right now. Editors announce each save and this redraws.
 * On wide screens it sits beside the form; on narrow ones it opens from a button so the form keeps the room.
 */
export function PreviewPane({ weddingId }: { weddingId: string }) {
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const redraw = () => setVersion((v) => v + 1);
    window.addEventListener(PREVIEW_EVENT, redraw);
    return () => window.removeEventListener(PREVIEW_EVENT, redraw);
  }, []);

  return (
    <aside aria-label="Live preview" className="xl:sticky xl:top-6 xl:w-[360px] xl:shrink-0 xl:self-start">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-bold hover:bg-surface xl:hidden">
        {open ? "Hide preview" : "See how it looks"}
      </button>
      <div className={`${open ? "mt-4 block" : "hidden"} xl:block`}>
        <p className="mb-2 hidden text-[13px] font-bold uppercase tracking-wide text-muted xl:block">Live preview</p>
        <div className="mx-auto w-[320px] rounded-[36px] border-[10px] border-ink bg-ink shadow-lg xl:w-full">
          <iframe
            key={version}
            title="Your invitation on a phone"
            src={`/editor/${weddingId}/preview`}
            className="block h-[560px] w-full rounded-[24px] bg-white xl:h-[640px]"
          />
        </div>
        <p className="mt-2 text-center text-sm text-muted">This is a draft. Guests only see it once you publish.</p>
      </div>
    </aside>
  );
}
