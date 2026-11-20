import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut } }),
}));

import { POST } from "./route";

function signout(headers: Record<string, string>) {
  return POST(new Request("http://localhost:3000/auth/signout", { method: "POST", headers }));
}

beforeEach(() => signOut.mockReset().mockResolvedValue({ error: null }));

describe("POST /auth/signout", () => {
  it("signs out and sends the browser to the home page with a GET", async () => {
    const res = await signout({ origin: "http://localhost:3000", host: "localhost:3000" });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(303);
    expect(new URL(res.headers.get("location") ?? "").pathname).toBe("/");
  });

  it("cannot be triggered from another site", async () => {
    const res = await signout({ origin: "https://evil.example", host: "localhost:3000" });
    expect(res.status).toBe(403);
    expect(signOut).not.toHaveBeenCalled();
  });
});
