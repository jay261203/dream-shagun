import { forwardToApi, isId, isSameOrigin, refuse } from "@/lib/api-bridge";
import { loadTemplate } from "@/lib/templates/load";

const MAX_BODY = 20_000;
const DEFAULT_TEMPLATE = process.env.DEFAULT_TEMPLATE_ID ?? "marigold";

/** Change names, date, story, colours, fonts, music or sections. The API checks the person belongs to this wedding. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isSameOrigin(request)) return refuse(403, "Not allowed");
  if (!isId(id)) return refuse(404, "Wedding not found");
  const body = await request.text();
  if (body.length > MAX_BODY) return refuse(413, "That is too much text");

  // Colour and font names must be ones the template really has. The API only checks their shape.
  let parsed: { color_preset?: unknown; font_pair?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return refuse(422, "That was not understood");
  }
  if (parsed.color_preset !== undefined || parsed.font_pair !== undefined) {
    const { manifest } = await loadTemplate(DEFAULT_TEMPLATE);
    if (parsed.color_preset !== undefined && !(typeof parsed.color_preset === "string" && Object.hasOwn(manifest.colorPresets, parsed.color_preset))) return refuse(422, "Pick one of the colours shown");
    if (parsed.font_pair !== undefined && !(typeof parsed.font_pair === "string" && Object.hasOwn(manifest.fontPairs, parsed.font_pair))) return refuse(422, "Pick one of the fonts shown");
  }
  return forwardToApi(`/weddings/${id}/details`, { method: "PATCH", body });
}
