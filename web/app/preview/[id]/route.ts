import { guestPageCsp } from "@/lib/templates/csp";
import { loadTemplate, TemplateNotFound } from "@/lib/templates/load";
import { previewWedding } from "@/lib/templates/preview";
import { renderWedding } from "@/lib/templates/render";

/**
 * A template filled with sample data and the options in the address (bride, groom, date, color, font).
 * It is what the phone frame on "Try with your names" shows. No account, no database, nothing saved.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let template;
  try {
    template = await loadTemplate(id);
  } catch (error) {
    if (error instanceof TemplateNotFound) {
      return new Response("<!doctype html><title>Not found</title><p>No such template.</p>", {
        status: 404,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    throw error;
  }

  const url = new URL(request.url);
  const wedding = previewWedding(template.manifest, Object.fromEntries(url.searchParams));
  return new Response(renderWedding(template, wedding, { origin: url.origin }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": guestPageCsp("self"),
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "x-content-type-options": "nosniff",
    },
  });
}
