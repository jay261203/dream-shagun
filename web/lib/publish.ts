export type Basics = { bride_name: string; groom_name: string; wedding_date: string | null; event_count: number };
export type CheckItem = { label: string; ok: boolean; fix: string | null };

/** What guests need before the invitation can go live. `fix` is the editor screen that fixes it. */
export function checklist(b: Basics): CheckItem[] {
  return [
    { label: "Both names", ok: Boolean(b.bride_name.trim() && b.groom_name.trim()), fix: "story" },
    { label: "The wedding date", ok: Boolean(b.wedding_date), fix: "story" },
    { label: "At least one event", ok: b.event_count > 0, fix: "events" },
  ].map((i) => ({ ...i, fix: i.ok ? null : i.fix }));
}

export function inviteUrl(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, "")}/w/${encodeURIComponent(slug)}`;
}

/** The message a family sends on WhatsApp. It carries only the names and the link. */
export function whatsappMessage(bride: string, groom: string, url: string): string {
  return `You are invited to the wedding of ${bride} and ${groom}. Open the invitation here: ${url}`;
}

/** Opens WhatsApp (app or web) with the message ready; the family picks who to send it to. */
export function whatsappLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** The sentence to show when publishing is refused, from the API's answer. */
export function publishError(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return detail;
  const message = (detail as { message?: unknown } | null)?.message;
  return typeof message === "string" && message ? message : "We could not do that. Please try again.";
}
