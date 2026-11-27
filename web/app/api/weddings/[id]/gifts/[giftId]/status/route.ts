import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

const MAX_BODY = 200;

/** Received, Not received, or back to unchecked. */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string; giftId: string }> }) {
  const { id, giftId } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isId(giftId)) return refuse(404, "Gift not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");
  return forwardToApi(`/weddings/${id}/gifts/${giftId}/status`, { method: "PUT", body });
}
