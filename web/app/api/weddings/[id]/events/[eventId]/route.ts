import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

type Ctx = { params: Promise<{ id: string; eventId: string }> };

const MAX_BODY = 20_000;

/** Change an event. */
export async function PUT(request: Request, ctx: Ctx) {
  const { id, eventId } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isId(eventId)) return refuse(404, "Event not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");
  return forwardToApi(`/weddings/${id}/events/${eventId}`, { method: "PUT", body });
}

/** Delete an event. */
export async function DELETE(request: Request, ctx: Ctx) {
  const { id, eventId } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isId(eventId)) return refuse(404, "Event not found");
  return forwardToApi(`/weddings/${id}/events/${eventId}`, { method: "DELETE" });
}
