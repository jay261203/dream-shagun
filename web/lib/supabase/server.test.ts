import { beforeEach, describe, expect, it, vi } from "vitest";

const order: string[] = [];
const getClaims = vi.fn(async () => {
  order.push("getClaims");
  return { data: { claims: { sub: "user-1", email: "a@example.com" } } };
});

vi.mock("next/server", () => ({
  connection: vi.fn(async () => {
    order.push("connection");
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims } }),
}));

import { currentClaims } from "./server";

beforeEach(() => {
  order.length = 0;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
});

describe("currentClaims", () => {
  it("waits for a real request before the login token is checked, because the check reads the clock", async () => {
    const claims = await currentClaims();
    expect(order).toEqual(["connection", "getClaims"]);
    expect(claims).toMatchObject({ sub: "user-1" });
  });

  it("returns null when nobody is signed in", async () => {
    getClaims.mockResolvedValueOnce({ data: null } as never);
    expect(await currentClaims()).toBeNull();
  });
});
