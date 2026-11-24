import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";

import { loadTemplate } from "./load";
import { renderWedding } from "./render";
import { renderGiftPage, type GiftData } from "./render-gift";
import type { WeddingData } from "./types";

const wedding: WeddingData = {
  slug: "diya-and-aarav", bride_name: "Diya", groom_name: "Aarav", wedding_date: "2027-02-14", story: null, cover_photo_url: null, template_id: null,
  color_preset: null, font_pair: null, music_url: null, sections_enabled: ["cover", "events", "rsvp", "guestbook"], languages: ["en"],
  blessings_enabled: true, rsvp_deadline: null, events: [], moments: [],
};
const side = { side: "bride" as const, host: "Diya", wish: "Bless our new home", upi_id: "diya@okhdfc", payee_name: "Diya Rao", link: "upi://pay?pa=diya@okhdfc&pn=Diya%20Rao&cu=INR" };
const opts = { origin: "https://gatherbell.example" };

describe("the gift page", () => {
  it("shows each ready side with a QR code, a pay link with no amount and the UPI ID", async () => {
    const t = await loadTemplate("marigold");
    const html = await renderGiftPage(t, wedding, { mode: "link", sides: [side] }, opts);
    expect(html).toContain("Diya's side");
    expect(html).toContain("diya@okhdfc");
    expect(parse(html).querySelector("a.gift__open")?.getAttribute("href")).toBe(side.link);
    expect(html).toContain("data:image/png;base64,");
    expect(side.link).not.toContain("am=");
    expect(parse(html).querySelector("main")?.text).not.toMatch(/₹|minimum|preset/i);
    expect(html).toContain('data-slot="gift-note"');
    expect(html).toContain("/guest/gift.js?v=");
    expect(html).toContain('href="/w/diya-and-aarav"');
  });

  it("is kept out of search results and points back to the invitation", async () => {
    const t = await loadTemplate("marigold");
    const html = await renderGiftPage(t, wedding, { mode: "private", sides: [side] }, opts);
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain("https://gatherbell.example/w/diya-and-aarav/gift");
  });

  it("escapes names and wishes written by the hosts", async () => {
    const t = await loadTemplate("marigold");
    const bad: GiftData = { mode: "link", sides: [{ ...side, host: "<script>alert(1)</script>", wish: "\"><img src=x onerror=alert(1)>", payee_name: "<b>x</b>" }] };
    const html = await renderGiftPage(t, wedding, bad, opts);
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>x</b>");
  });

  it("says so, with no form and no script, when no side is set up", async () => {
    const t = await loadTemplate("marigold");
    const html = await renderGiftPage(t, wedding, { mode: "link", sides: [] }, opts);
    expect(html).toContain("have not added gift details yet");
    expect(html).not.toContain("/guest/gift.js");
    expect(html).not.toContain('data-slot="gift-note"');
  });
});

describe("the small gift link on the invitation", () => {
  const page = async (patch: Partial<WeddingData>) => renderWedding(await loadTemplate("marigold"), { ...wedding, ...patch }, opts);

  it("shows by default, because every invitation today is a wedding", async () => {
    expect(await page({})).toContain('href="/w/diya-and-aarav/gift"');
  });
  it("is gone when the hosts keep the page private or turn it off", async () => {
    expect(await page({ gift_mode: "private" })).not.toContain("Thinking of a gift");
    expect(await page({ gift_mode: "off" })).not.toContain("Thinking of a gift");
  });
  it("points nowhere in a preview, where the gift page does not exist yet", async () => {
    const preview = await page({ events: [{ name: "A", starts_at: "2027-02-13T13:30:00Z", venue_name: null, venue_address: null, map_url: null, sort_order: 1, kind: "other", dress_code: null, note: null }] });
    expect(preview).toContain('<a href="#">Thinking of a gift?</a>');
  });
});
