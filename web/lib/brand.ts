/**
 * The product's name and the lines that go with it, in one place. Change it here and every page title, the header,
 * the share tags, calendar files and the guest page footer follow. (Working name; see docs/brand.md.)
 */
export const brand = {
  name: "Gatherbell",
  /** Lowercase, no spaces: for file ids, storage keys and the example address. */
  slug: "gatherbell",
  /** The address shown in forms before a real domain exists. `.example` can never be a real site. */
  domain: "gatherbell.example",
  tagline: "Invitations for any occasion",
  description: "One link with your plans, replies and gifts. Guests need no app.",
} as const;

/** A page title in the same shape everywhere: "Events | Gatherbell". */
export function pageTitle(page: string): string {
  return `${page} | ${brand.name}`;
}
