import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { LoadedTemplate } from "./types";
import { isValidTemplateId, parseManifest, TemplateError, validateTemplateCss, validateTemplateHtml } from "./validate";

/** Where template folders live. Repo layout: templates/ beside web/. In Docker it is mounted at /templates. */
export function templatesDir(): string {
  return process.env.TEMPLATES_DIR ?? path.join(process.cwd(), "..", "templates");
}

export class TemplateNotFound extends Error {}

const cache = new Map<string, LoadedTemplate>();

/** Reads and checks one template. Results are cached in production so each request is a memory lookup. */
export async function loadTemplate(id: string, dir: string = templatesDir()): Promise<LoadedTemplate> {
  if (!isValidTemplateId(id)) throw new TemplateNotFound(id);
  const key = `${dir}::${id}`;
  const cached = process.env.NODE_ENV === "production" ? cache.get(key) : undefined;
  if (cached) return cached;

  const root = path.join(/*turbopackIgnore: true*/ dir, id);
  let manifestText: string;
  try {
    manifestText = await readFile(path.join(/*turbopackIgnore: true*/ root, "manifest.json"), "utf8");
  } catch {
    throw new TemplateNotFound(id);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(manifestText);
  } catch {
    throw new TemplateError(`Template "${id}": manifest.json is not valid JSON`);
  }
  const manifest = parseManifest(raw, id);

  const [html, css] = await Promise.all([
    readFile(path.join(/*turbopackIgnore: true*/ root, "template.html"), "utf8"),
    readFile(path.join(/*turbopackIgnore: true*/ root, "styles.css"), "utf8"),
  ]);
  validateTemplateHtml(id, html);
  validateTemplateCss(id, css);
  const effects = await readFile(path.join(/*turbopackIgnore: true*/ root, "effects.js")).catch(() => null);
  const hasEffects = effects !== null;
  const effectsVersion = effects ? createHash("sha1").update(effects).digest("hex").slice(0, 10) : null;

  const loaded: LoadedTemplate = { manifest, html, css, hasEffects, effectsVersion };
  if (process.env.NODE_ENV === "production") cache.set(key, loaded);
  return loaded;
}
