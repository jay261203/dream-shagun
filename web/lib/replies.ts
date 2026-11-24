export type ReplyEvent = { id: string; name: string };
export type ReplyGuest = { id: string; display_name: string; phone: string | null; created_at: string };
export type ReplyRow = { guest_id: string; event_id: string; response: "yes" | "maybe" | "no"; party_size: number; food_choice: string | null; allergies: string | null };

export type EventCount = { event: ReplyEvent; coming: number; maybe: number; notComing: number };
export type GuestReply = { guest: ReplyGuest; answers: { event: ReplyEvent; response: ReplyRow["response"]; party_size: number }[]; food: string | null; allergies: string | null };

const FOOD: Record<string, string> = { veg: "Vegetarian", jain: "Jain", other: "Other" };
export const foodLabel = (food: string | null): string | null => (food ? (FOOD[food] ?? null) : null);

/** People per event: "coming" and "maybe" add up each guest's party size, "not coming" counts guests who declined. */
export function countsByEvent(events: ReplyEvent[], rows: ReplyRow[]): EventCount[] {
  return events.map((event) => {
    const mine = rows.filter((r) => r.event_id === event.id);
    return {
      event,
      coming: mine.filter((r) => r.response === "yes").reduce((sum, r) => sum + r.party_size, 0),
      maybe: mine.filter((r) => r.response === "maybe").reduce((sum, r) => sum + r.party_size, 0),
      notComing: mine.filter((r) => r.response === "no").length,
    };
  });
}

/** One entry per guest, newest first, with their answers in the order of the events. */
export function repliesByGuest(events: ReplyEvent[], guests: ReplyGuest[], rows: ReplyRow[]): GuestReply[] {
  return [...guests]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((guest) => {
      const mine = rows.filter((r) => r.guest_id === guest.id);
      return {
        guest,
        answers: events.flatMap((event) => {
          const row = mine.find((r) => r.event_id === event.id);
          return row ? [{ event, response: row.response, party_size: row.party_size }] : [];
        }),
        food: mine.find((r) => r.food_choice)?.food_choice ?? null,
        allergies: mine.find((r) => r.allergies)?.allergies ?? null,
      };
    });
}

export function answerLabel(a: { response: ReplyRow["response"]; party_size: number }): string {
  if (a.response === "no") return "Not coming";
  return `${a.response === "yes" ? "Coming" : "Maybe"}, ${a.party_size} ${a.party_size === 1 ? "person" : "people"}`;
}
