import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it.each(["/create", "/dashboard", "/templates/marigold", "/dashboard?created=diya-and-aarav"])("keeps the site path %s", (p) => {
    expect(safeNext(p)).toBe(p);
  });

  it.each([
    "https://evil.example",
    "http://evil.example/create",
    "//evil.example",
    "//evil.example/create",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "create",
    "/ok\nhttps://evil.example",
    "/redirect?to=https://evil.example",
    "",
  ])("falls back for %j", (p) => {
    expect(safeNext(p)).toBe("/create");
  });

  it("falls back for a missing value and honours a custom fallback", () => {
    expect(safeNext(null)).toBe("/create");
    expect(safeNext(undefined, "/dashboard")).toBe("/dashboard");
  });
});
