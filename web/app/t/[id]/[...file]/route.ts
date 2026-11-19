import { readFile } from "node:fs/promises";
import path from "node:path";

import { CONTENT_TYPES, resolveTemplateFile } from "@/lib/templates/files";

/** Serves a template's effects.js and assets/ files. Nothing else in the template folder is reachable. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string; file: string[] }> }) {
  const { id, file } = await ctx.params;
  const full = resolveTemplateFile(id, file);
  if (!full) return new Response("Not found", { status: 404 });

  let bytes: Buffer;
  try {
    bytes = await readFile(full);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const type = CONTENT_TYPES[path.extname(full).toLowerCase()];
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=3600",
      "x-content-type-options": "nosniff",
      // An uploaded SVG must never run script if someone opens it directly.
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
