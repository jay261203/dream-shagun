import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";

/** The browser shrinks a photo before sending, so a real upload is well under this. The API re-checks and re-encodes it. */
const MAX_BYTES = 6 * 1024 * 1024;

/** Upload one photo for this wedding. The API checks the person belongs to it, shrinks the picture and stores it. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id)) return refuse(404, "Wedding not found");

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return refuse(413, "That photo is too large");
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return refuse(413, "That photo is too large");
  if (bytes.byteLength === 0) return refuse(422, "Choose a photo first");

  return forwardToApi(`/weddings/${id}/photos`, { method: "POST", body: bytes, contentType: "application/octet-stream" });
}
