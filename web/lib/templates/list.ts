import { readdir } from "node:fs/promises";

import { loadTemplate, templatesDir } from "./load";
import { isValidTemplateId } from "./validate";

export type TemplateSummary = {
  id: string;
  name: string;
  tradition: string[];
  style: string;
  languages: string[];
  /** URL of the gallery picture, or null. */
  preview: string | null;
  credit: string | null;
  colors: { id: string; name: string; color: string }[];
};

/** Every template folder that loads and passes the safety checks. A broken one is skipped, not fatal. */
export async function listTemplates(dir: string = templatesDir()): Promise<TemplateSummary[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const found = await Promise.all(
    entries
      .filter((e) => e.isDirectory() && isValidTemplateId(e.name))
      .map(async (e): Promise<TemplateSummary | null> => {
        try {
          const { manifest } = await loadTemplate(e.name, dir);
          return {
            id: manifest.id,
            name: manifest.name,
            tradition: manifest.tradition,
            style: manifest.style,
            languages: manifest.languages,
            credit: manifest.credit ?? null,
            preview: manifest.preview ? `/t/${manifest.id}/${manifest.preview}` : null,
            colors: Object.entries(manifest.colorPresets).map(([id, p]) => ({ id, name: p.name, color: p.vars["--color-primary"] ?? "#222222" })),
          };
        } catch (error) {
          console.error(`Skipping template "${e.name}":`, error instanceof Error ? error.message : error);
          return null;
        }
      }),
  );
  return found.filter((t): t is TemplateSummary => t !== null).sort((a, b) => a.name.localeCompare(b.name));
}

export const TRADITION_LABELS: Record<string, string> = {
  any: "Any tradition",
  hindu: "Hindu",
  sikh: "Sikh",
  muslim: "Muslim",
  christian: "Christian",
};

export const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  gu: "Gujarati",
};

export function label(map: Record<string, string>, key: string): string {
  return map[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}
