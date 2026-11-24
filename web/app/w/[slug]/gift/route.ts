import { apiBase } from "@/lib/api-url";
import { SLUG_PATTERN } from "@/lib/slug";
import { guestPageCsp } from "@/lib/templates/csp";
import { loadTemplate, TemplateNotFound } from "@/lib/templates/load";
import { renderGiftPage, type GiftData } from "@/lib/templates/render-gift";
import { getPublishedWedding } from "@/lib/wedding";

const DEFAULT_TEMPLATE = process.env.DEFAULT_TEMPLATE_ID ?? "marigold";

function notFound(): Response {
  return new Response("<!doctype html><title>Not found</title><p>We could not find this page.</p>", {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

/**
 * The gift page. It exists only when the hosts have not switched gifts off. The UPI details come from the API, which
 * answers 404 for a draft, a missing link and "gifts off" alike, so all three look the same here.
 */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > 60) return notFound();

  let apiRes: Response;
  try {
    apiRes = await fetch(`${apiBase()}/weddings/${slug}/gift`, { cache: "no-store" });
  } catch (error) {
    console.error("gift page: the API did not answer", error);
    return new Response("<!doctype html><title>Try again</title><p>This page is not reachable right now. Please try again in a moment.</p>", {
      status: 502,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
    });
  }
  if (!apiRes.ok) return notFound();
  const gift = (await apiRes.json()) as GiftData;

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
  return new Response(await renderGiftPage(template, wedding, gift, { origin }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": guestPageCsp("none"),
      "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      "x-content-type-options": "nosniff",
      "x-robots-tag": "noindex",
    },
  });
}
