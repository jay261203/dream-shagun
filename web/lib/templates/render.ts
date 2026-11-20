import Handlebars from "handlebars";
import { parse } from "node-html-parser";

import { prepare, safeUrl } from "./prepare";
import type { LoadedTemplate, WeddingData } from "./types";

const esc = Handlebars.Utils.escapeExpression;
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/** A list with no items, or any empty or false value, counts as nothing to show. */
function isEmpty(value: unknown): boolean {
  return Array.isArray(value) ? value.length === 0 : !value;
}

export type RenderOptions = {
  /** Public origin, for absolute links in share tags. */
  origin: string;
};

/** Point the template's own files (assets/...) at the route that serves them. */
function rewriteAssets(id: string, text: string): string {
  return text
    .replace(/\b(src|href|poster)=(["'])assets\//g, `$1=$2/t/${id}/assets/`)
    .replace(/url\((["']?)assets\//g, `url($1/t/${id}/assets/`);
}

function cssVars(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}

function shareTags(title: string, description: string, url: string, image: string | null): string {
  const tags = [
    ["og:type", "website"],
    ["og:title", title],
    ["og:description", description],
    ["og:url", url],
    ...(image ? [["og:image", image]] : []),
    ["twitter:card", image ? "summary_large_image" : "summary"],
    ["twitter:title", title],
    ["twitter:description", description],
    ...(image ? [["twitter:image", image]] : []),
  ];
  // Open Graph tags use property=, Twitter tags use name=.
  return tags.map(([k, v]) => `<meta ${k.startsWith("twitter:") ? "name" : "property"}="${k}" content="${esc(v)}">`).join("\n");
}

/** Fill a template with one wedding's data and return a finished HTML page. */
export function renderWedding(template: LoadedTemplate, data: WeddingData, options: RenderOptions): string {
  const { manifest } = template;
  const base = prepare(data);
  // Music: the wedding's own file if it has one, else the template's default (a file under its assets/ folder).
  const defaultMusic = base.music_url === null ? (manifest.music?.src ?? null) : null;
  const view = { ...base, music_url: base.music_url ?? defaultMusic, music_is_default: defaultMusic !== null };

  // 1. Fill placeholders. Handlebars escapes every {{value}}; templates may not use raw output (checked at load).
  const filled = Handlebars.create().compile(template.html)(view);

  // 2. Drop sections the family switched off, and sections that would be empty.
  const root = parse(filled);
  const enabled = new Set(data.sections_enabled);
  for (const node of root.querySelectorAll("[data-section]")) {
    const name = node.getAttribute("data-section") ?? "";
    const needs = node.getAttribute("data-needs");
    const switchedOff = !manifest.alwaysOn.includes(name) && !enabled.has(name);
    const needsMissing = needs ? isEmpty((view as Record<string, unknown>)[needs]) : false;
    if (switchedOff || needsMissing) node.remove();
  }
  const body = rewriteAssets(manifest.id, root.toString());

  // 3. Theme: colour preset and font pair become CSS variables.
  const preset = manifest.colorPresets[data.color_preset ?? ""] ?? manifest.colorPresets[manifest.defaults.colorPreset];
  const pair = manifest.fontPairs[data.font_pair ?? ""] ?? manifest.fontPairs[manifest.defaults.fontPair];
  // Family names were checked against a strict pattern when the manifest loaded, so only spaces need changing.
  const fontQuery = (pair.googleFonts ?? []).map((f) => `family=${f.replace(/ /g, "+")}`).join("&amp;");
  const fontLinks = fontQuery
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fontQuery}&amp;display=swap">`
    : "";

  // 4. Share tags for the WhatsApp preview.
  const title = `${view.title} are getting married`;
  const description = [view.date_long, "You are invited. Open the invitation to see the events and reply."].filter(Boolean).join(" · ");
  const url = `${options.origin.replace(/\/$/, "")}/w/${encodeURIComponent(data.slug)}`;
  const image = safeUrl(data.cover_photo_url);
  const lang = LANG.test(data.languages[0] ?? "") ? data.languages[0] : "en";

  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="${esc(preset.vars["--color-primary"] ?? "#ffffff")}">
<link rel="canonical" href="${esc(url)}">
${shareTags(title, description, url, image)}
${fontLinks}
<style>:root{color-scheme:light;${cssVars(preset.vars)}${cssVars(pair.vars)}}
${rewriteAssets(manifest.id, template.css)}</style>
</head>
<body data-wedding="${esc(data.slug)}" data-template="${esc(manifest.id)}">
${body}
${template.hasEffects ? `<script src="/t/${esc(manifest.id)}/effects.js?v=${esc(template.effectsVersion ?? "0")}" defer></script>` : ""}
</body>
</html>
`;
}
