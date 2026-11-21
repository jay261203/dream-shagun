import { describe, expect, it } from "vitest";

import { buildIcs } from "./calendar";

const event = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Pheras",
  starts_at: "2028-02-12T05:00:00+00:00", // 10:30 am India time
  venue_name: "Vasant Lawns",
  venue_address: "Satellite, Ahmedabad",
  map_url: null,
  sort_order: 1,
  kind: "pheras",
  dress_code: "Traditional",
  note: "Line one\nLine two; with, marks",
};
const now = new Date("2028-01-01T00:00:00Z");

describe("buildIcs", () => {
  const ics = buildIcs(event, "Meera & Dev", now) as string;

  it("writes the start in UTC and ends three hours later", () => {
    expect(ics).toContain("DTSTART:20280212T050000Z");
    expect(ics).toContain("DTEND:20280212T080000Z");
    expect(ics).toContain("DTSTAMP:20280101T000000Z");
  });
  it("has the required structure and CRLF line ends", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VEVENT\r\nEND:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics).toContain("UID:11111111-1111-1111-1111-111111111111@dreamshagun");
  });
  it("escapes separators and newlines", () => {
    expect(ics).toContain("SUMMARY:Pheras - Meera & Dev");
    expect(ics).toContain("LOCATION:Vasant Lawns\\, Satellite\\, Ahmedabad");
    expect(ics).toContain("DESCRIPTION:Dress code: Traditional\\nLine one\\nLine two\\; with\\, marks");
  });
  it("cannot be made to inject extra lines", () => {
    const bad = buildIcs({ ...event, name: "x\r\nBEGIN:VEVENT\r\nATTENDEE:evil" }, "T", now) as string;
    const lines = bad.split("\r\n");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines.some((l) => l.startsWith("ATTENDEE"))).toBe(false);
  });
  it("folds long lines at 75 bytes without splitting a character", () => {
    const long = buildIcs({ ...event, note: "नमस्ते ".repeat(40) }, "T", now) as string;
    for (const l of long.split("\r\n")) expect(new TextEncoder().encode(l).length).toBeLessThanOrEqual(75);
    expect(long.replace(/\r\n /g, "")).toContain("नमस्ते नमस्ते");
  });
  it("leaves out empty fields and refuses a bad date", () => {
    const bare = buildIcs({ ...event, venue_name: null, venue_address: null, dress_code: null, note: null }, "T", now) as string;
    expect(bare).not.toContain("LOCATION");
    expect(bare).not.toContain("DESCRIPTION");
    expect(buildIcs({ ...event, starts_at: "nonsense" }, "T", now)).toBeNull();
  });
});
