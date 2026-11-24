import { forwardPublic, isSameOrigin, refuse } from "@/lib/api-bridge";
import { SLUG_PATTERN } from "@/lib/slug";

const MAX_BODY = 2_000;

/** A guest's blessing. No login; the API validates, limits and saves it as "claimed". */
export async function POST(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > 60) return refuse(404, "Invitation not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");
  return forwardPublic(request, `/weddings/${slug}/blessings`, { method: "POST", body });
}
