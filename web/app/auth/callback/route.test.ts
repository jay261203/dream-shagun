import { beforeEach, describe, expect, it, vi } from "vitest";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

import { GET } from "./route";

function callback(query: string) {
  return GET(new Request(`http://localhost:3000/auth/callback${query}`));
}

function location(res: Response) {
  return new URL(res.headers.get("location") ?? "");
}

beforeEach(() => {
  exchangeCodeForSession.mockReset().mockResolvedValue({ error: null });
  delete process.env.NEXT_PUBLIC_SITE_URL;
});

describe("GET /auth/callback", () => {
  it("swaps the code for a session and goes where the person was heading", async () => {
    const res = await callback("?code=abc&next=/dashboard");
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(location(res).pathname).toBe("/dashboard");
    expect(location(res).origin).toBe("http://localhost:3000");
  });

  it("defaults to the create-wedding page", async () => {
    expect(location(await callback("?code=abc")).pathname).toBe("/create");
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)"])("never leaves the site, even for next=%s", async (next) => {
    const res = await callback(`?code=abc&next=${encodeURIComponent(next)}`);
    expect(location(res).origin).toBe("http://localhost:3000");
    expect(location(res).pathname).toBe("/create");
  });

  it("goes back to sign-in with a message when the swap fails", async () => {
    exchangeCodeForSession.mockResolvedValue({ error: new Error("bad code") });
    const res = await callback("?code=bad&next=/dashboard");
    expect(location(res).pathname).toBe("/login");
    expect(location(res).searchParams.get("error")).toBe("google");
    expect(location(res).searchParams.get("next")).toBe("/dashboard");
  });

  it("goes back to sign-in when Google sent no code (the person said no)", async () => {
    const res = await callback("?error=access_denied");
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(location(res).pathname).toBe("/login");
    expect(location(res).searchParams.get("error")).toBe("google");
  });

  it("gives up and says so when Supabase never answers, instead of leaving the person waiting", async () => {
    vi.useFakeTimers();
    try {
      exchangeCodeForSession.mockReturnValue(new Promise(() => {}));
      const pending = callback("?code=abc&next=/dashboard");
      await vi.advanceTimersByTimeAsync(10_000);
      const res = await pending;
      expect(location(res).pathname).toBe("/login");
      expect(location(res).searchParams.get("error")).toBe("google");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses the configured public address when there is one", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://gatherbell.example";
    expect(location(await callback("?code=abc")).origin).toBe("https://gatherbell.example");
  });
});
