import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

/** Take a row out of the register. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string; giftId: string }> }) {
  const { id, giftId } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isId(giftId)) return refuse(404, "Gift not found");
  return forwardToApi(`/weddings/${id}/gifts/${giftId}`, { method: "DELETE" });
}
