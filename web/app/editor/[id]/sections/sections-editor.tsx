"use client";

import { useState } from "react";

import { SaveStatus } from "@/components/save-status";
import { useAutosave } from "@/lib/use-autosave";
import { SECTION_CHOICES, withSection } from "@/lib/wedding-settings";

const MANAGED = SECTION_CHOICES.map((s) => s.key);

/** One switch per section. A switch saves at once; the cover is always shown. */
export function SectionsEditor({ weddingId, initial }: { weddingId: string; initial: string[] }) {
  const [enabled, setEnabled] = useState(initial);
  const { save, state, savedAt, message } = useAutosave(weddingId, 150);

  function toggle(key: string, on: boolean) {
    const next = withSection(enabled, key, on, MANAGED);
    setEnabled(next);
    save({ sections_enabled: next });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Sections</h1>
        <p className="text-base text-muted">Choose what guests see. The cover with your names is always shown.</p>
      </div>
      <SaveStatus state={state} savedAt={savedAt} message={message} />

      <ul className="flex flex-col gap-3">
        {SECTION_CHOICES.map((s) => {
          const on = enabled.includes(s.key);
          return (
            <li key={s.key} className="rounded-[20px] border border-line p-5">
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span className="flex flex-col gap-1">
                  <span className="text-lg font-bold">{s.label}</span>
                  <span className="text-[15px] text-muted">{s.hint}</span>
                </span>
                <input type="checkbox" role="switch" checked={on} onChange={(e) => toggle(s.key, e.target.checked)} className="mt-1 size-6 shrink-0 accent-accent" />
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
