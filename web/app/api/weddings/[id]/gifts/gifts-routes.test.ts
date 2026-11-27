import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardToApi: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { DELETE } from "./[giftId]/route";
import { PUT } from "./[giftId]/status/route";
import { POST } from "./route";

const ID = "11111111-1111-1111-1111-111111111111";
const GIFT = "44444444-4444-4444-4444-444444444444";
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const giftCtx = (id = ID, giftId = GIFT) => ({ params: Promise.resolve({ id, giftId }) });
const same = { origin: "http://localhost:3000" };
const req = (method: string, body?: string, headers: Record<string, string> = same) => new Request("http://localhost:3000/api/x", { method, body, headers });

beforeEach(() => forward.mockClear());

describe("gift register routes", () => {
  it("refuse another site, bad ids and long bodies before reaching the API", async () => {
    expect((await POST(req("POST", "{}", { origin: "https://evil.example" }), ctx())).status).toBe(403);
    expect((await POST(req("POST", "{}"), ctx("../me"))).status).toBe(404);
    expect((await POST(req("POST", "x".repeat(5000)), ctx())).status).toBe(413);
    expect((await PUT(req("PUT", "{}", { origin: "https://evil.example" }), giftCtx())).status).toBe(403);
    expect((await PUT(req("PUT", "{}"), giftCtx(ID, "../../x"))).status).toBe(404);
    expect((await PUT(req("PUT", "x".repeat(300)), giftCtx())).status).toBe(413);
    expect((await DELETE(req("DELETE", undefined, {}), giftCtx())).status).toBe(403);
    expect((await DELETE(req("DELETE"), giftCtx("nope"))).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
  });

  it("pass each change on to the matching API route", async () => {
    const body = JSON.stringify({ side: "bride", giver_name: "Sharma uncle", method: "cash", amount_rupees: 5100 });
    await POST(req("POST", body), ctx());
    expect(forward).toHaveBeenLastCalledWith(`/weddings/${ID}/gifts`, { method: "POST", body });
    await PUT(req("PUT", '{"status":"received"}'), giftCtx());
    expect(forward).toHaveBeenLastCalledWith(`/weddings/${ID}/gifts/${GIFT}/status`, { method: "PUT", body: '{"status":"received"}' });
    await DELETE(req("DELETE"), giftCtx());
    expect(forward).toHaveBeenLastCalledWith(`/weddings/${ID}/gifts/${GIFT}`, { method: "DELETE" });
  });
});
