import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response(JSON.stringify({ link: "upi://pay?pa=meera@okhdfc&pn=Meera&am=1.00&cu=INR" }), { status: 200 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardToApi: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { brand } from "@/lib/brand";

import { POST as test } from "./[side]/test/route";
import { PUT } from "./[side]/route";

const ID = "11111111-1111-1111-1111-111111111111";
const ctx = (id = ID, side = "bride") => ({ params: Promise.resolve({ id, side }) });
const same = { origin: "http://localhost:3000" };
const req = (method: string, body?: string, headers: Record<string, string> = same) => new Request("http://localhost:3000/api/x", { method, body, headers });

beforeEach(() => forward.mockClear());

describe("PUT /api/weddings/[id]/sides/[side]", () => {
  it("refuses another site, a bad id, a third side and a long body", async () => {
    expect((await PUT(req("PUT", "{}", { origin: "https://evil.example" }), ctx())).status).toBe(403);
    expect((await PUT(req("PUT", "{}"), ctx("../me"))).status).toBe(404);
    expect((await PUT(req("PUT", "{}"), ctx(ID, "both"))).status).toBe(404);
    expect((await PUT(req("PUT", "x".repeat(3000)), ctx())).status).toBe(413);
    expect(forward).not.toHaveBeenCalled();
  });
  it("passes a save on for that side only", async () => {
    const body = JSON.stringify({ upi_id: "meera@okhdfc", payee_name: "Meera", wish: null });
    expect((await PUT(req("PUT", body), ctx(ID, "groom"))).status).toBe(200);
    expect(forward).toHaveBeenCalledWith(`/weddings/${ID}/sides/groom`, { method: "PUT", body });
  });
});

describe("POST /api/weddings/[id]/sides/[side]/test", () => {
  it("refuses another site, a bad id and a third side", async () => {
    expect((await test(req("POST", undefined, { origin: "https://evil.example" }), ctx())).status).toBe(403);
    expect((await test(req("POST"), ctx("../me"))).status).toBe(404);
    expect((await test(req("POST"), ctx(ID, "both"))).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
  });
  it("returns the pay link with a QR code drawn here, never cached", async () => {
    const res = await test(req("POST"), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.link.startsWith("upi://pay?")).toBe(true);
    expect(body.qr.startsWith("data:image/png;base64,")).toBe(true);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(forward).toHaveBeenCalledWith(`/weddings/${ID}/sides/bride/test-link?note=Test%20from%20${brand.name}`, { method: "GET" });
  });
  it("passes the API's refusal on untouched", async () => {
    forward.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Save a UPI ID and a name for this side first" }), { status: 422 }));
    const res = await test(req("POST"), ctx());
    expect(res.status).toBe(422);
    expect((await res.json()).detail).toMatch(/Save a UPI ID/);
  });
});
