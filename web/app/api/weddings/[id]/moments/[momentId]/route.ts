import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

type Ctx = { params: Promise<{ id: string; momentId: string }> };

const MAX_BODY = 20_000;

/** Change a moment. */
export async function PUT(request: Request, ctx: Ctx) {
  const { id, momentId } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isId(momentId)) return refuse(404, "Moment not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");
  return forwardToApi(`/weddings/${id}/moments/${momentId}`, { method: "PUT", body });
}

/** Delete a moment. */
export async function DELETE(request: Request, ctx: Ctx) {
  const { id, momentId } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isId(momentId)) return refuse(404, "Moment not found");
  return forwardToApi(`/weddings/${id}/moments/${momentId}`, { method: "DELETE" });
}
