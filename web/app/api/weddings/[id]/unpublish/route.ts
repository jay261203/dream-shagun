import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

/** Take the invitation offline. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id)) return refuse(404, "Wedding not found");
  return forwardToApi(`/weddings/${id}/unpublish`, { method: "POST" });
}
