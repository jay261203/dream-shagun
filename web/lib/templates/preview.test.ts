import { describe, expect, it } from "vitest";

import { loadTemplate } from "./load";
import { MAX_NAME_LENGTH, previewWedding, validDate } from "./preview";

describe("validDate", () => {
  it.each(["2027-02-14", "2028-02-29", "2000-01-01"])("accepts %s", (d) => expect(validDate(d)).toBe(d));
  it.each(["", "14-02-2027", "2027-02-30", "2027-13-01", "1999-12-31", "2101-01-01", "2027-2-4", "abc", "2027-02-14<script>"])("rejects %j", (d) => expect(validDate(d)).toBeNull());
});

describe("previewWedding", async () => {
  const { manifest } = await loadTemplate("marigold");

  it("falls back to the sample for anything missing", () => {
    const w = previewWedding(manifest, {});
    expect([w.bride_name, w.groom_name, w.wedding_date]).toEqual(["Diya", "Aarav", "2027-02-14"]);
    expect(w.color_preset).toBeNull();
    expect(w.template_id).toBe("marigold");
  });

  it("uses what was typed, trimmed and with spaces tidied", () => {
    const w = previewWedding(manifest, { bride: "  Riya   Shah ", groom: "Karan", date: "2028-05-10" });
    expect(w.bride_name).toBe("Riya Shah");
    expect(w.groom_name).toBe("Karan");
    expect(w.wedding_date).toBe("2028-05-10");
  });

  it("caps long names so the cover still fits", () => {
    expect(previewWedding(manifest, { bride: "A".repeat(500) }).bride_name).toHaveLength(MAX_NAME_LENGTH);
  });

  it("treats a blank or whitespace name as missing", () => {
    expect(previewWedding(manifest, { bride: "   " }).bride_name).toBe("Diya");
  });

  it("ignores a bad date and takes only the first of a repeated option", () => {
    expect(previewWedding(manifest, { date: "2027-02-30" }).wedding_date).toBe("2027-02-14");
    expect(previewWedding(manifest, { bride: ["First", "Second"] }).bride_name).toBe("First");
  });

  it("accepts only colours and fonts the template declares", () => {
    expect(previewWedding(manifest, { color: "rose", font: "soft" })).toMatchObject({ color_preset: "rose", font_pair: "soft" });
    expect(previewWedding(manifest, { color: "hotpink", font: "comic" })).toMatchObject({ color_preset: null, font_pair: null });
  });

  it("moves the events with the date", () => {
    const w = previewWedding(manifest, { date: "2028-05-10" });
    const days = w.events.map((e) => new Date(e.starts_at).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }));
    expect(days).toEqual(["2028-05-08", "2028-05-09", "2028-05-10", "2028-05-10"]);
  });
});
