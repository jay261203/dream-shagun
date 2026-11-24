import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response("{}", { status: 200 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardToApi: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { POST as unpublish } from "../unpublish/route";
import { POST as publish } from "./route";

const ID = "11111111-1111-1111-1111-111111111111";
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const post = (headers: Record<string, string> = { origin: "http://localhost:3000" }) => new Request(`http://localhost:3000/api/weddings/${ID}/x`, { method: "POST", headers });

beforeEach(() => forward.mockClear());

describe.each([
  ["publish", publish],
  ["unpublish", unpublish],
])("POST /api/weddings/[id]/%s", (name, handler) => {
  it("refuses another site, a missing Origin and a bad id", async () => {
    expect((await handler(post({ origin: "https://evil.example" }), ctx())).status).toBe(403);
    expect((await handler(post({}), ctx())).status).toBe(403);
    expect((await handler(post(), ctx("../me"))).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
  });
  it("passes the request to the API for this wedding only", async () => {
    expect((await handler(post(), ctx())).status).toBe(200);
    expect(forward).toHaveBeenCalledWith(`/weddings/${ID}/${name}`, { method: "POST" });
  });
});
