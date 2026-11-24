import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response("{}", { status: 200 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardPublic: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { GET, PUT } from "./[code]/route";
import { POST } from "./route";

const CODE = "a".repeat(32);
const same = { origin: "http://localhost:3000" };
const req = (method: string, body?: string, headers: Record<string, string> = same) => new Request("http://localhost:3000/api/w/x/rsvp", { method, body, headers });
const slug = (s = "meera-and-dev") => ({ params: Promise.resolve({ slug: s }) });
const both = (s = "meera-and-dev", code = CODE) => ({ params: Promise.resolve({ slug: s, code }) });

beforeEach(() => forward.mockClear());

describe("POST /api/w/[slug]/rsvp", () => {
  it("refuses another site, odd link names and long bodies", async () => {
    expect((await POST(req("POST", "{}", { origin: "https://evil.example" }), slug())).status).toBe(403);
    expect((await POST(req("POST", "{}"), slug("../me"))).status).toBe(404);
    expect((await POST(req("POST", "{}"), slug("ab"))).status).toBe(404);
    expect((await POST(req("POST", "x".repeat(9000)), slug())).status).toBe(413);
    expect(forward).not.toHaveBeenCalled();
  });
  it("passes a reply to the API for that wedding", async () => {
    const body = JSON.stringify({ name: "Rohan" });
    expect((await POST(req("POST", body), slug())).status).toBe(200);
    expect((forward.mock.calls as unknown[][])[0]).toEqual([expect.any(Request), "/weddings/meera-and-dev/rsvp", { method: "POST", body }]);
  });
});

describe("/api/w/[slug]/rsvp/[code]", () => {
  it("refuses a code of the wrong shape before reaching the API", async () => {
    for (const code of ["short", "../x", `${"a".repeat(30)}/y`, "a".repeat(65)]) {
      expect((await GET(req("GET"), both("meera-and-dev", code))).status).toBe(404);
      expect((await PUT(req("PUT", "{}"), both("meera-and-dev", code))).status).toBe(404);
    }
    expect(forward).not.toHaveBeenCalled();
  });
  it("reads and changes a reply with the right code", async () => {
    expect((await GET(req("GET", undefined, {}), both())).status).toBe(200);
    expect((forward.mock.calls as unknown[][])[0][1]).toBe(`/weddings/meera-and-dev/rsvp/${CODE}`);
    expect((await PUT(req("PUT", "{}"), both())).status).toBe(200);
    expect((forward.mock.calls as unknown[][])[1]).toEqual([expect.any(Request), `/weddings/meera-and-dev/rsvp/${CODE}`, { method: "PUT", body: "{}" }]);
  });
  it("only lets another site's page change a reply, never", async () => {
    expect((await PUT(req("PUT", "{}", { origin: "https://evil.example" }), both())).status).toBe(403);
  });
});
