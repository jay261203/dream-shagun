import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

const MAX_BODY = 20_000;

/** Add a moment to this wedding. The API checks that the signed-in person belongs to it. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id)) return refuse(404, "Wedding not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");
  return forwardToApi(`/weddings/${id}/moments`, { method: "POST", body });
}
