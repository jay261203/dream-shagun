export const MAX_MOMENTS = 12;

export type MomentItem = {
  id: string;
  title: string;
  /** "2024-03", or null when the family left the date out. */
  month: string | null;
  caption: string | null;
  photo_url: string | null;
  sort_order: number;
};

export type MomentForm = { title: string; month: string; caption: string; photo_url: string };
export type MomentErrors = Partial<Record<keyof MomentForm, string>>;

export const MOMENT_LIMITS = { title: 80, caption: 300 } as const;

/** Ideas to start from, shown as buttons so a family is never staring at an empty box. */
export const MOMENT_IDEAS = ["How we met", "First date", "The proposal", "The engagement"] as const;

export function emptyMomentForm(title = ""): MomentForm {
  return { title, month: "", caption: "", photo_url: "" };
}

export function formFromMoment(m: MomentItem): MomentForm {
  return { title: m.title, month: m.month ?? "", caption: m.caption ?? "", photo_url: m.photo_url ?? "" };
}

export function momentPayload(f: MomentForm) {
  return { title: f.title.trim(), month: f.month || null, caption: f.caption.trim() || null, photo_url: f.photo_url || null };
}

export function validateMoment(f: MomentForm): MomentErrors {
  const errors: MomentErrors = {};
  if (!f.title.trim()) errors.title = "Give this moment a title.";
  else if (f.title.trim().length > MOMENT_LIMITS.title) errors.title = `Keep the title under ${MOMENT_LIMITS.title} letters.`;
  if (f.month) {
    const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(f.month);
    if (!m || +m[1] < 1950 || +m[1] > 2100) errors.month = "Pick a month and year between 1950 and 2100.";
  }
  if (f.caption.trim().length > MOMENT_LIMITS.caption) errors.caption = `Keep the caption under ${MOMENT_LIMITS.caption} letters.`;
  return errors;
}

const FIELD_WORDS: Record<string, string> = { title: "title", month: "month", caption: "caption", photo_url: "photo" };

/** Turn the API's refusal into plain wording next to the right field. */
export function parseMomentErrors(body: unknown): MomentErrors & { form?: string } {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return { form: detail };
  if (Array.isArray(detail)) {
    const out: MomentErrors & { form?: string } = {};
    for (const item of detail as { loc?: unknown[]; msg?: string }[]) {
      const field = String(item.loc?.[item.loc.length - 1] ?? "");
      if (field in FIELD_WORDS) out[field as keyof MomentForm] = `Check the ${FIELD_WORDS[field]}.`;
    }
    return Object.keys(out).length > 0 ? out : { form: "Something in the form was not accepted. Check it and try again." };
  }
  return { form: "We could not save that. Please try again." };
}

/** "March 2024" from "2024-03", with no time-zone arithmetic. */
export function monthLabel(month: string | null): string | null {
  const m = month ? /^(\d{4})-(\d{2})$/.exec(month) : null;
  if (!m) return null;
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(+m[1], +m[2] - 1, 1)));
}

export function rowToMoment(row: Record<string, unknown>): MomentItem {
  const happened = typeof row.happened_on === "string" ? row.happened_on.slice(0, 7) : null;
  return {
    id: String(row.id),
    title: String(row.title),
    month: happened,
    caption: (row.caption as string | null) ?? null,
    photo_url: (row.photo_url as string | null) ?? null,
    sort_order: Number(row.sort_order ?? 0),
  };
}

/** Size to draw a photo at so its longest side is at most `max`, never enlarging it. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
