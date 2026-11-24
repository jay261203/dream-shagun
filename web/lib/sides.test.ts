import { describe, expect, it } from "vitest";

import { isSide, maskUpi, parseSideErrors, sidePayload, validateSide } from "./sides";

const ok = { upi_id: "meera@okhdfc", payee_name: "Meera Shah", wish: "Join us in blessing our new home" };

describe("validateSide", () => {
  it("accepts a full side, and a side with nothing set up yet", () => {
    expect(validateSide(ok)).toEqual({});
    expect(validateSide({ upi_id: "", payee_name: "", wish: "" })).toEqual({});
    expect(validateSide({ upi_id: "", payee_name: "", wish: "Only a wish" })).toEqual({});
  });
  it.each(["meera", "meera@", "@okhdfc", "a@b", "meera@ok hdfc", "meera@okhdfc?pa=evil@upi", "me era@okhdfc"])("refuses the UPI ID %j", (id) => {
    expect(validateSide({ ...ok, upi_id: id }).upi_id).toBeTruthy();
  });
  it("needs the ID and the name together, naming the one that is missing", () => {
    expect(validateSide({ ...ok, payee_name: " " }).payee_name).toMatch(/name/i);
    expect(validateSide({ ...ok, upi_id: "" }).upi_id).toMatch(/UPI ID/);
  });
  it("limits lengths", () => {
    expect(validateSide({ ...ok, payee_name: "n".repeat(61) }).payee_name).toBeTruthy();
    expect(validateSide({ ...ok, wish: "w".repeat(121) }).wish).toBeTruthy();
  });
});

describe("sidePayload", () => {
  it("trims, and turns blanks into null so they are cleared", () => {
    expect(sidePayload({ upi_id: " a@okhdfc ", payee_name: " ", wish: "  " })).toEqual({ upi_id: "a@okhdfc", payee_name: null, wish: null });
  });
});

describe("parseSideErrors", () => {
  it("puts a field problem next to its field and drops the technical prefix", () => {
    expect(parseSideErrors({ detail: [{ loc: ["body", "upi_id"], msg: "Value error, Check the UPI ID. It looks like name@bank" }] })).toEqual({ upi_id: "Check the UPI ID. It looks like name@bank" });
  });
  it("shows a whole-form problem (no field) as a form message", () => {
    expect(parseSideErrors({ detail: [{ loc: ["body"], msg: "Value error, Add the name shown when guests pay" }] })).toEqual({ form: "Add the name shown when guests pay" });
    expect(parseSideErrors({ detail: "Save a UPI ID and a name for this side first" })).toEqual({ form: "Save a UPI ID and a name for this side first" });
    expect(parseSideErrors(null).form).toBeTruthy();
  });
});

describe("small helpers", () => {
  it("masks a UPI ID but keeps the bank", () => {
    expect(maskUpi("meera@okhdfc")).toBe("mee**@okhdfc");
    expect(maskUpi("ab@upi")).toBe("ab*@upi");
    expect(maskUpi("nonsense")).toBe("nonsense");
  });
  it("knows the two sides", () => {
    expect(isSide("bride") && isSide("groom")).toBe(true);
    expect(isSide("both")).toBe(false);
    expect(isSide("../x")).toBe(false);
  });
});
