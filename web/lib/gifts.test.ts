import { describe, expect, it } from "vitest";

import { filterGifts, formatRupees, giftPayload, giftTotals, statusLabel, validateGift, type GiftForm, type GiftRow } from "./gifts";

const row = (over: Partial<GiftRow>): Pick<GiftRow, "side" | "method" | "amount_paise" | "status"> => ({ side: "bride", method: "upi", amount_paise: 110000, status: "received", ...over });

describe("giftTotals", () => {
  it("counts received gifts only, per side and together", () => {
    const totals = giftTotals([
      row({}),
      row({ side: "groom", method: "cash", amount_paise: 510000 }),
      row({ status: "claimed", amount_paise: 999900 }),
      row({ status: "rejected", amount_paise: 999900 }),
      row({ method: "gift", amount_paise: null }),
    ]);
    expect(totals.bride).toEqual({ amountPaise: 110000, moneyCount: 1, physicalCount: 1 });
    expect(totals.groom).toEqual({ amountPaise: 510000, moneyCount: 1, physicalCount: 0 });
    expect(totals.all).toEqual({ amountPaise: 620000, moneyCount: 2, physicalCount: 1 });
  });

  it("a guest's note moves the totals only once a host marks it received", () => {
    const note = row({ status: "claimed" });
    expect(giftTotals([note]).all.amountPaise).toBe(0);
    expect(giftTotals([{ ...note, status: "received" }]).all.amountPaise).toBe(110000);
  });
});

describe("labels", () => {
  it("says plainly when a guest's note has not been checked", () => {
    expect(statusLabel({ status: "claimed", source: "guest" })).toBe("Guest says sent, not checked");
    expect(statusLabel({ status: "claimed", source: "host" })).toBe("Not checked");
    expect(statusLabel({ status: "received", source: "guest" })).toBe("Received");
    expect(statusLabel({ status: "rejected", source: "guest" })).toBe("Not received");
  });

  it("formats rupees the Indian way", () => {
    expect(formatRupees(11000000)).toBe("₹1,10,000");
    expect(formatRupees(0)).toBe("₹0");
  });
});

describe("filterGifts", () => {
  const rows = [
    { id: "1", side: "bride", status: "claimed" },
    { id: "2", side: "groom", status: "received" },
    { id: "3", side: "bride", status: "rejected" },
  ] as const;
  it("filters by side and by check", () => {
    expect(filterGifts(rows, { side: "bride", status: "all" }).map((r) => r.id)).toEqual(["1", "3"]);
    expect(filterGifts(rows, { side: "all", status: "unchecked" }).map((r) => r.id)).toEqual(["1"]);
    expect(filterGifts(rows, { side: "groom", status: "received" }).map((r) => r.id)).toEqual(["2"]);
    expect(filterGifts(rows, { side: "all", status: "all" })).toHaveLength(3);
  });
});

describe("the record-a-gift form", () => {
  const form = (over: Partial<GiftForm>): GiftForm => ({ side: "bride", giver_name: "Sharma uncle", method: "cash", amount: "5,100", description: "", note: "", ...over });

  it("money needs whole rupees; commas and the rupee sign are fine", () => {
    expect(validateGift(form({}))).toEqual({});
    expect(validateGift(form({ amount: "₹ 1,10,000" }))).toEqual({});
    expect(validateGift(form({ amount: "" })).amount).toBeTruthy();
    expect(validateGift(form({ amount: "51.5" })).amount).toBeTruthy();
    expect(validateGift(form({ amount: "0" })).amount).toBeTruthy();
    expect(validateGift(form({ amount: "10000001" })).amount).toBeTruthy();
  });

  it("a physical gift needs a description and ignores the amount", () => {
    expect(validateGift(form({ method: "gift", amount: "" })).description).toBeTruthy();
    expect(validateGift(form({ method: "gift", amount: "", description: "Silver diya set" }))).toEqual({});
    expect(giftPayload(form({ method: "gift", amount: "900", description: " Silver diya set " }))).toEqual({ side: "bride", giver_name: "Sharma uncle", method: "gift", description: "Silver diya set" });
  });

  it("needs a name", () => {
    expect(validateGift(form({ giver_name: "  " })).giver_name).toBeTruthy();
  });

  it("sends rupees as a number and leaves an empty note out", () => {
    expect(giftPayload(form({ note: "  " }))).toEqual({ side: "bride", giver_name: "Sharma uncle", method: "cash", amount_rupees: 5100 });
    expect(giftPayload(form({ method: "upi", amount: "501", note: "Seen in bank app" }))).toMatchObject({ amount_rupees: 501, note: "Seen in bank app" });
  });
});
