import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadTemplate } from "./load";
import { renderWedding } from "./render";
import type { WeddingData } from "./types";

const FIXTURES = path.join(__dirname, "__fixtures__");
const origin = "https://dreamshagun.example";

function wedding(overrides: Partial<WeddingData> = {}): WeddingData {
  return {
    slug: "diya-and-aarav",
    bride_name: "Diya",
    groom_name: "Aarav",
    wedding_date: "2027-02-14",
    story: null,
    cover_photo_url: "https://cdn.example/cover.jpg",
    template_id: "basic",
    color_preset: null,
    font_pair: null,
    music_url: null,
    sections_enabled: ["cover", "journey", "events", "rsvp", "blessing"],
    languages: ["en"],
    blessings_enabled: true,
    rsvp_deadline: null,
    events: [
      {
        name: "Pheras",
        starts_at: "2027-02-14T05:00:00Z",
        venue_name: "Vasant Lawns",
        venue_address: null,
        map_url: "https://maps.example/vasant",
        sort_order: 2,
        kind: "pheras",
        dress_code: null,
        note: null,
      },
      {
        name: "Sangeet",
        starts_at: "2027-02-13T13:30:00Z",
        venue_name: "Vasant Lawns",
        venue_address: null,
        map_url: null,
        sort_order: 1,
        kind: "sangeet",
        dress_code: "Colourful",
        note: null,
      },
    ],
    moments: [{ title: "We met", happened_on: "2023-03-01", caption: "At a wedding.", photo_url: null, sort_order: 1 }],
    ...overrides,
  };
}

async function render(data: WeddingData) {
  const template = await loadTemplate("basic", FIXTURES);
  return renderWedding(template, data, { origin });
}

describe("renderWedding", () => {
  it("fills names, date and events in order, with times in India time", async () => {
    const html = await render(wedding());
    expect(html).toContain("<h1>Diya and Aarav</h1>");
    expect(html).toContain("14 February 2027");
    expect(html.indexOf("Sangeet")).toBeLessThan(html.indexOf("Pheras"));
    expect(html).toContain("7:00 pm"); // 13:30 UTC
    expect(html).toContain("10:30 am"); // 05:00 UTC
  });

  it("drops a section the family switched off but keeps the others", async () => {
    const html = await render(wedding({ sections_enabled: ["cover", "events", "rsvp"] }));
    expect(html).not.toContain('data-section="journey"');
    expect(html).not.toContain("We met");
    expect(html).not.toContain('data-section="blessing"');
    expect(html).toContain('data-section="events"');
    expect(html).toContain('data-section="rsvp"');
  });

  it("never drops the cover, even if it is not in the enabled list", async () => {
    const html = await render(wedding({ sections_enabled: [] }));
    expect(html).toContain('data-section="cover"');
  });

  it("drops a section with nothing to show", async () => {
    const html = await render(wedding({ moments: [] }));
    expect(html).not.toContain('data-section="journey"');
  });

  it("shows injected HTML in a name as text, not as markup", async () => {
    const html = await render(wedding({ bride_name: '<script>alert(1)</script><img src=x onerror=alert(2)>' }));
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("escapes names in the title and share tags too", async () => {
    const html = await render(wedding({ groom_name: '"><b>x</b>' }));
    expect(html).not.toContain('"><b>x</b>');
    expect(html).toContain("&quot;&gt;&lt;b&gt;x&lt;/b&gt;");
  });

  it("keeps only web links for the map and the cover photo", async () => {
    const html = await render(
      wedding({
        cover_photo_url: "javascript:alert(1)",
        events: [{ ...wedding().events[0], map_url: "javascript:alert(1)" }],
      }),
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("Get directions");
    expect(html).not.toContain("og:image");
  });

  it("puts the share tags in for the WhatsApp preview", async () => {
    const html = await render(wedding());
    expect(html).toContain('<meta property="og:title" content="Diya &amp; Aarav are getting married">');
    expect(html).toContain('<meta property="og:image" content="https://cdn.example/cover.jpg">');
    expect(html).toContain('<meta property="og:url" content="https://dreamshagun.example/w/diya-and-aarav">');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  });

  it("turns the colour preset and font pair into CSS variables, with defaults for unknown names", async () => {
    const forest = await render(wedding({ color_preset: "forest" }));
    expect(forest).toContain("--color-primary:#2f6b4f;");
    const fallback = await render(wedding({ color_preset: "does-not-exist", font_pair: "nope" }));
    expect(fallback).toContain("--color-primary:#b8451a;");
    expect(fallback).toContain("--font-heading:'Fraunces', serif;");
    expect(fallback).toContain("https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600&amp;family=Figtree:wght@400;700&amp;display=swap");
  });

  it("points the template's own files at the asset route", async () => {
    const html = await render(wedding());
    expect(html).toContain('src="/t/basic/assets/cover.jpg"');
    expect(html).toContain("url(/t/basic/assets/pattern.png)");
  });

  it("leaves the slots empty for the page components to fill", async () => {
    const html = await render(wedding());
    expect(html).toContain('<div data-slot="rsvp"></div>');
    expect(html).toContain('data-slot="countdown" data-target="2027-02-13T13:30:00.000Z"');
  });

  it("falls back to English for a bad language code", async () => {
    expect(await render(wedding({ languages: ['en"><x'] }))).toContain('<html lang="en">');
    expect(await render(wedding({ languages: ["gu"] }))).toContain('<html lang="gu">');
  });
});
