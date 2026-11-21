import { describe, expect, it } from "vitest";

import { emptyForm, formFromEvent, isInDateOrder, kindInfo, moveItem, parseApiErrors, rowToEvent, sortedByDate, toPayload, validateForm, whenLabel, type EventForm, type EventItem } from "./events";

const good: EventForm = { ...emptyForm("2027-02-14"), name: "Pheras", kind: "pheras", local_time: "10:30" };

function ev(id: string, starts_at: string): EventItem {
  return { id, name: id, kind: "other", starts_at, local_date: "2027-02-14", local_time: "10:00", venue_name: null, venue_address: null, map_url: null, dress_code: null, note: null, sort_order: 0 };
}

describe("emptyForm", () => {
  it("starts with the wedding date and a first event ready to edit", () => {
    expect(emptyForm("2027-02-14")).toMatchObject({ local_date: "2027-02-14", name: "Mehendi", kind: "mehendi", local_time: "11:00" });
  });
  it("leaves the date empty when the wedding has none", () => {
    expect(emptyForm(null).local_date).toBe("");
  });
});

describe("toPayload", () => {
  it("trims, and turns empty optional fields into nothing", () => {
    expect(toPayload({ ...good, name: "  Pheras  ", venue_name: "  ", dress_code: "Colourful ", note: "" })).toMatchObject({
      name: "Pheras",
      venue_name: null,
      dress_code: "Colourful",
      note: null,
      map_url: null,
    });
  });
  it("round-trips through formFromEvent", () => {
    const e = { ...ev("a", "2027-02-14T05:00:00.000Z"), name: "Pheras", venue_name: "Vasant", note: "Hi" };
    expect(toPayload(formFromEvent(e))).toMatchObject({ name: "Pheras", venue_name: "Vasant", note: "Hi", venue_address: null });
  });
});

describe("validateForm", () => {
  it("accepts a good form", () => expect(validateForm(good)).toEqual({}));

  it("asks for the missing basics in plain words", () => {
    const e = validateForm({ ...good, name: "  ", local_date: "", local_time: "" });
    expect(e.name).toBe("Give the event a name.");
    expect(e.local_date).toBe("Pick the date.");
    expect(e.local_time).toBe("Pick the time.");
  });

  it.each(["2027-02-30", "14-02-2027", "1999-01-01"])("rejects the date %s", (d) => expect(validateForm({ ...good, local_date: d }).local_date).toBeDefined());
  it.each(["7pm", "24:00", "10:60", "1:30"])("rejects the time %s", (t) => expect(validateForm({ ...good, local_time: t }).local_time).toBeDefined());

  it.each(["javascript:alert(1)", "ftp://x.example/a", "not a link", "maps.google.com/x"])("rejects the map link %s", (u) => expect(validateForm({ ...good, map_url: u }).map_url).toBeDefined());
  it.each(["https://maps.example/a?b=c", "http://localhost:3000/x"])("accepts the map link %s", (u) => expect(validateForm({ ...good, map_url: u }).map_url).toBeUndefined());

  it("keeps text within the limits the API enforces", () => {
    expect(validateForm({ ...good, name: "x".repeat(81) }).name).toBeDefined();
    expect(validateForm({ ...good, note: "x".repeat(301) }).note).toBeDefined();
    expect(validateForm({ ...good, note: "x".repeat(300) }).note).toBeUndefined();
  });
});

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];
  it("moves down and up", () => {
    expect(moveItem(list, 0, 1)).toEqual(["b", "a", "c", "d"]);
    expect(moveItem(list, 3, 2)).toEqual(["a", "b", "d", "c"]);
    expect(moveItem(list, 0, 3)).toEqual(["b", "c", "d", "a"]);
  });
  it("leaves the list alone for moves that make no sense, and never changes the original", () => {
    expect(moveItem(list, 0, -1)).toEqual(list);
    expect(moveItem(list, 3, 4)).toEqual(list);
    expect(moveItem(list, 2, 2)).toEqual(list);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });
});

describe("date order", () => {
  const a = ev("a", "2027-02-12T06:00:00.000Z");
  const b = ev("b", "2027-02-13T13:30:00.000Z");
  const c = ev("c", "2027-02-14T05:00:00.000Z");
  it("sorts by the time of the event", () => expect(sortedByDate([c, a, b]).map((e) => e.id)).toEqual(["a", "b", "c"]));
  it("knows when a list is already in date order", () => {
    expect(isInDateOrder([a, b, c])).toBe(true);
    expect(isInDateOrder([b, a, c])).toBe(false);
  });
});

describe("whenLabel", () => {
  it("writes the India date and time the way people say them", () => {
    expect(whenLabel({ local_date: "2027-02-13", local_time: "19:00" })).toBe("Sat, 13 Feb 2027 · 7:00 pm");
    expect(whenLabel({ local_date: "2027-02-14", local_time: "00:30" })).toBe("Sun, 14 Feb 2027 · 12:30 am");
    expect(whenLabel({ local_date: "2027-02-14", local_time: "12:00" })).toBe("Sun, 14 Feb 2027 · 12:00 pm");
  });
  it("falls back to the raw text for something odd rather than crashing", () => {
    expect(whenLabel({ local_date: "", local_time: "" })).toBe(" ");
  });
});

describe("rowToEvent", () => {
  it("turns the stored UTC time into India time", () => {
    const e = rowToEvent({ id: "1", name: "Sangeet", kind: "sangeet", starts_at: "2027-02-13T13:30:00+00:00", sort_order: 2 });
    expect([e.local_date, e.local_time]).toEqual(["2027-02-13", "19:00"]);
  });
  it("keeps the India day after midnight even though UTC is still the day before", () => {
    const e = rowToEvent({ id: "1", name: "Late", kind: "other", starts_at: "2027-02-13T19:00:00+00:00" });
    expect([e.local_date, e.local_time]).toEqual(["2027-02-14", "00:30"]);
  });
  it("is cleaned up: unknown kind becomes other, empty text becomes nothing", () => {
    const e = rowToEvent({ id: "1", name: "X", kind: "party", starts_at: "2027-02-14T05:00:00Z", venue_name: "", note: "Hi" });
    expect(e.kind).toBe("other");
    expect(e.venue_name).toBeNull();
    expect(e.note).toBe("Hi");
  });
});

describe("kindInfo", () => {
  it("falls back to other for an unknown kind", () => expect(kindInfo("party").value).toBe("other"));
});

describe("parseApiErrors", () => {
  it("shows a plain message from the API as one line", () => {
    expect(parseApiErrors({ detail: "A wedding can have at most 20 events" })).toEqual({ form: "A wedding can have at most 20 events" });
  });

  it("puts field problems next to the field they are about", () => {
    const body = { detail: [{ loc: ["body", "map_url"], msg: "x" }, { loc: ["body", "local_time"], msg: "y" }] };
    expect(parseApiErrors(body)).toEqual({ map_url: "Check the map link.", local_time: "Check the time." });
  });

  it("falls back to one friendly line for anything it does not understand", () => {
    expect(parseApiErrors({ detail: [{ loc: ["body", "mystery"], msg: "z" }] }).form).toMatch(/not accepted/);
    expect(parseApiErrors(null).form).toMatch(/try again/);
    expect(parseApiErrors({}).form).toMatch(/try again/);
  });
});
