import { describe, expect, it } from "vitest";

import { emptyMomentForm, fitWithin, formFromMoment, momentPayload, monthLabel, parseMomentErrors, rowToMoment, validateMoment } from "./moments";

describe("validateMoment", () => {
  it("accepts a title alone", () => {
    expect(validateMoment(emptyMomentForm("How we met"))).toEqual({});
  });
  it("needs a title", () => {
    expect(validateMoment(emptyMomentForm("   ")).title).toBeTruthy();
  });
  it.each(["2024-13", "2024-00", "24-03", "1949-12", "2101-01", "march"])("refuses the month %j", (month) => {
    expect(validateMoment({ ...emptyMomentForm("x"), month }).month).toBeTruthy();
  });
  it("accepts a real month and refuses a long caption", () => {
    expect(validateMoment({ ...emptyMomentForm("x"), month: "2024-03" })).toEqual({});
    expect(validateMoment({ ...emptyMomentForm("x"), caption: "a".repeat(301) }).caption).toBeTruthy();
  });
});

describe("payload and rows", () => {
  it("turns blanks into null and trims", () => {
    expect(momentPayload({ title: " Hi ", month: "", caption: "  ", photo_url: "" })).toEqual({ title: "Hi", month: null, caption: null, photo_url: null });
  });
  it("round-trips a row through the form", () => {
    const item = rowToMoment({ id: "1", title: "Met", happened_on: "2024-03-01", caption: null, photo_url: "https://x/y.jpg", sort_order: 2 });
    expect(item.month).toBe("2024-03");
    expect(formFromMoment(item)).toEqual({ title: "Met", month: "2024-03", caption: "", photo_url: "https://x/y.jpg" });
  });
  it("writes the month in words", () => {
    expect(monthLabel("2024-03")).toBe("March 2024");
    expect(monthLabel(null)).toBeNull();
    expect(monthLabel("junk")).toBeNull();
  });
});

describe("parseMomentErrors", () => {
  it("puts a field problem next to the field", () => {
    expect(parseMomentErrors({ detail: [{ loc: ["body", "photo_url"], msg: "x" }] })).toEqual({ photo_url: "Check the photo." });
  });
  it("passes a plain message through and has a fallback", () => {
    expect(parseMomentErrors({ detail: "A story can have at most 12 moments" })).toEqual({ form: "A story can have at most 12 moments" });
    expect(parseMomentErrors(null).form).toBeTruthy();
  });
});

describe("fitWithin", () => {
  it("shrinks the long side to the limit and keeps the shape", () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });
  it("never enlarges a small photo", () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});
