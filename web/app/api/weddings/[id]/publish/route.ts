import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

/** Make the invitation live. The API checks the person belongs to this wedding and that the basics are filled in. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id)) return refuse(404, "Wedding not found");
  return forwardToApi(`/weddings/${id}/publish`, { method: "POST" });
}
