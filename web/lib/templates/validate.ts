import type { Manifest } from "./types";

/** Throws with a plain message when a template could run code or call another server. */
export class TemplateError extends Error {}

const ID = /^[a-z0-9][a-z0-9-]{1,39}$/;
const SAFE_CSS_VALUE = /^[#a-zA-Z0-9 ,.()%'"/-]+$/;
const GOOGLE_FONT = /^[A-Za-z0-9+ ]+(:[A-Za-z0-9@;,.]+)?$/;

export function isValidTemplateId(id: string): boolean {
  return ID.test(id);
}

function fail(id: string, message: string): never {
  throw new TemplateError(`Template "${id}": ${message}`);
}

function strings(id: string, value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    fail(id, `${field} must be a list of text`);
  }
  return value as string[];
}

function cssVars(id: string, value: unknown, field: string): Record<string, string> {
  if (typeof value !== "object" || value === null) fail(id, `${field} must be an object`);
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!k.startsWith("--") || !/^--[a-z0-9-]+$/.test(k)) fail(id, `${field}: "${k}" is not a CSS variable name`);
    if (typeof v !== "string" || !SAFE_CSS_VALUE.test(v)) fail(id, `${field}: value of ${k} has characters CSS values may not have`);
  }
  return value as Record<string, string>;
}

export function parseManifest(raw: unknown, expectedId: string): Manifest {
  if (typeof raw !== "object" || raw === null) fail(expectedId, "manifest.json is not an object");
  const m = raw as Record<string, unknown>;
  if (m.id !== expectedId || typeof m.id !== "string" || !ID.test(m.id)) fail(expectedId, "manifest id must match its folder name");
  if (typeof m.name !== "string" || !m.name) fail(expectedId, "name is required");
  if (typeof m.style !== "string") fail(expectedId, "style is required");
  if (typeof m.licence !== "string" || !m.licence) fail(expectedId, "licence is required");

  const presetsRaw = (m.colorPresets ?? {}) as Record<string, { name?: unknown; vars?: unknown }>;
  const colorPresets = Object.fromEntries(
    Object.entries(presetsRaw).map(([key, p]) => [
      key,
      { name: String(p.name ?? key), vars: cssVars(expectedId, p.vars, `colorPresets.${key}.vars`) },
    ]),
  );
  const pairsRaw = (m.fontPairs ?? {}) as Record<string, { name?: unknown; vars?: unknown; googleFonts?: unknown }>;
  const fontPairs = Object.fromEntries(
    Object.entries(pairsRaw).map(([key, p]) => {
      const googleFonts = p.googleFonts === undefined ? undefined : strings(expectedId, p.googleFonts, `fontPairs.${key}.googleFonts`);
      if (googleFonts?.some((f) => !GOOGLE_FONT.test(f))) fail(expectedId, `fontPairs.${key}.googleFonts has an unsafe family name`);
      return [key, { name: String(p.name ?? key), vars: cssVars(expectedId, p.vars, `fontPairs.${key}.vars`), googleFonts }];
    }),
  );

  const defaults = m.defaults as { colorPreset?: string; fontPair?: string } | undefined;
  if (!defaults?.colorPreset || !colorPresets[defaults.colorPreset]) fail(expectedId, "defaults.colorPreset must name a colour preset");
  if (!defaults?.fontPair || !fontPairs[defaults.fontPair]) fail(expectedId, "defaults.fontPair must name a font pair");

  const music = m.music as { src?: unknown; licence?: unknown } | undefined;

  return {
    id: m.id,
    name: m.name,
    tradition: strings(expectedId, m.tradition ?? [], "tradition"),
    style: m.style,
    languages: strings(expectedId, m.languages ?? ["en"], "languages"),
    sections: strings(expectedId, m.sections ?? [], "sections"),
    alwaysOn: strings(expectedId, m.alwaysOn ?? ["cover"], "alwaysOn"),
    colorPresets,
    fontPairs,
    defaults: { colorPreset: defaults.colorPreset, fontPair: defaults.fontPair },
    music: music && typeof music.src === "string" && typeof music.licence === "string" ? { src: music.src, licence: music.licence } : undefined,
    licence: m.licence,
  };
}

const EXTERNAL_ATTR = /\b(?:src|href|action|poster|srcset|data)\s*=\s*["']?\s*(?:https?:)?\/\//i;

/** A template is data, not code: no raw output, no scripts, nothing that reaches another server. */
export function validateTemplateHtml(id: string, html: string): void {
  if (/\{\{\{|\{\{&/.test(html)) fail(id, "raw Handlebars output ({{{ }}} or {{& }}) is not allowed");
  if (/<\s*(script|iframe|object|embed|link|meta|base|form)\b/i.test(html)) fail(id, "script, iframe, object, embed, link, meta, base and form tags are not allowed");
  if (/\son[a-z]+\s*=/i.test(html)) fail(id, "inline event handlers are not allowed");
  if (/javascript:/i.test(html)) fail(id, "javascript: links are not allowed");
  if (EXTERNAL_ATTR.test(html)) fail(id, "templates may not point at outside servers; put files in assets/");
}

export function validateTemplateCss(id: string, css: string): void {
  if (/@import/i.test(css)) fail(id, "@import is not allowed");
  if (/url\(\s*["']?\s*(?:https?:)?\/\//i.test(css)) fail(id, "CSS may not load files from outside servers");
  if (/<\/?style/i.test(css)) fail(id, "style tags do not belong in styles.css");
}
