"use client";

import { useState } from "react";

import { SaveStatus } from "@/components/save-status";
import { useAutosave } from "@/lib/use-autosave";
import { SIDE_LIMITS, SIDES, maskUpi, parseSideErrors, sidePayload, validateSide, type SideErrors, type SideForm, type SideKey } from "@/lib/sides";

type GiftMode = "off" | "link" | "private";
type Props = { weddingId: string; slug: string; published: boolean; giftMode: GiftMode; brideName: string; groomName: string; initial: Record<SideKey, SideForm> };

const GIFT_CHOICES: { key: GiftMode; label: string; hint: string }[] = [
  { key: "link", label: "A small link on the invitation", hint: "A quiet \"Thinking of a gift?\" link under the messages." },
  { key: "private", label: "A private link only", hint: "No link on the invitation. You send the address to the people you choose." },
  { key: "off", label: "Not mentioned", hint: "No gift page at all." },
];
type Problems = SideErrors & { form?: string };

const box = "flex flex-col rounded-xl border border-field bg-white px-3.5 py-2.5 focus-within:border-ink";
const labelClass = "text-[11px] font-bold uppercase tracking-wide";
const inputClass = "bg-transparent pt-0.5 text-base outline-none";
const errorClass = "text-sm font-semibold text-danger";

function SideCard({ weddingId, side, title, initial, onSaved }: { weddingId: string; side: SideKey; title: string; initial: SideForm; onSaved: (side: SideKey, form: SideForm) => void }) {
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
      onSaved(side, form);
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

/** How gifts are treated: the choice saves at once. A private link shows its address to copy. */
function GiftSetting({ weddingId, slug, published, initial, ready }: { weddingId: string; slug: string; published: boolean; initial: GiftMode; ready: boolean }) {
  const [mode, setMode] = useState(initial);
  const { save, state, savedAt, message } = useAutosave(weddingId, 150);
  const [copied, setCopied] = useState(false);
  const address = typeof window === "undefined" ? `/w/${slug}/gift` : `${window.location.origin}/w/${slug}/gift`;

  return (
    <fieldset className="flex flex-col gap-3 rounded-[20px] border border-line p-6">
      <legend className="px-1 text-xl font-bold tracking-tight">Gift page</legend>
      <p className="text-[15px] text-muted">Gifts are never asked for on the invitation. Guests only see this page if they choose to open it.</p>
      {GIFT_CHOICES.map((c) => (
        <label key={c.key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-field p-3.5 has-[:checked]:border-ink">
          <input type="radio" name="gift-mode" value={c.key} checked={mode === c.key} onChange={() => { setMode(c.key); save({ gift_mode: c.key }); }} className="mt-1 size-5 shrink-0 accent-accent" />
          <span className="flex flex-col gap-0.5">
            <span className="text-base font-bold">{c.label}</span>
            <span className="text-[15px] text-muted">{c.hint}</span>
          </span>
        </label>
      ))}
      {mode !== "off" && !ready ? <p role="status" className="text-[15px] font-semibold text-danger">No side has a UPI ID and a name saved yet, so the gift page will be empty. Add them below.</p> : null}
      {mode === "private" ? (
        <div className="flex flex-col items-start gap-2 rounded-xl bg-surface p-4">
          <p className="text-[15px]">{published ? "Send this address to the people you choose:" : "This address works once you publish:"}</p>
          <code className="break-all text-[15px] font-semibold">{address}</code>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }, () => undefined); }} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink px-5 text-base font-semibold hover:bg-white">
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
      ) : null}
      <SaveStatus state={state} savedAt={savedAt} message={message} />
    </fieldset>
  );
}

/** The gift page setting, then a wish, a UPI ID and a payee name for each side. The two sides never mix, and the UPI ID only shows on the gift page. */
export function WishesEditor({ weddingId, slug, published, giftMode, brideName, groomName, initial }: Props) {
  const titles: Record<SideKey, string> = { bride: `${brideName}'s side`, groom: `${groomName}'s side` };
  const [saved, setSaved] = useState(initial);
  const ready = SIDES.some((s) => saved[s].upi_id.trim() && saved[s].payee_name.trim());
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Gifts and wishes</h1>
        <p className="text-base text-muted">Where gifts can be sent, if guests want to. The money goes straight to your UPI ID; we never hold it.</p>
      </div>
      <GiftSetting weddingId={weddingId} slug={slug} published={published} initial={giftMode} ready={ready} />
      {SIDES.map((side) => (
        <SideCard key={side} weddingId={weddingId} side={side} title={titles[side]} initial={initial[side]} onSaved={(s, f) => setSaved((prev) => ({ ...prev, [s]: f }))} />
      ))}
    </div>
  );
}
