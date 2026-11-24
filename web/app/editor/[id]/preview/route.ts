import { isId } from "@/lib/ids";
import { guestPageCsp } from "@/lib/templates/csp";
import { loadTemplate, TemplateNotFound } from "@/lib/templates/load";
import { renderWedding } from "@/lib/templates/render";
import { createClient, currentClaims } from "@/lib/supabase/server";
import { getWeddingForFamily } from "@/lib/wedding";

const DEFAULT_TEMPLATE = process.env.DEFAULT_TEMPLATE_ID ?? "marigold";

const DRAFT_BANNER = '<div style="position:sticky;top:0;z-index:99;background:#231a14;color:#fff;font:700 14px system-ui,sans-serif;text-align:center;padding:10px 12px">Draft. Only the family can see this. Not for guests.</div>';

function plain(status: number, text: string): Response {
  return new Response(`<!doctype html><meta name="color-scheme" content="light"><p style="font:16px system-ui;padding:24px">${text}</p>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}

/**
 * The family's draft, drawn like the guest page, for the phone-sized preview in the editor.
 * Only a signed-in member of this wedding can see it (row-level security decides); everyone else gets "not found".
 * It may be framed only by this site, and it is never cached or indexed.
 */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isId(id)) return plain(404, "Not found.");
  if (!(await currentClaims().catch(() => null))) return plain(401, "Sign in to see the preview.");

  const wedding = await getWeddingForFamily(await createClient(), id);
  if (!wedding) return plain(404, "Not found.");

  let template;
  try {
    template = await loadTemplate(wedding.template_id ?? DEFAULT_TEMPLATE);
  } catch (error) {
    if (error instanceof TemplateNotFound) return plain(404, "This template is not available.");
    throw error;
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  let html = renderWedding(template, wedding, { origin });
  // The shareable draft link adds a banner so nobody mistakes it for the live page.
  if (new URL(request.url).searchParams.get("banner") === "1") html = html.replace(/<body[^>]*>/, (tag) => `${tag}${DRAFT_BANNER}`);
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": guestPageCsp("self"),
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
      "x-content-type-options": "nosniff",
    },
  });
}
