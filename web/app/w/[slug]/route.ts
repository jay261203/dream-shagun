import { guestPageCsp } from "@/lib/templates/csp";
import { loadTemplate, TemplateNotFound } from "@/lib/templates/load";
import { renderWedding } from "@/lib/templates/render";
import { getPublishedWedding } from "@/lib/wedding";

const DEFAULT_TEMPLATE = process.env.DEFAULT_TEMPLATE_ID ?? "marigold";

function notFound(): Response {
  return new Response("<!doctype html><title>Not found</title><p>We could not find this invitation.</p>", {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** The guest page. Server-rendered so the WhatsApp preview and the first paint have the real content. */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const wedding = await getPublishedWedding(slug);
  if (!wedding) return notFound();

  let template;
  try {
    template = await loadTemplate(wedding.template_id ?? DEFAULT_TEMPLATE);
  } catch (error) {
    if (error instanceof TemplateNotFound) return notFound();
    throw error;
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return new Response(renderWedding(template, wedding, { origin }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": guestPageCsp("none"),
      "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      "x-content-type-options": "nosniff",
    },
  });
}
