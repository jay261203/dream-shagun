/** The same rule as the database and the API: lowercase letters and numbers, single dashes, 3 to 60 characters. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Turn any text into a link-name candidate. Accents are dropped, anything else becomes a dash. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * For the link-name box while someone is typing: keeps only what is allowed but leaves a trailing dash alone,
 * so "riya-" can become "riya-and". Use `finalSlug` for the value that is checked and saved.
 */
export function typingSlug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60);
}

export function finalSlug(text: string): string {
  return text.replace(/-+$/, "");
}

/** A friendly first guess for a couple: their first names, "riya-and-karan". Empty when there is nothing to build from. */
export function suggestSlug(bride: string, groom: string): string {
  const first = (name: string) => slugify(name.trim().split(/\s+/)[0] ?? "");
  const b = first(bride);
  const g = first(groom);
  if (!b || !g) return "";
  return slugify(`${b}-and-${g}`);
}

export function isValidSlug(slug: string): boolean {
  return slug.length >= 3 && slug.length <= 60 && SLUG_PATTERN.test(slug);
}
