/** The hosts' private gift register (DS-25): labels, totals and the "record a gift" form checks. No React here. */

export type GiftSideKey = "bride" | "groom";
export type GiftMethod = "upi" | "cash" | "gift";
export type GiftStatus = "claimed" | "received" | "rejected";

export type GiftRow = {
  id: string;
  created_at: string;
  side: GiftSideKey;
  giver_name: string;
  method: GiftMethod;
  amount_paise: number | null;
  description: string | null;
  note: string | null;
  status: GiftStatus;
  source: "guest" | "host";
  received_by: string | null;
  received_at: string | null;
};

export const GIFT_COLUMNS = "id, created_at, side, giver_name, method, amount_paise, description, note, status, source, received_by, received_at";

export const METHOD_LABELS: Record<GiftMethod, string> = { upi: "UPI", cash: "Cash", gift: "Physical gift" };

/** What the host sees on each row. A guest's note that nobody has checked says so plainly. */
export function statusLabel(row: Pick<GiftRow, "status" | "source">): string {
  if (row.status === "received") return "Received";
  if (row.status === "rejected") return "Not received";
  return row.source === "guest" ? "Guest says sent, not checked" : "Not checked";
}

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatRupees(paise: number): string {
  return rupees.format(Math.round(paise / 100));
}

export type SideTotal = { amountPaise: number; moneyCount: number; physicalCount: number };
export type GiftTotals = Record<GiftSideKey | "all", SideTotal>;

/** Totals count received gifts only: a guest's note or an unchecked row never moves them. No targets, no progress. */
export function giftTotals(rows: readonly Pick<GiftRow, "side" | "method" | "amount_paise" | "status">[]): GiftTotals {
  const empty = (): SideTotal => ({ amountPaise: 0, moneyCount: 0, physicalCount: 0 });
  const totals: GiftTotals = { bride: empty(), groom: empty(), all: empty() };
  for (const row of rows) {
    if (row.status !== "received") continue;
    for (const key of [row.side, "all"] as const) {
      if (row.method === "gift") totals[key].physicalCount += 1;
      else {
        totals[key].amountPaise += row.amount_paise ?? 0;
        totals[key].moneyCount += 1;
      }
    }
  }
  return totals;
}

export type GiftFilter = { side: GiftSideKey | "all"; status: "all" | "unchecked" | "received" | "rejected" };

export function filterGifts<T extends Pick<GiftRow, "side" | "status">>(rows: readonly T[], filter: GiftFilter): T[] {
  return rows.filter(
    (r) => (filter.side === "all" || r.side === filter.side) && (filter.status === "all" || (filter.status === "unchecked" ? r.status === "claimed" : r.status === filter.status)),
  );
}

export type GiftForm = { side: GiftSideKey; giver_name: string; method: GiftMethod; amount: string; description: string; note: string };
export type GiftFormErrors = Partial<Record<"giver_name" | "amount" | "description" | "note" | "form", string>>;

export const GIFT_LIMITS = { giver_name: 120, description: 200, note: 300, maxRupees: 10_000_000 } as const;

/** Same rules as the API, so the host sees a problem before sending. The API still decides. */
export function validateGift(form: GiftForm): GiftFormErrors {
  const errors: GiftFormErrors = {};
  const name = form.giver_name.trim();
  if (!name) errors.giver_name = "Enter who gave it";
  else if (name.length > GIFT_LIMITS.giver_name) errors.giver_name = `Keep the name under ${GIFT_LIMITS.giver_name} letters`;
  if (form.method === "gift") {
    if (!form.description.trim()) errors.description = "Say what the gift was";
    else if (form.description.trim().length > GIFT_LIMITS.description) errors.description = `Keep it under ${GIFT_LIMITS.description} letters`;
  } else {
    const raw = form.amount.replace(/[,\s₹]/g, "");
    if (!raw) errors.amount = "Enter the amount in rupees";
    else if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > GIFT_LIMITS.maxRupees) errors.amount = "Write whole rupees, for example 5100";
  }
  if (form.note.trim().length > GIFT_LIMITS.note) errors.note = `Keep the note under ${GIFT_LIMITS.note} letters`;
  return errors;
}

export function giftPayload(form: GiftForm): Record<string, unknown> {
  const body: Record<string, unknown> = { side: form.side, giver_name: form.giver_name.trim(), method: form.method };
  if (form.method === "gift") body.description = form.description.trim();
  else body.amount_rupees = Number(form.amount.replace(/[,\s₹]/g, ""));
  if (form.note.trim()) body.note = form.note.trim();
  return body;
}
