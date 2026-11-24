"use client";

import { useState } from "react";

import { SIDE_LIMITS, SIDES, maskUpi, parseSideErrors, sidePayload, validateSide, type SideErrors, type SideForm, type SideKey } from "@/lib/sides";

type Props = { weddingId: string; brideName: string; groomName: string; initial: Record<SideKey, SideForm> };
type Problems = SideErrors & { form?: string };

const box = "flex flex-col rounded-xl border border-field bg-white px-3.5 py-2.5 focus-within:border-ink";
const labelClass = "text-[11px] font-bold uppercase tracking-wide";
const inputClass = "bg-transparent pt-0.5 text-base outline-none";
const errorClass = "text-sm font-semibold text-danger";

function SideCard({ weddingId, side, title, initial }: { weddingId: string; side: SideKey; title: string; initial: SideForm }) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [problems, setProblems] = useState<Problems>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [test, setTest] = useState<{ link: string; qr: string } | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const dirty = JSON.stringify(sidePayload(form)) !== JSON.stringify(sidePayload(saved));
  const canTest = !dirty && Boolean(saved.upi_id.trim() && saved.payee_name.trim());

  const set = <K extends keyof SideForm>(key: K, value: SideForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setProblems((p) => ({ ...p, [key]: undefined, form: undefined }));
    setNote(null);
    setTest(null);
    setTestError(null);
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const found = validateSide(form);
    setProblems(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/sides/${side}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(sidePayload(form)) });
      if (!res.ok) {
        setProblems(res.status === 401 ? { form: "Your sign-in has expired. Sign in again to save." } : parseSideErrors(await res.json().catch(() => null)));
        return;
      }
      setSaved(form);
      setNote("Saved.");
    } catch {
      setProblems({ form: "We could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function checkWithRupee() {
    setBusy(true);
    setTest(null);
    setTestError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/sides/${side}/test`, { method: "POST" });
      if (!res.ok) {
        setTestError(parseSideErrors(await res.json().catch(() => null)).form ?? "We could not make the test link.");
        return;
      }
      setTest((await res.json()) as { link: string; qr: string });
    } catch {
      setTestError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof SideForm) => ({ "aria-invalid": problems[key] ? (true as const) : undefined, "aria-describedby": problems[key] ? `${side}-err-${key}` : undefined });
  const problem = (key: keyof SideForm) => (problems[key] ? <p id={`${side}-err-${key}`} className={errorClass}>{problems[key]}</p> : null);

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4 rounded-[20px] border border-line p-6" aria-labelledby={`${side}-title`}>
      <h2 id={`${side}-title`} className="text-xl font-bold tracking-tight">{title}</h2>

      <label className={box}>
        <span className={labelClass}>A short wish for guests (optional)</span>
        <input value={form.wish} onChange={(e) => set("wish", e.target.value)} maxLength={SIDE_LIMITS.wish} autoComplete="off" placeholder="For example, Bless us as we build our home" {...field("wish")} className={inputClass} />
      </label>
      {problem("wish")}

      <div className="flex flex-wrap gap-3">
        <label className={`${box} min-w-52 flex-[2]`}>
          <span className={labelClass}>UPI ID</span>
          <input value={form.upi_id} onChange={(e) => set("upi_id", e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="name@bank" inputMode="email" {...field("upi_id")} className={inputClass} />
        </label>
        <label className={`${box} min-w-44 flex-1`}>
          <span className={labelClass}>Name guests see when paying</span>
          <input value={form.payee_name} onChange={(e) => set("payee_name", e.target.value)} maxLength={SIDE_LIMITS.payee_name} autoComplete="off" {...field("payee_name")} className={inputClass} />
        </label>
      </div>
      {problem("upi_id")}
      {problem("payee_name")}

      {problems.form ? <p role="alert" className={errorClass}>{problems.form}</p> : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <button type="submit" disabled={busy || !dirty} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition hover:bg-accent-dark disabled:opacity-50">
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={checkWithRupee} disabled={busy || !canTest} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink px-6 text-base font-semibold hover:bg-surface disabled:opacity-50">
          Check with ₹1
        </button>
        <p role="status" aria-live="polite" className="text-[15px] font-semibold text-muted">{note ?? (dirty ? "Not saved yet" : saved.upi_id ? `Saved: ${maskUpi(saved.upi_id.trim())}` : "")}</p>
      </div>

      {testError ? <p role="alert" className={errorClass}>{testError}</p> : null}
      {test ? (
        <div className="flex flex-col items-start gap-3 rounded-xl bg-surface p-5">
          <p className="text-[15px]">
            Pay ₹1 from another phone to check the money reaches the right account. Nothing is recorded; this is only a test.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={test.qr} alt="QR code for the one rupee test payment" width={160} height={160} className="rounded-xl border border-line bg-white" />
            <a href={test.link} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white hover:bg-accent-dark">
              Open my UPI app
            </a>
          </div>
        </div>
      ) : null}
    </form>
  );
}

/** A wish, a UPI ID and a payee name for each side. The two sides never mix, and guests never see the UPI ID. */
export function WishesEditor({ weddingId, brideName, groomName, initial }: Props) {
  const titles: Record<SideKey, string> = { bride: `${brideName}'s side`, groom: `${groomName}'s side` };
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Wishes and UPI</h1>
        <p className="text-base text-muted">Guests pay Shagun straight to your account. We never hold the money, and guests never see your UPI ID.</p>
      </div>
      {SIDES.map((side) => (
        <SideCard key={side} weddingId={weddingId} side={side} title={titles[side]} initial={initial[side]} />
      ))}
    </div>
  );
}
