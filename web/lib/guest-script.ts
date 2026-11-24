import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const cached = new Map<string, string>();

/** Short hash of a guest script (rsvp, guestbook, gift), so a changed script gets a new address and is never served from an old cache. */
export function guestScriptVersion(name: "rsvp" | "guestbook" | "gift"): string {
  const known = cached.get(name);
  if (known !== undefined) return known;
  let version = "0";
  try {
    version = createHash("sha256").update(readFileSync(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "guest", `${name}.js`))).digest("hex").slice(0, 10);
  } catch {
    // A missing file gives version 0; the page still renders.
  }
  cached.set(name, version);
  return version;
}
