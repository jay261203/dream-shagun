export type ColorPreset = { name: string; vars: Record<string, string> };

export type FontPair = {
  name: string;
  vars: Record<string, string>;
  /** Google Fonts family queries, for example "Fraunces:wght@400;600". Only these are ever loaded from outside. */
  googleFonts?: string[];
};

export type Manifest = {
  id: string;
  name: string;
  tradition: string[];
  style: string;
  languages: string[];
  /** Sections the template can show, in page order. */
  sections: string[];
  /** Sections that cannot be switched off (the cover). */
  alwaysOn: string[];
  colorPresets: Record<string, ColorPreset>;
  fontPairs: Record<string, FontPair>;
  defaults: { colorPreset: string; fontPair: string };
  music?: { src: string; licence: string };
  licence: string;
  /** A picture under assets/ shown on the gallery card. */
  preview?: string;
  /** One line crediting a photograph or file the template uses, shown where its picture is shown. */
  credit?: string;
};

export type LoadedTemplate = {
  manifest: Manifest;
  /** The body fragment, Handlebars. */
  html: string;
  css: string;
  hasEffects: boolean;
  /** Short hash of effects.js, so a changed script gets a new URL and is never served from an old cache. */
  effectsVersion: string | null;
};

export type WeddingEvent = {
  /** Present for saved events; sample events have none and so get no calendar link. */
  id?: string;
  name: string;
  starts_at: string;
  venue_name: string | null;
  venue_address: string | null;
  map_url: string | null;
  sort_order: number;
  kind: string;
  dress_code: string | null;
  note: string | null;
};

export type WeddingMoment = {
  title: string;
  happened_on: string | null;
  caption: string | null;
  photo_url: string | null;
  sort_order: number;
};

export type WeddingData = {
  slug: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string | null;
  story: string | null;
  cover_photo_url: string | null;
  template_id: string | null;
  color_preset: string | null;
  font_pair: string | null;
  music_url: string | null;
  /** False when the family turned the music off. Missing counts as on. */
  music_enabled?: boolean;
  sections_enabled: string[];
  languages: string[];
  blessings_enabled: boolean;
  /** How the invitation treats gifts: no page, a small link, or a page reached only by its address. Missing counts as "link". */
  gift_mode?: "off" | "link" | "private";
  rsvp_deadline: string | null;
  events: WeddingEvent[];
  moments: WeddingMoment[];
};
