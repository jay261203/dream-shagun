import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response("{}", { status: 200 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardToApi: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { PATCH } from "./route";

const ID = "11111111-1111-1111-1111-111111111111";
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const patch = (body: string, headers: Record<string, string> = { origin: "http://localhost:3000" }) =>
  new Request(`http://localhost:3000/api/weddings/${ID}/details`, { method: "PATCH", body, headers });

beforeEach(() => forward.mockClear());

describe("PATCH /api/weddings/[id]/details", () => {
  it("refuses another site and a bad id", async () => {
    expect((await PATCH(patch("{}", { origin: "https://evil.example" }), ctx())).status).toBe(403);
    expect((await PATCH(patch("{}"), ctx("../me"))).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
  });
  it("refuses text that is not JSON and text that is too long", async () => {
    expect((await PATCH(patch("not json"), ctx())).status).toBe(422);
    expect((await PATCH(patch(JSON.stringify({ story: "x".repeat(21_000) })), ctx())).status).toBe(413);
    expect(forward).not.toHaveBeenCalled();
  });
  it("passes ordinary changes on as a PATCH", async () => {
    const body = JSON.stringify({ story: "Hello", music_enabled: false });
    expect((await PATCH(patch(body), ctx())).status).toBe(200);
    expect(forward).toHaveBeenCalledWith(`/weddings/${ID}/details`, { method: "PATCH", body });
  });
  it("accepts colours and fonts the template has", async () => {
    expect((await PATCH(patch(JSON.stringify({ color_preset: "rose", font_pair: "soft" })), ctx())).status).toBe(200);
  });
  it.each([{ color_preset: "neon" }, { font_pair: "comic" }, { color_preset: 5 }, { color_preset: "__proto__" }, { font_pair: "constructor" }])("refuses %j before it reaches the API", async (change) => {
    expect((await PATCH(patch(JSON.stringify(change)), ctx())).status).toBe(422);
    expect(forward).not.toHaveBeenCalled();
  });
});
