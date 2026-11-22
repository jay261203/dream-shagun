import { createClient } from "@/lib/supabase/server";

function apiBase(): string {
  return (process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export { isId } from "@/lib/ids";

/** A plain refusal with a message the page can show. */
export function refuse(status: number, detail: string): Response {
  return json({ detail }, status);
}

/**
 * True only when the request was made by a page of this same site. Browsers always send an Origin header on a
 * form or fetch POST, so a missing or different one is refused. Login cookies are already SameSite=Lax; this is a second lock.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const ours = [request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host];
  return ours.includes(host);
}

/**
 * Pass a request to the FastAPI service as the signed-in family member. The browser only ever talks to this site,
 * so there is no cross-site setup to get wrong and the login token never reaches page scripts.
 * The API checks the token itself; we only refuse early when nobody is signed in.
 */
export async function forwardToApi(path: string, init: { method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: string | ArrayBuffer; contentType?: string }): Promise<Response> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return json({ detail: "Login required" }, 401);
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return json({ detail: "Login required" }, 401);

  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: init.method,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(init.body ? { "Content-Type": init.contentType ?? "application/json" } : {}) },
      body: init.body,
      cache: "no-store",
    });
  } catch {
    return json({ detail: "The server is not reachable right now. Try again in a moment." }, 502);
  }

  // "No content" answers (a delete) must have no body at all.
  if (res.status === 204 || res.status === 205) return new Response(null, { status: res.status, headers: { "cache-control": "no-store" } });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}
