import { describe, expect, it } from "vitest";

import { checklist, inviteUrl, publishError, whatsappLink, whatsappMessage } from "./publish";

const ok = { bride_name: "Meera", groom_name: "Dev", wedding_date: "2028-02-12", event_count: 2 };

describe("checklist", () => {
  it("is all done for a complete wedding", () => {
    expect(checklist(ok).every((i) => i.ok && i.fix === null)).toBe(true);
  });
  it("points each missing item at the screen that fixes it", () => {
    const items = checklist({ bride_name: " ", groom_name: "Dev", wedding_date: null, event_count: 0 });
    expect(items.map((i) => [i.label, i.ok, i.fix])).toEqual([
      ["Both names", false, "story"],
      ["The wedding date", false, "story"],
      ["At least one event", false, "events"],
    ]);
  });
});

describe("sharing", () => {
  it("builds the public address without doubling slashes or trusting odd characters", () => {
    expect(inviteUrl("https://gatherbell.example/", "meera-and-dev")).toBe("https://gatherbell.example/w/meera-and-dev");
    expect(inviteUrl("http://localhost:3000", "a/b?x")).toBe("http://localhost:3000/w/a%2Fb%3Fx");
  });
  it("writes a short message with the names and the link only", () => {
    expect(whatsappMessage("Meera", "Dev", "https://x/w/m")).toBe("You are invited to the wedding of Meera and Dev. Open the invitation here: https://x/w/m");
  });
  it("encodes the message for WhatsApp", () => {
    const link = whatsappLink("Hi & welcome: https://x/w/m?a=1");
    expect(link.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(link.slice("https://wa.me/?text=".length))).toBe("Hi & welcome: https://x/w/m?a=1");
    expect(link).not.toContain(" ");
  });
});

describe("publishError", () => {
  it("reads the API's list of what is missing", () => {
    expect(publishError({ detail: { missing: ["At least one event"], message: "Add these first: at least one event" } })).toBe("Add these first: at least one event");
    expect(publishError({ detail: "Wedding not found" })).toBe("Wedding not found");
    expect(publishError(null)).toMatch(/could not/);
  });
});
