import { beforeEach, describe, expect, it, vi } from "vitest";

const forward = vi.fn(async () => new Response(JSON.stringify({ url: "https://cdn/x.jpg" }), { status: 201 }));
vi.mock("@/lib/api-bridge", async () => {
  const real = await vi.importActual<typeof import("@/lib/api-bridge")>("@/lib/api-bridge");
  return { ...real, forwardToApi: (...args: unknown[]) => (forward as (...a: unknown[]) => Promise<Response>)(...args) };
});

import { POST } from "./route";

const ID = "11111111-1111-1111-1111-111111111111";
const ctx = (id = ID) => ({ params: Promise.resolve({ id }) });
const post = (body: BodyInit | null, headers: Record<string, string> = { origin: "http://localhost:3000" }) =>
  new Request(`http://localhost:3000/api/weddings/${ID}/photos`, { method: "POST", body, headers });

beforeEach(() => forward.mockClear());

describe("POST /api/weddings/[id]/photos", () => {
  it("refuses a request from another site", async () => {
    expect((await POST(post(new Uint8Array([1]), { origin: "https://evil.example" }), ctx())).status).toBe(403);
    expect(forward).not.toHaveBeenCalled();
  });
  it("refuses an id that is not an id", async () => {
    expect((await POST(post(new Uint8Array([1])), ctx("../me"))).status).toBe(404);
    expect(forward).not.toHaveBeenCalled();
  });
  it("refuses an empty upload and a huge one", async () => {
    expect((await POST(post(new Uint8Array(0)), ctx())).status).toBe(422);
    expect((await POST(post(new Uint8Array(6 * 1024 * 1024 + 1)), ctx())).status).toBe(413);
    expect(forward).not.toHaveBeenCalled();
  });
  it("passes the picture bytes on to the API as raw bytes", async () => {
    const res = await POST(post(new Uint8Array([1, 2, 3])), ctx());
    expect(res.status).toBe(201);
    const [path, init] = forward.mock.calls[0] as unknown as [string, { method: string; body: ArrayBuffer; contentType: string }];
    expect(path).toBe(`/weddings/${ID}/photos`);
    expect(init.method).toBe("POST");
    expect(init.body.byteLength).toBe(3);
    expect(init.contentType).toBe("application/octet-stream");
  });
});
