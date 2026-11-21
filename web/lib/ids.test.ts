import { describe, expect, it } from "vitest";

import { isId } from "./ids";

describe("isId", () => {
  it("accepts a real id in either case", () => {
    expect(isId("11111111-1111-1111-1111-111111111111")).toBe(true);
    expect(isId("ABCDEF12-3456-7890-ABCD-EF1234567890")).toBe(true);
  });
  it.each(["", "abc", "../me", "11111111-1111-1111-1111-11111111111", "11111111-1111-1111-1111-1111111111111", "11111111-1111-1111-1111-11111111111g", "11111111-1111-1111-1111-111111111111/x", " 11111111-1111-1111-1111-111111111111"])("rejects %j", (v) => {
    expect(isId(v)).toBe(false);
  });
});
