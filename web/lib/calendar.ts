import type { WeddingEvent } from "./templates/types";

/** Events have a start but no end, so the calendar entry is given a fixed length. */
const DURATION_MS = 3 * 60 * 60 * 1000;

/** Text values in a calendar file: escape \ ; , and newlines, and drop control characters. */
function esc(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Lines may not pass 75 bytes; longer ones continue on the next line after one space. Counts bytes, never splits a character. */
function fold(line: string): string {
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    if (bytes + size > (out.length === 0 ? 75 : 74)) {
      out.push(current);
      current = "";
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join("\r\n ");
}

function utc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** One event as an .ics file. Times are written in UTC, so every calendar shows them correctly in India time. */
export function buildIcs(event: WeddingEvent & { id: string }, title: string, now: Date = new Date()): string | null {
  const start = new Date(event.starts_at);
  if (Number.isNaN(start.getTime())) return null;
  const where = [event.venue_name, event.venue_address].filter(Boolean).join(", ");
  const description = [event.dress_code ? `Dress code: ${event.dress_code}` : null, event.note].filter(Boolean).join("\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dream Shagun//Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@dreamshagun`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(new Date(start.getTime() + DURATION_MS))}`,
    `SUMMARY:${esc(`${event.name} - ${title}`)}`,
    ...(where ? [`LOCATION:${esc(where)}`] : []),
    ...(description ? [`DESCRIPTION:${esc(description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
