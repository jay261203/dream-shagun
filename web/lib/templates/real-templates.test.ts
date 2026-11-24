import { readdir, access } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadTemplate, templatesDir } from "./load";
import { renderWedding } from "./render";
import type { WeddingData } from "./types";

// Every template folder in templates/ must pass the loader's safety checks and render with real-looking data.
const sample: WeddingData = {
  slug: "diya-and-aarav",
  bride_name: "Diya",
  groom_name: "Aarav",
  wedding_date: "2027-02-14",
  story: "We met at a friend's wedding.\nNow it is ours.",
  cover_photo_url: null,
  template_id: null,
  color_preset: null,
  font_pair: null,
  music_url: null,
  sections_enabled: ["cover", "couple", "journey", "events", "rsvp", "blessing"],
  languages: ["en"],
  blessings_enabled: true,
  rsvp_deadline: "2027-01-31",
  events: [
    { name: "Sangeet", starts_at: "2027-02-13T13:30:00Z", venue_name: "Vasant Lawns", venue_address: "Satellite", map_url: "https://maps.example/v", sort_order: 1, kind: "sangeet", dress_code: "Colourful", note: "Dinner served" },
  ],
  moments: [{ title: "We met", happened_on: "2023-03-01", caption: "At a wedding.", photo_url: null, sort_order: 1 }],
};

async function templateIds(): Promise<string[]> {
  const entries = await readdir(templatesDir(), { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

describe("templates in the repo", async () => {
  const ids = await templateIds();

  it("has at least one template", () => {
    expect(ids.length).toBeGreaterThan(0);
  });

  it.each(ids)("%s loads, passes the safety checks and renders", async (id) => {
    const template = await loadTemplate(id);
    const html = renderWedding(template, sample, { origin: "https://dreamshagun.example" });
    expect(html).toContain("Diya");
    expect(html).toContain("Aarav");
    expect(html).toContain('data-section="cover"');
  });

  it.each(ids)("%s links its script with a content version so updates are never stale", async (id) => {
    const template = await loadTemplate(id);
    const html = renderWedding(template, sample, { origin: "https://dreamshagun.example" });
    if (template.hasEffects) expect(html).toContain(`/t/${id}/effects.js?v=${template.effectsVersion}"`);
    if (template.hasEffects) expect(template.effectsVersion).toMatch(/^[0-9a-f]{10}$/);
  });

  it.each(ids)("%s declares at least two colour presets and two font pairs", async (id) => {
    const { manifest } = await loadTemplate(id);
    expect(Object.keys(manifest.colorPresets).length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(manifest.fontPairs).length).toBeGreaterThanOrEqual(2);
  });

  it.each(ids)("%s ships every file its manifest and page point at", async (id) => {
    const template = await loadTemplate(id);
    const root = path.join(templatesDir(), id);
    const files = [...template.html.matchAll(/(?:src|href)="(assets\/[^"{}]+)"/g)].map((m) => m[1]);
    if (template.manifest.music) files.push(template.manifest.music.src);
    for (const file of files) {
      await expect(access(path.join(root, file)), `${id}/${file} is missing`).resolves.toBeUndefined();
    }
  });

  it.each(ids)("%s has no scroll-hidden content without its script (reveal is opt-in)", async (id) => {
    const { css } = await loadTemplate(id);
    // Content may only be hidden under a class the script adds, never by default.
    const hiddenByDefault = /(^|\n)\s*\[data-reveal\][^{]*\{[^}]*opacity:\s*0/.test(css);
    expect(hiddenByDefault).toBe(false);
  });
});

describe("the music switch", () => {
  it("plays the template's tune by default and not at all when the family turns it off", async () => {
    const template = await loadTemplate("marigold");
    const render = (extra: Partial<WeddingData>) => renderWedding(template, { ...sample, ...extra }, { origin: "https://dreamshagun.example" });
    expect(render({})).toContain("data-music-button");
    expect(render({ music_enabled: true })).toContain("data-music-button");
    const off = render({ music_enabled: false });
    expect(off).not.toContain("data-music-button");
    expect(off).not.toContain("<audio");
    expect(off).not.toContain("Music: L Ramakrishnan");
  });
});

describe("the reply form hook-up", () => {
  const render = async (extra: Partial<WeddingData>) =>
    renderWedding(await loadTemplate("marigold"), { ...sample, ...extra }, { origin: "https://dreamshagun.example" });

  it("hands the reply script the wedding's events and deadline, escaped, and loads the script once", async () => {
    const html = await render({ rsvp_deadline: "2027-01-31", events: [{ ...sample.events[0], id: "e1", name: 'Sangeet "night" <b>' }] });
    const config = /data-slot="rsvp" data-config="([^"]*)"/.exec(html)?.[1] ?? "";
    expect(config).not.toContain("<b>");
    const parsed = JSON.parse(config.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;/g, "'"));
    expect(parsed.slug).toBe("diya-and-aarav");
    expect(parsed.deadline).toBe("2027-01-31");
    expect(parsed.events).toEqual([{ id: "e1", label: 'Sangeet "night" <b>, 13 February 2027' }]);
    expect(html.match(/<script src="\/guest\/rsvp\.js\?v=/g)).toHaveLength(1);
  });
  it("marks events without an id (a preview) so the form shows but cannot send", async () => {
    const html = await render({});
    expect(html).toContain("&quot;id&quot;:null");
  });
  it("leaves the script out when the family switches the reply section off", async () => {
    const html = await render({ sections_enabled: ["cover", "events"] });
    expect(html).not.toContain('<script src="/guest/rsvp.js');
  });
});
