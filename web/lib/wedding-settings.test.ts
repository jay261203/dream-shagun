import { describe, expect, it } from "vitest";

import { SECTION_CHOICES, parseSaveError, savedLabel, storyPayload, validateStoryForm, withSection } from "./wedding-settings";

const ok = { bride_name: "Meera", groom_name: "Dev", wedding_date: "2028-02-12", story: "Hello" };
const MANAGED = SECTION_CHOICES.map((s) => s.key);

describe("validateStoryForm", () => {
  it("accepts a complete form and a form with no date or story", () => {
    expect(validateStoryForm(ok)).toEqual({});
    expect(validateStoryForm({ ...ok, wedding_date: "", story: "" })).toEqual({});
  });
  it("needs both names", () => {
    expect(validateStoryForm({ ...ok, bride_name: "  " }).bride_name).toBeTruthy();
    expect(validateStoryForm({ ...ok, groom_name: "" }).groom_name).toBeTruthy();
  });
  it.each(["2028-02-30", "1999-12-31", "2101-01-01", "12/02/2028", "x"])("refuses the date %j", (d) => {
    expect(validateStoryForm({ ...ok, wedding_date: d }).wedding_date).toBeTruthy();
  });
  it("limits lengths", () => {
    expect(validateStoryForm({ ...ok, bride_name: "a".repeat(81) }).bride_name).toBeTruthy();
    expect(validateStoryForm({ ...ok, story: "s".repeat(5001) }).story).toBeTruthy();
  });
});

describe("storyPayload", () => {
  it("trims, and turns an empty date or story into null so they are cleared", () => {
    expect(storyPayload({ bride_name: " A ", groom_name: " B ", wedding_date: "", story: "  " })).toEqual({ bride_name: "A", groom_name: "B", wedding_date: null, story: null });
  });
});

describe("withSection", () => {
  it("switches one section off and keeps the rest", () => {
    expect(withSection(["cover", "couple", "journey", "events"], "journey", false, MANAGED)).toEqual(["cover", "couple", "events"]);
  });
  it("switches one on, in the page order of the choices", () => {
    expect(withSection(["cover", "events"], "couple", true, MANAGED)).toEqual(["cover", "couple", "events"]);
  });
  it("keeps sections this editor does not manage, and always keeps the cover", () => {
    expect(withSection(["countdown", "contact", "events"], "events", false, MANAGED)).toEqual(["cover", "countdown", "contact"]);
  });
});

describe("messages", () => {
  it("names the field the API refused", () => {
    expect(parseSaveError({ detail: [{ loc: ["body", "wedding_date"] }, { loc: ["body", "story"] }] })).toBe("Check the date and story.");
    expect(parseSaveError({ detail: "Nothing to change" })).toBe("Nothing to change");
    expect(parseSaveError(null)).toMatch(/could not save/);
  });
  it("says when it saved", () => {
    expect(savedLabel(null, 1000)).toBe("");
    expect(savedLabel(1000, 3000)).toBe("Saved a moment ago");
    expect(savedLabel(1000, 31_000)).toBe("Saved 30 seconds ago");
    expect(savedLabel(0, 180_000)).toBe("Saved 3 minutes ago");
    expect(savedLabel(0, 60_000 * 90)).toBe("Saved earlier");
  });
});
