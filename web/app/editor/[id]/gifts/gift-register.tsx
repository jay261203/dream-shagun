"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  GIFT_LIMITS,
  METHOD_LABELS,
  filterGifts,
  formatRupees,
  giftPayload,
  giftTotals,
  statusLabel,
  validateGift,
  type GiftFilter,
  type GiftForm,
  type GiftFormErrors,
  type GiftMethod,
  type GiftRow,
  type GiftSideKey,
} from "@/lib/gifts";

type Props = { weddingId: string; rows: GiftRow[]; myMemberId: string | null; brideName: string; groomName: string };

const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

const box = "flex flex-col rounded-xl border border-field bg-white px-3.5 py-2.5 focus-within:border-ink";
const labelClass = "text-[11px] font-bold uppercase tracking-wide";
const inputClass = "bg-transparent pt-0.5 text-base outline-none";
const errorClass = "text-sm font-semibold text-danger";
const chip = (on: boolean) => `inline-flex min-h-11 items-center rounded-full border px-4 text-[15px] ${on ? "border-ink bg-ink font-bold text-white" : "border-line font-medium hover:bg-surface"}`;
const smallButton = "inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-[15px] font-semibold disabled:opacity-50";

const STATUS_STYLE: Record<GiftRow["status"], string> = {
  received: "border-[#b6dfc0] bg-[#e7f4ea] text-[#1b4a2a]",
  rejected: "border-line bg-surface text-muted",
  claimed: "border-[#f0d79a] bg-[#fdf5e1] text-[#5c4410]",
};

const blankForm = (side: GiftSideKey): GiftForm => ({ side, giver_name: "", method: "cash", amount: "", description: "", note: "" });

