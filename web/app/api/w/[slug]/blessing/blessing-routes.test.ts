import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response("{}", { status: 200 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardPublic: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { POST } from "../blessings/route";
import { GET } from "./route";

const same = { origin: "http://localhost:3000" };
const req = (method: string, body?: string, headers: Record<string, string> = same) => new Request("http://localhost:3000/api/w/x/blessing", { method, body, headers });
const slug = (s = "meera-and-dev") => ({ params: Promise.resolve({ slug: s }) });
const calls = () => forward.mock.calls as unknown[][];

beforeEach(() => forward.mockClear());

describe("GET /api/w/[slug]/blessing", () => {
  it("refuses an odd link name and passes a good one on", async () => {
    expect((await GET(req("GET", undefined, {}), slug("../me"))).status).toBe(404);
    expect((await GET(req("GET", undefined, {}), slug("ab"))).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
    expect((await GET(req("GET", undefined, {}), slug())).status).toBe(200);
    expect(calls()[0].slice(1)).toEqual(["/weddings/meera-and-dev/blessing-options", { method: "GET" }]);
  });
});

describe("POST /api/w/[slug]/blessings", () => {
  it("refuses another site, an odd link name and a long body", async () => {
    expect((await POST(req("POST", "{}", { origin: "https://evil.example" }), slug())).status).toBe(403);
    expect((await POST(req("POST", "{}", {}), slug())).status).toBe(403);
    expect((await POST(req("POST", "{}"), slug("../me"))).status).toBe(404);
    expect((await POST(req("POST", "x".repeat(3000)), slug())).status).toBe(413);
    expect(forward).not.toHaveBeenCalled();
  });
  it("passes a blessing on to the API for that wedding", async () => {
    const body = JSON.stringify({ side: "bride", amount_rupees: 1001, name: "Rohan" });
    expect((await POST(req("POST", body), slug())).status).toBe(200);
    expect(calls()[0].slice(1)).toEqual(["/weddings/meera-and-dev/blessings", { method: "POST", body }]);
  });
});
