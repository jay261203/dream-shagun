import { forwardToApi, isSameOrigin } from "@/lib/api-bridge";

const MAX_BODY = 20_000;

/** Create a wedding as the signed-in family member. The API does the validation and the owner bookkeeping. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(JSON.stringify({ detail: "Not allowed" }), { status: 403, headers: { "content-type": "application/json" } });

  const body = await request.text();
  if (body.length > MAX_BODY) return new Response(JSON.stringify({ detail: "That is too much text" }), { status: 413, headers: { "content-type": "application/json" } });

  return forwardToApi("/weddings", { method: "POST", body });
}
