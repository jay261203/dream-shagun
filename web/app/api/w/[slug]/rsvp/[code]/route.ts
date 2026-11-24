import { forwardPublic, isSameOrigin, refuse } from "@/lib/api-bridge";
import { SLUG_PATTERN } from "@/lib/slug";

type Ctx = { params: Promise<{ slug: string; code: string }> };

const MAX_BODY = 8_000;
const CODE = /^[A-Za-z0-9_-]{24,64}$/;

function bad(slug: string, code: string): boolean {
  return !SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > 60 || !CODE.test(code);
}

/** The guest's own saved reply, found with the private code their browser kept. */
export async function GET(request: Request, ctx: Ctx) {
  const { slug, code } = await ctx.params;
  if (bad(slug, code)) return refuse(404, "Reply not found");
  return forwardPublic(request, `/weddings/${slug}/rsvp/${code}`, { method: "GET" });
}

/** Change that reply. */
export async function PUT(request: Request, ctx: Ctx) {
  const { slug, code } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (bad(slug, code)) return refuse(404, "Reply not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");
  return forwardPublic(request, `/weddings/${slug}/rsvp/${code}`, { method: "PUT", body });
}
