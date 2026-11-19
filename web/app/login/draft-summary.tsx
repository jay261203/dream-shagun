"use client";

import { useEffect, useState } from "react";

import { loadDraft, type Draft } from "@/lib/draft";

/** The names and date the visitor typed, read back from this browser, so they can see nothing was lost. */
export function DraftSummary() {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage, which the server cannot read
    setDraft(loadDraft());
  }, []);

  if (!draft) return null;
  const date = new Date(`${draft.wedding_date}T00:00:00Z`);
  const when = Number.isNaN(date.getTime()) ? draft.wedding_date : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);

  return (
    <div className="rounded-[20px] border border-line p-5">
      <p className="text-[13px] font-bold text-accent">Your draft</p>
      <p className="text-lg font-bold">
        {draft.bride_name} and {draft.groom_name}
      </p>
      <p className="text-[15px] text-muted">
        {when} · {draft.template_id.charAt(0).toUpperCase() + draft.template_id.slice(1)} template
      </p>
    </div>
  );
}
