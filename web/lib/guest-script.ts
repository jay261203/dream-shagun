import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

let cached: string | null = null;

/** Short hash of the guest reply script, so a changed script gets a new address and is never served from an old cache. */
export function rsvpScriptVersion(): string {
  if (cached !== null) return cached;
  try {
    cached = createHash("sha256").update(readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "guest", "rsvp.js"))).digest("hex").slice(0, 10);
  } catch {
    cached = "0";
  }
  return cached;
}
