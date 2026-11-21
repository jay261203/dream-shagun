import { validDate } from "@/lib/templates/preview";

export type EventKind = "mehendi" | "haldi" | "sangeet" | "pheras" | "reception" | "other";

export const EVENT_KINDS: { value: EventKind; label: string; defaultName: string; defaultTime: string }[] = [
  { value: "mehendi", label: "Mehendi", defaultName: "Mehendi", defaultTime: "11:00" },
  { value: "haldi", label: "Haldi", defaultName: "Haldi", defaultTime: "10:00" },
  { value: "sangeet", label: "Sangeet", defaultName: "Sangeet", defaultTime: "19:00" },
  { value: "pheras", label: "Pheras", defaultName: "Pheras", defaultTime: "10:30" },
  { value: "reception", label: "Reception", defaultName: "Reception", defaultTime: "19:30" },
  { value: "other", label: "Other", defaultName: "", defaultTime: "10:00" },
];

export const MAX_EVENTS = 20;

/** One event as the editor holds it. Date and time are India time, as a person would write them. */
export type EventItem = {
  id: string;
  name: string;
  kind: EventKind;
  starts_at: string;
  local_date: string;
  local_time: string;
  venue_name: string | null;
  venue_address: string | null;
  map_url: string | null;
  dress_code: string | null;
  note: string | null;
  sort_order: number;
};

/** The form: everything is text while it is being typed. */
export type EventForm = {
  name: string;
  kind: EventKind;
  local_date: string;
  local_time: string;
  venue_name: string;
  venue_address: string;
  map_url: string;
  dress_code: string;
  note: string;
};

export type FormErrors = Partial<Record<keyof EventForm, string>>;

export function kindInfo(kind: string) {
  return EVENT_KINDS.find((k) => k.value === kind) ?? EVENT_KINDS[EVENT_KINDS.length - 1];
}

export function emptyForm(weddingDate: string | null): EventForm {
  const kind = EVENT_KINDS[0];
  return {
    name: kind.defaultName,
    kind: kind.value,
    local_date: weddingDate ?? "",
    local_time: kind.defaultTime,
    venue_name: "",
    venue_address: "",
    map_url: "",
    dress_code: "",
    note: "",
  };
}

export function formFromEvent(e: EventItem): EventForm {
  return {
    name: e.name,
    kind: e.kind,
    local_date: e.local_date,
    local_time: e.local_time,
    venue_name: e.venue_name ?? "",
    venue_address: e.venue_address ?? "",
    map_url: e.map_url ?? "",
    dress_code: e.dress_code ?? "",
    note: e.note ?? "",
  };
}

/** What is sent to the API: trimmed, and empty optional fields left out as nothing. */
export function toPayload(f: EventForm) {
  const opt = (v: string) => (v.trim() === "" ? null : v.trim());
  return {
    name: f.name.trim(),
    kind: f.kind,
    local_date: f.local_date,
    local_time: f.local_time,
    venue_name: opt(f.venue_name),
    venue_address: opt(f.venue_address),
    map_url: opt(f.map_url),
    dress_code: opt(f.dress_code),
    note: opt(f.note),
  };
}

export const LIMITS = { name: 80, venue_name: 120, venue_address: 250, map_url: 500, dress_code: 120, note: 300 } as const;

/** Plain-language problems with the form, per field. The API checks again; this saves a round trip. */
export function validateForm(f: EventForm): FormErrors {
  const errors: FormErrors = {};
  if (!f.name.trim()) errors.name = "Give the event a name.";
  else if (f.name.trim().length > LIMITS.name) errors.name = `Keep the name under ${LIMITS.name} letters.`;
  if (!validDate(f.local_date)) errors.local_date = "Pick the date.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.local_time)) errors.local_time = "Pick the time.";
  const url = f.map_url.trim();
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
    } catch {
      errors.map_url = "The map link must start with https://";
    }
  }
  for (const key of ["venue_name", "venue_address", "dress_code", "note"] as const) {
    if (f[key].trim().length > LIMITS[key]) errors[key] = `Keep this under ${LIMITS[key]} letters.`;
  }
  return errors;
}

const FIELD_WORDS: Record<string, string> = {
  name: "name",
  local_date: "date",
  local_time: "time",
  map_url: "map link",
  venue_name: "venue",
  venue_address: "address",
  dress_code: "dress code",
  note: "note",
};

/**
 * Turn what the API said about a refused request into something to show. A message on one field (FastAPI sends a
 * list of them with the field name last in each "loc") goes next to that field; anything else becomes one line.
 */
export function parseApiErrors(body: unknown): FormErrors & { form?: string } {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return { form: detail };
  if (Array.isArray(detail)) {
    const out: FormErrors & { form?: string } = {};
    for (const item of detail as { loc?: unknown[]; msg?: string }[]) {
      const field = String(item.loc?.[item.loc.length - 1] ?? "");
      if (field in FIELD_WORDS) out[field as keyof EventForm] = `Check the ${FIELD_WORDS[field]}.`;
    }
    return Object.keys(out).length > 0 ? out : { form: "Something in the form was not accepted. Check it and try again." };
  }
  return { form: "We could not save that. Please try again." };
}

/** A copy of the list with one item moved. Out-of-range moves leave the list as it was. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return [...list];
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function sortedByDate(list: readonly EventItem[]): EventItem[] {
  return [...list].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function isInDateOrder(list: readonly EventItem[]): boolean {
  return sortedByDate(list).every((e, i) => e.id === list[i].id);
}

/** "Sat, 13 Feb 2027 · 7:00 pm" from the India date and time, with no time-zone arithmetic that could shift the day. */
export function whenLabel(e: Pick<EventItem, "local_date" | "local_time">): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e.local_date);
  const t = /^(\d{2}):(\d{2})$/.exec(e.local_time);
  if (!d || !t) return `${e.local_date} ${e.local_time}`;
  const when = new Date(Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]));
  // Built from parts so the punctuation is the same in every browser, whatever its locale puts between them.
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatToParts(when).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const day = `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(when).toLowerCase();
  return `${day} · ${time}`;
}

/** A row read from the database, turned into what the editor holds. The stored time is UTC; the editor shows India time. */
export function rowToEvent(row: Record<string, unknown>): EventItem {
  const instant = new Date(String(row.starts_at));
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const text = (v: unknown) => (typeof v === "string" && v !== "" ? v : null);
  return {
    id: String(row.id),
    name: String(row.name),
    kind: (EVENT_KINDS.some((k) => k.value === row.kind) ? row.kind : "other") as EventKind,
    starts_at: instant.toISOString(),
    local_date: `${parts.year}-${parts.month}-${parts.day}`,
    local_time: `${parts.hour}:${parts.minute}`,
    venue_name: text(row.venue_name),
    venue_address: text(row.venue_address),
    map_url: text(row.map_url),
    dress_code: text(row.dress_code),
    note: text(row.note),
    sort_order: Number(row.sort_order ?? 0),
  };
}
