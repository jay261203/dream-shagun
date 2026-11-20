import { forwardToApi } from "@/lib/api-bridge";

/** Is this link name free? Asked as the person types, so only signed-in people can ask. */
export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (slug.length < 3 || slug.length > 60) {
    return new Response(JSON.stringify({ available: false, reason: "invalid", suggestions: [] }), { headers: { "content-type": "application/json" } });
  }
  return forwardToApi(`/weddings/slug-check?slug=${encodeURIComponent(slug)}`, { method: "GET" });
}
