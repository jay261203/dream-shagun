import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getClaims = vi.fn();
const getSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims, getSession } }),
}));

import { DELETE, PUT } from "./[eventId]/route";
import { POST as reorder } from "./reorder/route";
import { POST as add } from "./route";

const W = "11111111-1111-1111-1111-111111111111";
const E = "22222222-2222-2222-2222-222222222222";
const SAME_SITE = { origin: "http://localhost:3000", host: "localhost:3000" };

function req(method: string, path: string, body?: unknown, headers: Record<string, string> = SAME_SITE) {
  return new Request(`http://localhost:3000${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
}

let apiFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "u1" } } });
  getSession.mockReset().mockResolvedValue({ data: { session: { access_token: "tok" } } });
  apiFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: E }), { status: 200, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", apiFetch);
  process.env.API_URL_INTERNAL = "http://api.test:8000";
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.API_URL_INTERNAL;
});

const ctx = (id: string, eventId = E) => ({ params: Promise.resolve({ id, eventId }) });

describe("POST /api/weddings/[id]/events", () => {
  it("passes the new event to the API as the signed-in person", async () => {
    const res = await add(req("POST", `/api/weddings/${W}/events`, { name: "Pheras" }), ctx(W));
    expect(res.status).toBe(200);
    const [url, init] = apiFetch.mock.calls[0];
    expect(url).toBe(`http://api.test:8000/weddings/${W}/events`);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ name: "Pheras" });
  });

  it("refuses another site and a missing Origin, without calling the API", async () => {
    expect((await add(req("POST", `/api/weddings/${W}/events`, {}, { origin: "https://evil.example", host: "localhost:3000" }), ctx(W))).status).toBe(403);
    expect((await add(req("POST", `/api/weddings/${W}/events`, {}, { host: "localhost:3000" }), ctx(W))).status).toBe(403);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("answers 401 when nobody is signed in", async () => {
    getClaims.mockResolvedValue({ data: null });
    expect((await add(req("POST", `/api/weddings/${W}/events`, {}), ctx(W))).status).toBe(401);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it.each(["../../me", "abc", `${W}/../x`, `${W}?admin=1`, "", "11111111-1111-1111-1111-11111111111Z"])("never lets the id %j reach the API address", async (bad) => {
    const res = await add(req("POST", "/api/weddings/x/events", {}), ctx(bad));
    expect(res.status).toBe(404);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("refuses an oversized body", async () => {
    expect((await add(req("POST", `/api/weddings/${W}/events`, { note: "x".repeat(25_000) }), ctx(W))).status).toBe(413);
  });

  it("passes on the API's own refusals, such as not-a-member", async () => {
    apiFetch.mockResolvedValue(new Response(JSON.stringify({ detail: "Wedding not found" }), { status: 404, headers: { "content-type": "application/json" } }));
    const res = await add(req("POST", `/api/weddings/${W}/events`, {}), ctx(W));
    expect(res.status).toBe(404);
    expect((await res.json()).detail).toBe("Wedding not found");
  });
});

describe("PUT and DELETE /api/weddings/[id]/events/[eventId]", () => {
  it("passes a change to the API", async () => {
    await PUT(req("PUT", `/api/weddings/${W}/events/${E}`, { name: "New" }), ctx(W));
    const [url, init] = apiFetch.mock.calls[0];
    expect(url).toBe(`http://api.test:8000/weddings/${W}/events/${E}`);
    expect(init.method).toBe("PUT");
  });

  it("passes a delete on and returns an empty answer for 'no content'", async () => {
    apiFetch.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await DELETE(req("DELETE", `/api/weddings/${W}/events/${E}`), ctx(W));
    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(apiFetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("checks both ids and the site before doing anything", async () => {
    expect((await DELETE(req("DELETE", "/x"), ctx(W, "../../me"))).status).toBe(404);
    expect((await PUT(req("PUT", "/x", {}), ctx("nope", E))).status).toBe(404);
    expect((await DELETE(req("DELETE", "/x", undefined, { origin: "https://evil.example", host: "localhost:3000" }), ctx(W))).status).toBe(403);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});

describe("POST /api/weddings/[id]/events/reorder", () => {
  it("passes the new order on", async () => {
    await reorder(req("POST", `/api/weddings/${W}/events/reorder`, { ids: [E, W] }), ctx(W));
    const [url, init] = apiFetch.mock.calls[0];
    expect(url).toBe(`http://api.test:8000/weddings/${W}/events/reorder`);
    expect(JSON.parse(init.body)).toEqual({ ids: [E, W] });
  });

  it("is refused from another site or with a bad wedding id", async () => {
    expect((await reorder(req("POST", "/x", {}, { origin: "https://evil.example", host: "localhost:3000" }), ctx(W))).status).toBe(403);
    expect((await reorder(req("POST", "/x", {}), ctx("nope"))).status).toBe(404);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
