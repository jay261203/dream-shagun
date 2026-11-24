import { describe, expect, it } from "vitest";

import { prepare } from "./prepare";
import type { WeddingData, WeddingEvent } from "./types";

const ev = (name: string, starts_at: string, sort_order: number, id?: string): WeddingEvent => ({
  id, name, starts_at, venue_name: null, venue_address: null, map_url: null, sort_order, kind: "other", dress_code: null, note: null,
});

function data(events: WeddingEvent[]): WeddingData {
  return {
    slug: "meera-and-dev", bride_name: "Meera", groom_name: "Dev", wedding_date: "2028-02-12", story: null, cover_photo_url: null,
    template_id: "marigold", color_preset: null, font_pair: null, music_url: null, sections_enabled: {}, languages: ["en"],
    blessings_enabled: false, rsvp_deadline: null, events, moments: [],
  } as unknown as WeddingData;
}

describe("prepare: countdown and calendar", () => {
  it("counts down to the earliest event even when the family listed another first", () => {
    const view = prepare(data([ev("Pheras", "2028-02-12T05:00:00.000Z", 1), ev("Mehendi", "2028-02-11T05:30:00.000Z", 2)]));
    expect(view.first_event_iso).toBe("2028-02-11T05:30:00.000Z");
  });
  it("has no countdown target without events", () => {
    expect(prepare(data([])).first_event_iso).toBeNull();
  });
  it("links a saved event to its calendar file and gives sample events no link", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const [saved, sample] = prepare(data([ev("A", "2028-02-12T05:00:00.000Z", 1, id), ev("B", "2028-02-12T06:00:00.000Z", 2)])).events;
    expect(saved.calendar_url).toBe(`/w/meera-and-dev/calendar/${id}`);
    expect(saved.has_calendar).toBe(true);
    expect(sample.calendar_url).toBeNull();
    expect(sample.has_calendar).toBe(false);
  });
});

describe("prepare: gift link", () => {
  const withMode = (gift_mode?: "off" | "link" | "private", events: WeddingEvent[] = [ev("A", "2028-02-12T05:00:00.000Z", 1, "11111111-1111-1111-1111-111111111111")]) => prepare({ ...data(events), gift_mode });
  it("is on by default and only for the link setting", () => {
    expect(withMode(undefined).gift_url).toBe("/w/meera-and-dev/gift");
    expect(withMode("link").gift_url).toBe("/w/meera-and-dev/gift");
    expect(withMode("private").gift_url).toBeNull();
    expect(withMode("off").gift_url).toBeNull();
  });
  it("points nowhere in a preview", () => {
    expect(withMode("link", [ev("A", "2028-02-12T05:00:00.000Z", 1)]).gift_url).toBe("#");
  });
});
