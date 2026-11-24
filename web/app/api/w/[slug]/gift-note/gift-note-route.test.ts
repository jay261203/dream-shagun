import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response("{}", { status: 201 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardPublic: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { POST } from "./route";

const same = { origin: "http://localhost:3000" };
const req = (body: string, headers: Record<string, string> = same) => new Request("http://localhost:3000/api/w/x/gift-note", { method: "POST", body, headers });
const slug = (s = "meera-and-dev") => ({ params: Promise.resolve({ slug: s }) });

beforeEach(() => forward.mockClear());

describe("POST /api/w/[slug]/gift-note", () => {
  it("refuses another site, a missing Origin, an odd link name and a long body", async () => {
    expect((await POST(req("{}", { origin: "https://evil.example" }), slug())).status).toBe(403);
    expect((await POST(req("{}", {}), slug())).status).toBe(403);
    expect((await POST(req("{}"), slug("../me"))).status).toBe(404);
    expect((await POST(req("{}"), slug("ab"))).status).toBe(404);
    expect((await POST(req("x".repeat(2100)), slug())).status).toBe(413);
    expect(forward).not.toHaveBeenCalled();
  });
  it("passes a note on to the API for that invitation only", async () => {
    const body = JSON.stringify({ side: "bride", name: "Rohan" });
    expect((await POST(req(body), slug())).status).toBe(201);
    expect((forward.mock.calls as unknown[][])[0].slice(1)).toEqual(["/weddings/meera-and-dev/gift-notes", { method: "POST", body }]);
  });
});