/** The hosts' private register: totals of received gifts, filters, "Record a gift", and a check on every row. */
export function GiftRegister({ weddingId, rows, myMemberId, brideName, groomName }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [filter, setFilter] = useState<GiftFilter>({ side: "all", status: "all" });
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; text: string } | null>(null);

  const sideName = (side: GiftSideKey) => `${side === "bride" ? brideName : groomName}'s side`;
  const byWhom = (memberId: string | null) => (memberId && memberId === myMemberId ? "you" : "another host");
  const totals = giftTotals(rows);
  const shown = filterGifts(rows, filter);
  const unchecked = rows.filter((r) => r.status === "claimed").length;

  async function change(row: GiftRow, request: () => Promise<Response>) {
    setBusyId(row.id);
    setRowError(null);
    try {
      const res = await request();
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail;
        setRowError({ id: row.id, text: res.status === 401 ? "Your sign-in has expired. Sign in again." : typeof detail === "string" ? detail : "That did not save. Try again." });
        return;
      }
      startRefresh(() => router.refresh());
    } catch {
      setRowError({ id: row.id, text: "We could not reach the server. Check your connection and try again." });
    } finally {
      setBusyId(null);
    }
  }

  const check = (row: GiftRow, status: "received" | "not_received" | "unchecked") =>
    change(row, () => fetch(`/api/weddings/${weddingId}/gifts/${row.id}/status`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ status }) }));

  const remove = (row: GiftRow) => {
    if (!window.confirm(`Remove the gift from ${row.giver_name}? This cannot be undone.`)) return;
    void change(row, () => fetch(`/api/weddings/${weddingId}/gifts/${row.id}`, { method: "DELETE" }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Gift register</h1>
          <p className="text-base text-muted">Every gift you receive, in one private list. Only the hosts of this invitation can see it.</p>
        </div>
        {!adding ? (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition hover:bg-accent-dark">
            Record a gift
          </button>
        ) : null}
      </div>

      {adding ? <RecordForm weddingId={weddingId} sideName={sideName} onDone={(saved) => { setAdding(false); if (saved) startRefresh(() => router.refresh()); }} /> : null}

      <section aria-labelledby="totals-title" className="flex flex-col gap-3">
        <h2 id="totals-title" className="sr-only">Totals</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {(["bride", "groom", "all"] as const).map((key) => (
            <li key={key} className="flex flex-col gap-1 rounded-[20px] border border-line p-5">
              <p className="text-[15px] font-semibold text-muted">{key === "all" ? "Both sides" : sideName(key)}</p>
              <p className="text-2xl font-bold tabular-nums">{formatRupees(totals[key].amountPaise)}</p>
              <p className="text-[15px] text-muted">
                {totals[key].moneyCount} money {totals[key].moneyCount === 1 ? "gift" : "gifts"}, {totals[key].physicalCount} physical {totals[key].physicalCount === 1 ? "gift" : "gifts"}
              </p>
            </li>
          ))}
        </ul>
        <p className="text-[15px] text-muted">
          Totals count only gifts marked received.{unchecked ? ` ${unchecked} still ${unchecked === 1 ? "needs" : "need"} checking.` : ""}
        </p>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-[20px] border border-line p-7">
          <p className="text-lg text-muted">Nothing here yet. Record cash, a transfer you saw in your bank app, or a physical gift. Notes guests leave on the gift page appear here too.</p>
        </div>
      ) : (
        <section aria-labelledby="list-title" className="flex flex-col gap-4">
          <h2 id="list-title" className="sr-only">Gifts</h2>
          <div className="flex flex-col gap-3">
            <div role="group" aria-label="Show side" className="flex flex-wrap gap-2">
              {(["all", "bride", "groom"] as const).map((side) => (
                <button key={side} type="button" aria-pressed={filter.side === side} onClick={() => setFilter((f) => ({ ...f, side }))} className={chip(filter.side === side)}>
                  {side === "all" ? "Both sides" : sideName(side)}
                </button>
              ))}
            </div>
            <div role="group" aria-label="Show check" className="flex flex-wrap gap-2">
              {([["all", "All"], ["unchecked", "Not checked"], ["received", "Received"], ["rejected", "Not received"]] as const).map(([status, label]) => (
                <button key={status} type="button" aria-pressed={filter.status === status} onClick={() => setFilter((f) => ({ ...f, status }))} className={chip(filter.status === status)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {shown.length === 0 ? <p className="text-base text-muted">No gifts match this filter.</p> : null}
          <ul className={`flex flex-col gap-3 ${refreshing ? "opacity-60" : ""}`} aria-busy={refreshing}>
            {shown.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 rounded-[20px] border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-lg font-bold">{row.giver_name}</h3>
                  <span className={`inline-flex min-h-7 items-center rounded-full border px-3 text-[13px] font-bold ${STATUS_STYLE[row.status]}`}>{statusLabel(row)}</span>
                </div>
                <p className="text-base">
                  {row.method === "gift" ? (
                    <span className="font-semibold">{row.description}</span>
                  ) : row.amount_paise === null ? (
                    <span className="text-muted">Amount not given</span>
                  ) : (
                    <span className="font-semibold">{formatRupees(row.amount_paise)}</span>
                  )}
                  <span className="text-muted"> · {METHOD_LABELS[row.method]} · {sideName(row.side)}</span>
                </p>
                {row.note ? <p className="whitespace-pre-wrap text-[15px]">{row.note}</p> : null}
                <p className="text-[14px] text-muted">
                  {row.source === "guest" ? `From the guest's note, ${when.format(new Date(row.created_at))}` : `Recorded ${when.format(new Date(row.created_at))}`}
                  {row.status === "received" && row.received_at ? ` · Marked received by ${byWhom(row.received_by)}, ${when.format(new Date(row.received_at))}` : ""}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {row.status !== "received" ? (
                    <button type="button" disabled={busyId === row.id} onClick={() => check(row, "received")} className={`${smallButton} border-ink`}>
                      Received
                    </button>
                  ) : null}
                  {row.status !== "rejected" ? (
                    <button type="button" disabled={busyId === row.id} onClick={() => check(row, "not_received")} className={`${smallButton} border-line hover:bg-surface`}>
                      Not received
                    </button>
                  ) : null}
                  {row.status !== "claimed" && row.source === "guest" ? (
                    <button type="button" disabled={busyId === row.id} onClick={() => check(row, "unchecked")} className={`${smallButton} border-line hover:bg-surface`}>
                      Not checked yet
                    </button>
                  ) : null}
                  <button type="button" disabled={busyId === row.id} onClick={() => remove(row)} className={`${smallButton} border-transparent text-danger hover:bg-surface`}>
                    Remove
                  </button>
                </div>
                {rowError?.id === row.id ? <p role="alert" className={errorClass}>{rowError.text}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function RecordForm({ weddingId, sideName, onDone }: { weddingId: string; sideName: (side: GiftSideKey) => string; onDone: (saved: boolean) => void }) {
  const [form, setForm] = useState<GiftForm>(blankForm("bride"));
  const [errors, setErrors] = useState<GiftFormErrors>({});
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof GiftForm>(key: K, value: GiftForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, form: undefined }));
  };

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const found = validateGift(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/gifts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(giftPayload(form)) });
      if (!res.ok) {
        const detail = (await res.json().catch(() => null))?.detail;
        const text = Array.isArray(detail) ? String(detail[0]?.msg ?? "").replace(/^Value error, /, "") : typeof detail === "string" ? detail : "";
        setErrors({ form: res.status === 401 ? "Your sign-in has expired. Sign in again to save." : text || "That did not save. Check it and try again." });
        return;
      }
      onDone(true);
    } catch {
      setErrors({ form: "We could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  const field = (key: keyof GiftFormErrors) => ({ "aria-invalid": errors[key] ? (true as const) : undefined, "aria-describedby": errors[key] ? `gift-err-${key}` : undefined });
  const problem = (key: keyof GiftFormErrors) => (errors[key] ? <p id={`gift-err-${key}`} className={errorClass}>{errors[key]}</p> : null);

  return (
    <form onSubmit={save} noValidate aria-labelledby="record-title" className="flex flex-col gap-4 rounded-[20px] border border-line p-6">
      <h2 id="record-title" className="text-xl font-bold tracking-tight">Record a gift</h2>
      <p className="-mt-2 text-[15px] text-muted">A gift you record is counted as received.</p>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>What was it</legend>
        <div className="flex flex-wrap gap-2">
          {(["cash", "upi", "gift"] as GiftMethod[]).map((method) => (
            <label key={method} className={`${chip(form.method === method)} cursor-pointer has-[:focus-visible]:outline-2`}>
              <input type="radio" name="method" value={method} checked={form.method === method} onChange={() => set("method", method)} className="sr-only" />
              {method === "upi" ? "UPI or bank transfer" : METHOD_LABELS[method]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={`${labelClass} mb-2`}>Whose side</legend>
        <div className="flex flex-wrap gap-2">
          {(["bride", "groom"] as GiftSideKey[]).map((side) => (
            <label key={side} className={`${chip(form.side === side)} cursor-pointer has-[:focus-visible]:outline-2`}>
              <input type="radio" name="side" value={side} checked={form.side === side} onChange={() => set("side", side)} className="sr-only" />
              {sideName(side)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <label className={`${box} min-w-52 flex-[2]`}>
          <span className={labelClass}>From</span>
          <input value={form.giver_name} onChange={(e) => set("giver_name", e.target.value)} maxLength={GIFT_LIMITS.giver_name} autoComplete="off" placeholder="For example, Sharma uncle" {...field("giver_name")} className={inputClass} />
        </label>
        {form.method === "gift" ? (
          <label className={`${box} min-w-52 flex-[2]`}>
            <span className={labelClass}>The gift</span>
            <input value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={GIFT_LIMITS.description} autoComplete="off" placeholder="For example, Silver diya set" {...field("description")} className={inputClass} />
          </label>
        ) : (
          <label className={`${box} min-w-40 flex-1`}>
            <span className={labelClass}>Amount in rupees</span>
            <input value={form.amount} onChange={(e) => set("amount", e.target.value)} inputMode="numeric" autoComplete="off" placeholder="5100" {...field("amount")} className={`${inputClass} tabular-nums`} />
          </label>
        )}
      </div>
      {problem("giver_name")}
      {problem("amount")}
      {problem("description")}

      <label className={box}>
        <span className={labelClass}>Note (optional)</span>
        <textarea value={form.note} onChange={(e) => set("note", e.target.value)} maxLength={GIFT_LIMITS.note} rows={2} {...field("note")} className={`${inputClass} resize-y`} />
      </label>
      {problem("note")}

      {errors.form ? <p role="alert" className={errorClass}>{errors.form}</p> : null}

      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={busy} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-accent px-6 text-base font-bold text-white transition hover:bg-accent-dark disabled:opacity-50">
          {busy ? "Saving..." : "Save gift"}
        </button>
        <button type="button" disabled={busy} onClick={() => onDone(false)} className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ink px-6 text-base font-semibold hover:bg-surface">
          Cancel
        </button>
      </div>
    </form>
  );
}
