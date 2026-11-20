import { describe, expect, it } from "vitest";

import { finalSlug, isValidSlug, slugify, suggestSlug, typingSlug } from "./slug";

describe("slugify", () => {
  it("lowercases, drops accents and joins words with single dashes", () => {
    expect(slugify("Riya & Karan!")).toBe("riya-karan");
    expect(slugify("  Zoë  Müller ")).toBe("zoe-muller");
    expect(slugify("---a---b---")).toBe("a-b");
  });

  it("keeps only what the database accepts", () => {
    expect(slugify("<script>alert(1)</script>")).toBe("script-alert-1-script");
    expect(slugify("😀😀")).toBe("");
  });

  it("caps the length without leaving a trailing dash", () => {
    const out = slugify("a".repeat(59) + " b");
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith("-")).toBe(false);
  });
});

describe("typingSlug and finalSlug", () => {
  it("lets a dash stand while typing so a word can follow", () => {
    expect(typingSlug("riya-")).toBe("riya-");
    expect(typingSlug("riya-and")).toBe("riya-and");
  });

  it("cleans what is not allowed as it goes", () => {
    expect(typingSlug("Riya & Karan")).toBe("riya-karan");
    expect(typingSlug("--riya")).toBe("riya");
    expect(typingSlug("a  b")).toBe("a-b");
  });

  it("drops the dangling dash for the value that is checked and saved", () => {
    expect(finalSlug("riya-and-")).toBe("riya-and");
    expect(finalSlug("riya")).toBe("riya");
  });
});

describe("suggestSlug", () => {
  it("uses the first names", () => {
    expect(suggestSlug("Riya Shah", "Karan Patel")).toBe("riya-and-karan");
  });

  it("gives nothing until both names have letters", () => {
    expect(suggestSlug("Riya", "")).toBe("");
    expect(suggestSlug("", "Karan")).toBe("");
    expect(suggestSlug("😀", "Karan")).toBe("");
  });
});

describe("isValidSlug", () => {
  it.each(["abc", "diya-and-aarav", "a1-b2"])("accepts %s", (s) => expect(isValidSlug(s)).toBe(true));
  it.each(["ab", "-abc", "abc-", "a--b", "Abc", "a b", "a".repeat(61)])("rejects %s", (s) => expect(isValidSlug(s)).toBe(false));
});
