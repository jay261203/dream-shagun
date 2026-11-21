import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

/** Put the events in a new order. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id)) return refuse(404, "Wedding not found");
  const body = await request.text();
  if (body.length > 5_000) return refuse(413, "That is too much text");
  return forwardToApi(`/weddings/${id}/events/reorder`, { method: "POST", body });
}
