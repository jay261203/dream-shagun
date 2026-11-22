"use client";

import Link from "next/link";
import { useState } from "react";

import { moveItem } from "@/lib/events";
import {
  MAX_MOMENTS,
  MOMENT_IDEAS,
  MOMENT_LIMITS,
  emptyMomentForm,
  formFromMoment,
  momentPayload,
  monthLabel,
  parseMomentErrors,
  validateMoment,
  type MomentErrors,
  type MomentForm,
  type MomentItem,
} from "@/lib/moments";
import { shrinkPhoto } from "@/lib/shrink-photo";

type Props = { weddingId: string; initialMoments: MomentItem[] };
type Editing = { mode: "add"; title: string } | { mode: "edit"; id: string } | null;
type Notice = { kind: "ok" | "error"; text: string; signIn?: boolean } | null;
type Problems = MomentErrors & { form?: string };

const box = "flex flex-col rounded-xl border border-field bg-white px-3.5 py-2.5 focus-within:border-ink";
const labelClass = "text-[11px] font-bold uppercase tracking-wide";
const inputClass = "bg-transparent pt-0.5 text-base outline-none";
const errorClass = "text-sm font-semibold text-danger";

const arrow = (up: boolean) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

function MomentFields({ weddingId, initial, serverErrors, busy, submitLabel, onSubmit, onCancel }: {
  weddingId: string;
  initial: MomentForm;
  serverErrors: Problems;
  busy: boolean;
  submitLabel: string;
  onSubmit: (form: MomentForm) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [shown, setShown] = useState<MomentErrors>({});
  const [photoState, setPhotoState] = useState<{ working: boolean; message: string | null }>({ working: false, message: null });
  const errors: Problems = { ...serverErrors, ...shown };

  const set = <K extends keyof MomentForm>(key: K, value: MomentForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setShown((e) => ({ ...e, [key]: undefined }));
  };

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoState({ working: true, message: null });
    try {
      const small = await shrinkPhoto(file);
      const res = await fetch(`/api/weddings/${weddingId}/photos`, { method: "POST", headers: { "content-type": "application/octet-stream" }, body: small });
      if (!res.ok) {
        const text = parseMomentErrors(await res.json().catch(() => null)).form ?? "We could not upload that photo.";
        setPhotoState({ working: false, message: res.status === 401 ? "Your sign-in has expired. Sign in again to add photos." : text });
        return;
      }
      const { url } = (await res.json()) as { url: string };
      set("photo_url", url);
      setPhotoState({ working: false, message: null });
    } catch {
      setPhotoState({ working: false, message: "We could not reach the server. Check your connection and try again." });
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validateMoment(form);
    setShown(found);
    if (Object.keys(found).length === 0) onSubmit(form);
  }

  const field = (key: keyof MomentForm) => ({ "aria-invalid": errors[key] ? (true as const) : undefined, "aria-describedby": errors[key] ? `mo-err-${key}` : undefined });
  const problem = (key: keyof MomentForm) => (errors[key] ? <p id={`mo-err-${key}`} className={errorClass}>{errors[key]}</p> : null);

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-[20px] border border-line p-5 shadow-sm">
      <label className={box}>
        <span className={labelClass}>Title</span>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={MOMENT_LIMITS.title} autoComplete="off" {...field("title")} className={inputClass} />
      </label>
      {problem("title")}

      <label className={box}>
        <span className={labelClass}>Month and year (optional)</span>
        <input type="month" value={form.month} onChange={(e) => set("month", e.target.value)} {...field("month")} className={inputClass} />
      </label>
      {problem("month")}

      <label className={box}>
        <span className={labelClass}>A few words (optional)</span>
        <textarea value={form.caption} onChange={(e) => set("caption", e.target.value)} maxLength={MOMENT_LIMITS.caption} rows={3} {...field("caption")} className={`${inputClass} resize-y`} />
      </label>
      {problem("caption")}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Photo (optional)</span>
        {form.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.photo_url} alt="The photo you chose" className="max-h-60 w-full rounded-xl object-cover" />
        ) : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-ink px-5 text-[15px] font-bold hover:bg-surface has-[:disabled]:opacity-60">
            {photoState.working ? "Uploading..." : form.photo_url ? "Choose another photo" : "Choose a photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={photoState.working || busy} onChange={(e) => { void choosePhoto(e.target.files?.[0]); e.target.value = ""; }} className="sr-only" />
          </label>
          {form.photo_url ? (
            <button type="button" onClick={() => set("photo_url", "")} className="inline-flex min-h-11 items-center px-3 text-[15px] font-semibold text-danger underline">
              Remove photo
            </button>
          ) : null}
        </div>
        {photoState.message ? <p role="alert" className={errorClass}>{photoState.message}</p> : null}
        {problem("photo_url")}
        <p className="text-sm text-muted">Big photos are made smaller automatically, and where the photo was taken is removed.</p>
      </div>

      {errors.form ? <p role="alert" className={errorClass}>{errors.form}</p> : null}

      <div className="flex flex-wrap gap-2.5 pt-1">
        <button type="submit" disabled={busy || photoState.working} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition hover:bg-accent-dark disabled:opacity-60">
          {busy ? "Saving..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink px-6 text-base font-semibold hover:bg-surface disabled:opacity-60">
          Cancel
        </button>
      </div>
    </form>
  );
}

export function JourneyEditor({ weddingId, initialMoments }: Props) {
  const [moments, setMoments] = useState(initialMoments);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [serverErrors, setServerErrors] = useState<Problems>({});

  const base = `/api/weddings/${weddingId}/moments`;
  const full = moments.length >= MAX_MOMENTS;

  async function call(path: string, method: string, body?: unknown): Promise<Response | null> {
    try {
      return await fetch(path, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      setNotice({ kind: "error", text: "We could not reach the server. Check your connection and try again." });
      return null;
    }
  }

  async function explain(res: Response): Promise<string> {
    if (res.status === 401) return "Your sign-in has expired.";
    if (res.status === 404) return "This wedding or moment could not be found. Refresh the page.";
    if (res.status === 403) return "That request was not allowed.";
    return parseMomentErrors(await res.json().catch(() => null)).form ?? "We could not save that. Please try again.";
  }

  async function save(form: MomentForm) {
    setBusy(true);
    setNotice(null);
    setServerErrors({});
    const edit = editing?.mode === "edit" ? editing : null;
    const res = await call(edit ? `${base}/${edit.id}` : base, edit ? "PUT" : "POST", momentPayload(form));
    setBusy(false);
    if (!res) return;
    if (!res.ok) {
      if (res.status === 422) setServerErrors(parseMomentErrors(await res.json().catch(() => null)));
      else setNotice({ kind: "error", text: await explain(res), signIn: res.status === 401 });
      return;
    }
    const saved = (await res.json()) as MomentItem;
    setMoments((list) => (edit ? list.map((m) => (m.id === saved.id ? saved : m)) : [...list, saved]));
    setNotice({ kind: "ok", text: edit ? "Changes saved." : "Moment added." });
    setEditing(null);
  }

  async function remove(id: string) {
    setBusy(true);
    setNotice(null);
    const res = await call(`${base}/${id}`, "DELETE");
    setBusy(false);
    setConfirming(null);
    if (!res) return;
    if (!res.ok && res.status !== 404) return setNotice({ kind: "error", text: await explain(res), signIn: res.status === 401 });
    setMoments((list) => list.filter((m) => m.id !== id));
    setNotice({ kind: "ok", text: "Moment deleted." });
  }

  async function reorder(next: MomentItem[]) {
    const before = moments;
    setMoments(next);
    setNotice(null);
    const res = await call(`${base}/reorder`, "POST", { ids: next.map((m) => m.id) });
    if (!res) return setMoments(before);
    if (!res.ok) {
      setMoments(before);
      return setNotice({ kind: "error", text: await explain(res), signIn: res.status === 401 });
    }
    setMoments((await res.json()) as MomentItem[]);
  }

  const startAdd = (title = "") => {
    setServerErrors({});
    setConfirming(null);
    setEditing({ mode: "add", title });
  };
  const startEdit = (id: string) => {
    setServerErrors({});
    setConfirming(null);
    setEditing({ mode: "edit", id });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Our journey</h1>
          <p className="text-base text-muted">A few moments of your story, in order. Guests see them as a timeline.</p>
        </div>
        <button type="button" onClick={() => startAdd()} disabled={full || editing?.mode === "add"} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-bold hover:bg-surface disabled:opacity-50">
          Add a moment
        </button>
      </div>

      <div aria-live="polite">
        {notice ? (
          <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[15px] font-semibold ${notice.kind === "ok" ? "bg-[#e7f4ea] text-[#1b4a2a]" : "border border-danger text-danger"}`}>
            {notice.text}{" "}
            {notice.signIn ? (
              <Link href={`/login?next=${encodeURIComponent(`/editor/${weddingId}/journey`)}`} className="underline">
                Sign in again
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>

      {full ? <p className="text-sm text-muted">A story can have up to {MAX_MOMENTS} moments.</p> : null}

      {editing?.mode === "add" ? (
        <MomentFields weddingId={weddingId} initial={emptyMomentForm(editing.title)} serverErrors={serverErrors} busy={busy} submitLabel="Add moment" onSubmit={save} onCancel={() => setEditing(null)} />
      ) : null}

      {moments.length === 0 && editing?.mode !== "add" ? (
        <div className="flex flex-col items-start gap-4 rounded-[20px] border border-line p-7">
          <p className="text-lg text-muted">No moments yet. Start with one of these, or write your own.</p>
          <div className="flex flex-wrap gap-2.5">
            {MOMENT_IDEAS.map((idea) => (
              <button key={idea} type="button" onClick={() => startAdd(idea)} className="inline-flex min-h-11 items-center rounded-full border border-ink px-5 text-[15px] font-semibold hover:bg-surface">
                {idea}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ol className="flex flex-col gap-4">
        {moments.map((moment, index) => (
          <li key={moment.id}>
            {editing?.mode === "edit" && editing.id === moment.id ? (
              <MomentFields weddingId={weddingId} initial={formFromMoment(moment)} serverErrors={serverErrors} busy={busy} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(null)} />
            ) : (
              <article className="flex flex-col gap-3 rounded-[20px] border border-line p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    {moment.month ? <p className="text-[13px] font-bold text-accent">{monthLabel(moment.month)}</p> : null}
                    <h2 className="text-xl font-bold tracking-tight">{moment.title}</h2>
                    {moment.caption ? <p className="text-[15px] text-muted">{moment.caption}</p> : null}
                    {moment.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={moment.photo_url} alt="" className="mt-2 max-h-48 w-full rounded-xl object-cover sm:max-w-sm" />
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Move ${moment.title} up`} onClick={() => reorder(moveItem(moments, index, index - 1))} disabled={index === 0 || busy || editing !== null} className="inline-flex size-11 items-center justify-center rounded-full border border-line hover:bg-surface disabled:opacity-30">
                      {arrow(true)}
                    </button>
                    <button type="button" aria-label={`Move ${moment.title} down`} onClick={() => reorder(moveItem(moments, index, index + 1))} disabled={index === moments.length - 1 || busy || editing !== null} className="inline-flex size-11 items-center justify-center rounded-full border border-line hover:bg-surface disabled:opacity-30">
                      {arrow(false)}
                    </button>
                  </div>
                </div>

                {confirming === moment.id ? (
                  <div role="alertdialog" aria-label={`Delete ${moment.title}?`} className="flex flex-wrap items-center gap-2.5 rounded-xl bg-surface px-4 py-3">
                    <span className="text-[15px] font-semibold">Delete {moment.title}?</span>
                    <button type="button" onClick={() => remove(moment.id)} disabled={busy} className="inline-flex min-h-11 items-center rounded-xl bg-danger px-5 text-[15px] font-bold text-white disabled:opacity-60">
                      Yes, delete
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-semibold">
                      Keep it
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(moment.id)} disabled={busy || editing !== null} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-bold hover:bg-surface disabled:opacity-50">
                      Edit
                    </button>
                    <button type="button" onClick={() => setConfirming(moment.id)} disabled={busy || editing !== null} className="inline-flex min-h-11 items-center rounded-xl px-4 text-[15px] font-semibold text-danger underline disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                )}
              </article>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
