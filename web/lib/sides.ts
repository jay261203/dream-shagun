export type SideKey = "bride" | "groom";
export const SIDES: SideKey[] = ["bride", "groom"];

export type SideForm = { upi_id: string; payee_name: string; wish: string };
export type SideErrors = Partial<Record<keyof SideForm, string>>;

export const SIDE_LIMITS = { payee_name: 60, wish: 120 } as const;

// Same shape the API accepts: a name, an @, and the bank's handle. The API checks again.
const UPI_ID = /^[A-Za-z0-9_.-]{2,256}@[A-Za-z]{2,64}$/;

export const isSide = (value: string): value is SideKey => value === "bride" || value === "groom";

export function validateSide(f: SideForm): SideErrors {
  const errors: SideErrors = {};
  const id = f.upi_id.trim();
  const name = f.payee_name.trim();
  if (id && !UPI_ID.test(id)) errors.upi_id = "Check the UPI ID. It looks like name@bank.";
  else if (id && !name) errors.payee_name = "Add the name guests will see when they pay.";
  if (!id && name) errors.upi_id = "Add the UPI ID for this name.";
  if (name.length > SIDE_LIMITS.payee_name) errors.payee_name = `Keep the name under ${SIDE_LIMITS.payee_name} letters.`;
  if (f.wish.trim().length > SIDE_LIMITS.wish) errors.wish = `Keep the wish under ${SIDE_LIMITS.wish} letters.`;
  return errors;
}

export function sidePayload(f: SideForm) {
  return { upi_id: f.upi_id.trim() || null, payee_name: f.payee_name.trim() || null, wish: f.wish.trim() || null };
}

const FIELDS: (keyof SideForm)[] = ["upi_id", "payee_name", "wish"];

/** The API's refusal, in words, next to the right field where it names one. */
export function parseSideErrors(body: unknown): SideErrors & { form?: string } {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return { form: detail };
  if (Array.isArray(detail)) {
    const out: SideErrors & { form?: string } = {};
    for (const item of detail as { loc?: unknown[]; msg?: string }[]) {
      const field = String(item.loc?.[item.loc.length - 1] ?? "");
      const message = (item.msg ?? "").replace(/^Value error, /, "");
      if ((FIELDS as string[]).includes(field)) out[field as keyof SideForm] = message || "Check this.";
      else if (message) out.form = message;
    }
    return Object.keys(out).length > 0 ? out : { form: "Something was not accepted. Check it and try again." };
  }
  return { form: "We could not save that. Please try again." };
}

/** "mee***@okhdfc": enough to recognise your own ID without showing it in full on a screenshot. */
export function maskUpi(id: string): string {
  const at = id.indexOf("@");
  if (at < 1) return id;
  return `${id.slice(0, Math.min(3, at))}${"*".repeat(Math.max(1, at - 3))}${id.slice(at)}`;
}
