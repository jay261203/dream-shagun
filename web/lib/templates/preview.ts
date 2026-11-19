import { SAMPLE_BRIDE, SAMPLE_DATE, SAMPLE_GROOM, sampleWedding } from "./sample";
import type { Manifest, WeddingData } from "./types";

export const MAX_NAME_LENGTH = 40;

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** A real calendar date in YYYY-MM-DD, or null. "2027-02-30" is not a date. */
export function validDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const ok = d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
  return ok && Number(m[1]) >= 2000 && Number(m[1]) <= 2100 ? value : null;
}

function cleanName(value: string, fallback: string): string {
  const name = value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
  return name || fallback;
}

/**
 * Turn the address-bar options of a preview (bride, groom, date, color, font) into wedding data.
 * Anything missing or odd falls back to the sample, so a half-typed form always shows a whole invitation.
 * The names are not escaped here: the renderer escapes every value it prints.
 */
export function previewWedding(manifest: Manifest, params: Params): WeddingData {
  const color = first(params.color);
  const font = first(params.font);
  return sampleWedding({
    template_id: manifest.id,
    bride_name: cleanName(first(params.bride), SAMPLE_BRIDE),
    groom_name: cleanName(first(params.groom), SAMPLE_GROOM),
    wedding_date: validDate(first(params.date)) ?? SAMPLE_DATE,
    color_preset: manifest.colorPresets[color] ? color : null,
    font_pair: manifest.fontPairs[font] ? font : null,
  });
}
