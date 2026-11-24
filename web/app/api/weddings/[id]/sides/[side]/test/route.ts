import QRCode from "qrcode";

import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";
import { brand } from "@/lib/brand";
import { isSide } from "@/lib/sides";

/**
 * A test payment of one rupee to this side's saved UPI ID: the pay link and a QR code of it, drawn here so no outside
 * service ever sees the ID. A POST, never a plain link, so nothing prefetches or caches it.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string; side: string }> }) {
  const { id, side } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id) || !isSide(side)) return refuse(404, "Not found");

  const res = await forwardToApi(`/weddings/${id}/sides/${side}/test-link?note=${encodeURIComponent(`Test from ${brand.name}`)}`, { method: "GET" });
  if (!res.ok) return res;
  const { link } = (await res.json()) as { link: string };
  const qr = await QRCode.toDataURL(link, { margin: 1, width: 240, errorCorrectionLevel: "M" });
  return new Response(JSON.stringify({ link, qr }), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
