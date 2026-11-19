import path from "node:path";

import { templatesDir } from "./load";
import { isValidTemplateId } from "./validate";

const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const CONTENT_TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

/**
 * Map /t/<id>/<...file> to a file on disk, or null. Only effects.js and files under assets/ are public;
 * manifest.json and template.html stay private. No dots-only segments, so no way out of the template's folder.
 */
export function resolveTemplateFile(id: string, segments: string[], dir: string = templatesDir()): string | null {
  if (!isValidTemplateId(id) || segments.length === 0) return null;
  if (!segments.every((s) => SEGMENT.test(s) && !s.includes(".."))) return null;

  const isEffects = segments.length === 1 && segments[0] === "effects.js";
  const isAsset = segments[0] === "assets" && segments.length >= 2;
  if (!isEffects && !isAsset) return null;

  const ext = path.extname(segments[segments.length - 1]).toLowerCase();
  if (!CONTENT_TYPES[ext]) return null;

  const root = path.resolve(/*turbopackIgnore: true*/ dir, id);
  const full = path.resolve(/*turbopackIgnore: true*/ root, ...segments);
  return full.startsWith(root + path.sep) ? full : null;
}
