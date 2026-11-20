import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims, getSession } }),
}));

import { GET as slugCheck } from "./slug-check/route";
import { POST } from "./route";

const SIGNED_IN = { data: { claims: { sub: "user-1", email: "a@example.com" } } };
const SESSION = { data: { session: { access_token: "token-abc" } } };

function post(body: unknown, headers: Record<string, string> = { origin: "http://localhost:3000", host: "localhost:3000" }) {
  return new Request("http://localhost:3000/api/weddings", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
}

let apiFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getClaims.mockReset().mockResolvedValue(SIGNED_IN);
  getSession.mockReset().mockResolvedValue(SESSION);
  apiFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "w1", slug: "riya-and-karan", status: "draft" }), { status: 201, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", apiFetch);
  process.env.API_URL_INTERNAL = "http://api.test:8000";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.API_URL_INTERNAL;
});

describe("POST /api/weddings", () => {
  it("passes the request to the API as the signed-in person and returns what the API says", async () => {
    const res = await POST(post({ slug: "riya-and-karan" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ slug: "riya-and-karan", status: "draft" });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [url, init] = apiFetch.mock.calls[0];
    expect(url).toBe("http://api.test:8000/weddings");
    expect(init.headers.Authorization).toBe("Bearer token-abc");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ slug: "riya-and-karan" });
  });

  it("refuses a request from another site, without calling the API", async () => {
    const res = await POST(post({}, { origin: "https://evil.example", host: "localhost:3000" }));
    expect(res.status).toBe(403);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("refuses a request with no Origin header", async () => {
    const res = await POST(post({}, { host: "localhost:3000" }));
    expect(res.status).toBe(403);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("answers 401 when nobody is signed in, without calling the API", async () => {
    getClaims.mockResolvedValue({ data: null });
    const res = await POST(post({}));
    expect(res.status).toBe(401);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("answers 401 when the claims are fine but there is no session to send", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    expect((await POST(post({}))).status).toBe(401);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("passes the API's conflict answer through, with its suggestions", async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ detail: { message: "That link name is taken", suggestions: ["riya-and-karan-2"] } }), { status: 409, headers: { "content-type": "application/json" } }));
    const res = await POST(post({ slug: "riya-and-karan" }));
    expect(res.status).toBe(409);
    expect((await res.json()).detail.suggestions).toEqual(["riya-and-karan-2"]);
  });

  it("says 502 with a plain message when the API cannot be reached", async () => {
    apiFetch.mockRejectedValue(new Error("connect ECONNREFUSED"));
    const res = await POST(post({}));
    expect(res.status).toBe(502);
    expect((await res.json()).detail).toMatch(/not reachable/);
  });

  it("refuses an oversized body", async () => {
    const res = await POST(post({ story: "x".repeat(25_000) }));
    expect(res.status).toBe(413);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("allows the same site when a proxy rewrites the host", async () => {
    const res = await POST(post({}, { origin: "https://dreamshagun.example", host: "internal:3000", "x-forwarded-host": "dreamshagun.example" }));
    expect(res.status).toBe(201);
  });
});

describe("GET /api/weddings/slug-check", () => {
  it("asks the API, URL-encoded, as the signed-in person", async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ available: true, suggestions: [] }), { status: 200, headers: { "content-type": "application/json" } }));
    const res = await slugCheck(new Request("http://localhost:3000/api/weddings/slug-check?slug=riya-and-karan"));
    expect(await res.json()).toEqual({ available: true, suggestions: [] });
    expect(apiFetch.mock.calls[0][0]).toBe("http://api.test:8000/weddings/slug-check?slug=riya-and-karan");
  });

  it("does not bother the API for a name that cannot be valid", async () => {
    const res = await slugCheck(new Request("http://localhost:3000/api/weddings/slug-check?slug=ab"));
    expect((await res.json()).reason).toBe("invalid");
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("is for signed-in people only", async () => {
    getClaims.mockResolvedValue({ data: null });
    expect((await slugCheck(new Request("http://localhost:3000/api/weddings/slug-check?slug=riya-and-karan"))).status).toBe(401);
  });

  it("cannot be used to smuggle extra query parameters to the API", async () => {
    apiFetch.mockResolvedValue(new Response("{}", { status: 200 }));
    await slugCheck(new Request("http://localhost:3000/api/weddings/slug-check?slug=" + encodeURIComponent("abc&admin=1")));
    expect(apiFetch.mock.calls[0][0]).toBe("http://api.test:8000/weddings/slug-check?slug=abc%26admin%3D1");
  });
});
