import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";
import { isSide } from "@/lib/sides";

const MAX_BODY = 2_000;

/** Save one side's UPI ID, payee name and wish. The API checks the person belongs to this wedding. */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string; side: string }> }) {
  const { id, side } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isSide(side)) return refuse(404, "Not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");
  return forwardToApi(`/weddings/${id}/sides/${side}`, { method: "PUT", body });
}
