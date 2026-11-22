"use client";

import { useState } from "react";

import { SaveStatus } from "@/components/save-status";
import { useAutosave } from "@/lib/use-autosave";
import { NAME_LIMIT, STORY_LIMIT, storyPayload, validateStoryForm, type StoryErrors, type StoryForm } from "@/lib/wedding-settings";

const box = "flex flex-col rounded-xl border border-field bg-white px-3.5 py-2.5 focus-within:border-ink";
const labelClass = "text-[11px] font-bold uppercase tracking-wide";
const inputClass = "bg-transparent pt-0.5 text-base outline-none";

/** Names, date and the few words about the couple. Saves by itself a moment after typing stops. */
export function StoryEditor({ weddingId, initial }: { weddingId: string; initial: StoryForm }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<StoryErrors>({});
  const { save, state, savedAt, message } = useAutosave(weddingId);

  function change<K extends keyof StoryForm>(key: K, value: StoryForm[K]) {
    const next = { ...form, [key]: value };
    setForm(next);
    const found = validateStoryForm(next);
    setErrors(found);
    // Only a field that is valid is saved, so a half-typed name never overwrites a good one.
    if (!found[key]) save({ [key]: storyPayload(next)[key] });
  }

  const field = (key: keyof StoryForm) => ({ "aria-invalid": errors[key] ? (true as const) : undefined, "aria-describedby": errors[key] ? `st-err-${key}` : undefined });
  const problem = (key: keyof StoryForm) => (errors[key] ? <p id={`st-err-${key}`} className="text-sm font-semibold text-danger">{errors[key]}</p> : null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Couple and story</h1>
        <p className="text-base text-muted">Changes are saved as you type, and the preview follows.</p>
      </div>
      <SaveStatus state={state} savedAt={savedAt} message={message} />

      <div className="flex flex-wrap gap-3">
        <label className={`${box} min-w-48 flex-1`}>
          <span className={labelClass}>Bride</span>
          <input value={form.bride_name} onChange={(e) => change("bride_name", e.target.value)} maxLength={NAME_LIMIT} autoComplete="off" {...field("bride_name")} className={inputClass} />
        </label>
        <label className={`${box} min-w-48 flex-1`}>
          <span className={labelClass}>Groom</span>
          <input value={form.groom_name} onChange={(e) => change("groom_name", e.target.value)} maxLength={NAME_LIMIT} autoComplete="off" {...field("groom_name")} className={inputClass} />
        </label>
      </div>
      {problem("bride_name")}
      {problem("groom_name")}

      <label className={`${box} max-w-xs`}>
        <span className={labelClass}>Wedding date</span>
        <input type="date" value={form.wedding_date} onChange={(e) => change("wedding_date", e.target.value)} {...field("wedding_date")} className={inputClass} />
      </label>
      {problem("wedding_date")}

      <label className={box}>
        <span className={labelClass}>Your story</span>
        <textarea value={form.story} onChange={(e) => change("story", e.target.value)} rows={8} maxLength={STORY_LIMIT} {...field("story")} className={`${inputClass} resize-y`} />
      </label>
      {problem("story")}
      <p className="text-sm text-muted">{form.story.length} of {STORY_LIMIT} letters</p>
    </div>
  );
}
