import type { WeddingData } from "./types";

const ZONE = "Asia/Kolkata";

/** Only web links pass. Everything else (javascript:, data:, empty) becomes null. */
export function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function dateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
}

function longDate(value: string | null): string | null {
  if (!value) return null;
  const d = dateOnly(value);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

function monthYear(value: string | null): string | null {
  if (!value) return null;
  const d = dateOnly(value);
  if (!d) return null;
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

function instantParts(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day_name: null, date_long: null, time: null, iso: null };
  const f = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-IN", { timeZone: ZONE, ...opts }).format(d);
  return {
    day_name: f({ weekday: "long" }),
    date_long: f({ day: "numeric", month: "long", year: "numeric" }),
    time: f({ hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(),
    iso: d.toISOString(),
  };
}

export type View = ReturnType<typeof prepare>;

/** Everything a template may print, already formatted and cleaned. Templates never format or filter. */
export function prepare(data: WeddingData) {
  const events = [...data.events]
    .sort((a, b) => a.sort_order - b.sort_order || a.starts_at.localeCompare(b.starts_at))
    .map((e) => {
      const map_url = safeUrl(e.map_url);
      const calendar_url = e.id ? `/w/${encodeURIComponent(data.slug)}/calendar/${encodeURIComponent(e.id)}` : null;
      return { ...e, ...instantParts(e.starts_at), map_url, has_map: map_url !== null, calendar_url, has_calendar: calendar_url !== null };
    });
  const moments = [...data.moments]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m) => ({ ...m, date_label: monthYear(m.happened_on), photo_url: safeUrl(m.photo_url) }));

  // The countdown goes to the earliest event, whatever order the family put them in.
  const dated = events.filter((e) => e.iso);
  const firstEvent = dated.reduce<(typeof dated)[number] | undefined>((a, e) => (!a || (e.iso as string) < (a.iso as string) ? e : a), undefined);
  const title = `${data.bride_name} & ${data.groom_name}`;
  const date_long = longDate(data.wedding_date) ?? firstEvent?.date_long ?? null;

  // Everything the reply form needs, as one piece of text for the page to hand to its script.
  const rsvp_config = JSON.stringify({
    slug: data.slug,
    deadline: data.rsvp_deadline,
    deadline_label: longDate(data.rsvp_deadline),
    events: events.map((e) => ({ id: e.id ?? null, label: [e.name, e.date_long].filter(Boolean).join(", ") })),
  });

  return {
    slug: data.slug,
    bride_name: data.bride_name,
    groom_name: data.groom_name,
    title,
    story: data.story,
    date_long,
    cover_photo_url: safeUrl(data.cover_photo_url),
    music_url: safeUrl(data.music_url),
    rsvp_deadline_long: longDate(data.rsvp_deadline),
    blessings_enabled: data.blessings_enabled,
    first_event_iso: firstEvent?.iso ?? null,
    rsvp_config,
    events,
    moments,
    has_events: events.length > 0,
    has_moments: moments.length > 0,
  };
}
