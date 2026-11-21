"use client";

import { useState } from "react";

import { EVENT_KINDS, LIMITS, kindInfo, validateForm, type EventForm, type EventKind, type FormErrors } from "@/lib/events";

type Props = {
  initial: EventForm;
  /** Problems the server reported, shown next to the same fields. */
  serverErrors: FormErrors & { form?: string };
  busy: boolean;
  submitLabel: string;
  onSubmit: (form: EventForm) => void;
  onCancel: () => void;
};

const box = "flex flex-col rounded-xl border border-field bg-white px-3.5 py-2.5 focus-within:border-ink";
const labelClass = "text-[11px] font-bold uppercase tracking-wide";
const inputClass = "bg-transparent pt-0.5 text-base outline-none";
const errorClass = "text-sm font-semibold text-danger";

/** The fields for one event. It keeps its own typing and hands back the finished form. */
export function EventFormFields({ initial, serverErrors, busy, submitLabel, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState(initial);
  const [shown, setShown] = useState<FormErrors>({});

  const errors = { ...serverErrors, ...shown };
  const set = <K extends keyof EventForm>(key: K, value: EventForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setShown((e) => ({ ...e, [key]: undefined }));
  };

  // Choosing a kind fills in the usual name and time, but only if the person has not typed their own.
  function chooseKind(next: EventKind) {
    setForm((f) => {
      const was = kindInfo(f.kind);
      const now = kindInfo(next);
      return {
        ...f,
        kind: next,
        name: f.name.trim() === "" || f.name === was.defaultName ? now.defaultName : f.name,
        local_time: f.local_time === was.defaultTime ? now.defaultTime : f.local_time,
      };
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateForm(form);
    setShown(found);
    if (Object.keys(found).length === 0) onSubmit(form);
  }

  const field = (key: keyof EventForm) => ({
    "aria-invalid": errors[key] ? (true as const) : undefined,
    "aria-describedby": errors[key] ? `ev-err-${key}` : undefined,
  });
  const problem = (key: keyof EventForm) => (errors[key] ? <p id={`ev-err-${key}`} className={errorClass}>{errors[key]}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-[20px] border border-line p-5 shadow-sm">
      <div className="flex flex-wrap gap-3">
        <label className={`${box} min-w-40 flex-1`}>
          <span className={labelClass}>Kind</span>
          <select value={form.kind} onChange={(e) => chooseKind(e.target.value as EventKind)} className={`${inputClass} -ml-1`}>
            {EVENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${box} min-w-48 flex-[2]`}>
          <span className={labelClass}>Name</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={LIMITS.name} autoComplete="off" {...field("name")} className={inputClass} />
        </label>
      </div>
      {problem("name")}

      <div className="flex flex-wrap gap-3">
        <label className={`${box} min-w-44 flex-1`}>
          <span className={labelClass}>Date</span>
          <input type="date" value={form.local_date} onChange={(e) => set("local_date", e.target.value)} {...field("local_date")} className={inputClass} />
        </label>
        <label className={`${box} min-w-36 flex-1`}>
          <span className={labelClass}>Time (India)</span>
          <input type="time" value={form.local_time} onChange={(e) => set("local_time", e.target.value)} {...field("local_time")} className={inputClass} />
        </label>
      </div>
      {problem("local_date")}
      {problem("local_time")}

      <label className={box}>
        <span className={labelClass}>Venue</span>
        <input value={form.venue_name} onChange={(e) => set("venue_name", e.target.value)} maxLength={LIMITS.venue_name} autoComplete="off" {...field("venue_name")} className={inputClass} />
      </label>
      {problem("venue_name")}
      <label className={box}>
        <span className={labelClass}>Address</span>
        <input value={form.venue_address} onChange={(e) => set("venue_address", e.target.value)} maxLength={LIMITS.venue_address} autoComplete="off" {...field("venue_address")} className={inputClass} />
      </label>
      {problem("venue_address")}
      <label className={box}>
        <span className={labelClass}>Map link</span>
        <input type="url" inputMode="url" placeholder="https://maps.google.com/..." value={form.map_url} onChange={(e) => set("map_url", e.target.value)} maxLength={LIMITS.map_url} autoComplete="off" {...field("map_url")} className={inputClass} />
      </label>
      {problem("map_url")}
      <label className={box}>
        <span className={labelClass}>Dress code</span>
        <input value={form.dress_code} onChange={(e) => set("dress_code", e.target.value)} maxLength={LIMITS.dress_code} autoComplete="off" {...field("dress_code")} className={inputClass} />
      </label>
      {problem("dress_code")}
      <label className={box}>
        <span className={labelClass}>Note for guests</span>
        <input value={form.note} onChange={(e) => set("note", e.target.value)} maxLength={LIMITS.note} autoComplete="off" {...field("note")} className={inputClass} />
      </label>
      {problem("note")}

      {errors.form ? (
        <p role="alert" className={errorClass}>
          {errors.form}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5 pt-1">
        <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition hover:bg-accent-dark disabled:opacity-60">
          {busy ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink px-6 text-base font-semibold hover:bg-surface disabled:opacity-60">
          Cancel
        </button>
      </div>
    </form>
  );
}
