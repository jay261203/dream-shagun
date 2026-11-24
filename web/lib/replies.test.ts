import { describe, expect, it } from "vitest";

import { answerLabel, countsByEvent, foodLabel, repliesByGuest, type ReplyGuest, type ReplyRow } from "./replies";

const events = [
  { id: "e1", name: "Mehendi" },
  { id: "e2", name: "Pheras" },
];
const guests: ReplyGuest[] = [
  { id: "g1", display_name: "Rohan", phone: null, created_at: "2028-01-01T10:00:00Z" },
  { id: "g2", display_name: "Asha", phone: "+91 98765 43210", created_at: "2028-01-02T10:00:00Z" },
];
const row = (guest_id: string, event_id: string, response: ReplyRow["response"], party_size: number, food_choice: string | null = null, allergies: string | null = null): ReplyRow => ({ guest_id, event_id, response, party_size, food_choice, allergies });
const rows = [row("g1", "e1", "yes", 3, "jain", "Peanuts"), row("g1", "e2", "maybe", 2, "jain", "Peanuts"), row("g2", "e1", "yes", 2, "veg"), row("g2", "e2", "no", 0, "veg")];

describe("countsByEvent", () => {
  it("adds up people, not guests, for coming and maybe", () => {
    expect(countsByEvent(events, rows).map((c) => [c.event.name, c.coming, c.maybe, c.notComing])).toEqual([
      ["Mehendi", 5, 0, 0],
      ["Pheras", 0, 2, 1],
    ]);
  });
  it("is all zeros with no replies", () => {
    expect(countsByEvent(events, []).every((c) => c.coming === 0 && c.maybe === 0 && c.notComing === 0)).toBe(true);
  });
});

describe("repliesByGuest", () => {
  const list = repliesByGuest(events, guests, rows);
  it("puts the newest guest first and keeps answers in event order", () => {
    expect(list.map((g) => g.guest.display_name)).toEqual(["Asha", "Rohan"]);
    expect(list[1].answers.map((a) => [a.event.name, a.response, a.party_size])).toEqual([["Mehendi", "yes", 3], ["Pheras", "maybe", 2]]);
  });
  it("carries the food and allergies of the party", () => {
    expect(list[1].food).toBe("jain");
    expect(list[1].allergies).toBe("Peanuts");
    expect(list[0].allergies).toBeNull();
  });
  it("skips events a guest did not answer", () => {
    expect(repliesByGuest(events, guests, [row("g1", "e2", "yes", 1)])[1].answers.map((a) => a.event.name)).toEqual(["Pheras"]);
  });
});

describe("labels", () => {
  it("words each answer", () => {
    expect(answerLabel({ response: "yes", party_size: 1 })).toBe("Coming, 1 person");
    expect(answerLabel({ response: "maybe", party_size: 4 })).toBe("Maybe, 4 people");
    expect(answerLabel({ response: "no", party_size: 0 })).toBe("Not coming");
    expect(foodLabel("jain")).toBe("Jain");
    expect(foodLabel("steak")).toBeNull();
    expect(foodLabel(null)).toBeNull();
  });
});
