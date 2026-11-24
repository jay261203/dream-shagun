import { forwardPublic, refuse } from "@/lib/api-bridge";
import { SLUG_PATTERN } from "@/lib/slug";

/** What a guest may see before sending a blessing: which sides take them and each side's wish. Never a UPI ID. */
export async function GET(request: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!SLUG_PATTERN.test(slug) || slug.length < 3 || slug.length > 60) return refuse(404, "Invitation not found");
  return forwardPublic(request, `/weddings/${slug}/blessing-options`, { method: "GET" });
}
