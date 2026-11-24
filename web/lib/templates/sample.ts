import type { WeddingData } from "./types";

export const SAMPLE_BRIDE = "Diya";
export const SAMPLE_GROOM = "Aarav";
export const SAMPLE_DATE = "2027-02-14";

/** An India-time clock reading on a calendar day, as the UTC instant the database would store. */
function istInstant(day: string, hour: number, minute: number, dayOffset: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const utcMs = Date.UTC(y, m - 1, d + dayOffset, hour, minute) - (5 * 60 + 30) * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/** A believable wedding for previews. The events follow whatever date is given, so a typed date looks right. */
export function sampleWedding(overrides: Partial<WeddingData> = {}): WeddingData {
  const date = overrides.wedding_date ?? SAMPLE_DATE;
  return {
    slug: "preview",
    bride_name: SAMPLE_BRIDE,
    groom_name: SAMPLE_GROOM,
    wedding_date: date,
    story: "We met at a friend's wedding and have not stopped talking since.\nOur families are delighted. We hope you will join us.",
    cover_photo_url: null,
    template_id: null,
    color_preset: null,
    font_pair: null,
    music_url: null,
    sections_enabled: ["cover", "couple", "journey", "events", "rsvp", "guestbook"],
    languages: ["en"],
    blessings_enabled: true,
    rsvp_deadline: null,
    events: [
      { name: "Mehendi", starts_at: istInstant(date, 11, 30, -2), venue_name: "Family home", venue_address: "Navrangpura", map_url: null, sort_order: 1, kind: "mehendi", dress_code: "Pastel, comfortable", note: "Lunch will be served." },
      { name: "Sangeet", starts_at: istInstant(date, 19, 0, -1), venue_name: "Vasant Lawns", venue_address: "Satellite", map_url: null, sort_order: 2, kind: "sangeet", dress_code: "Colourful, Indian wear", note: "Dinner will be served." },
      { name: "Pheras", starts_at: istInstant(date, 10, 30, 0), venue_name: "Vasant Lawns", venue_address: "Satellite", map_url: null, sort_order: 3, kind: "pheras", dress_code: null, note: null },
      { name: "Reception", starts_at: istInstant(date, 19, 30, 0), venue_name: "Vasant Lawns", venue_address: "Satellite", map_url: null, sort_order: 4, kind: "reception", dress_code: "Formal, Indian wear", note: null },
    ],
    moments: [
      { title: "We met", happened_on: "2023-03-01", caption: "At a friend's wedding.", photo_url: null, sort_order: 1 },
      { title: "He asked", happened_on: "2025-12-01", caption: "On the terrace, with both families waiting inside.", photo_url: null, sort_order: 2 },
    ],
    ...overrides,
  };
}
