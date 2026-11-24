export const STORY_LIMIT = 5000;
export const NAME_LIMIT = 80;

export type StoryForm = { bride_name: string; groom_name: string; wedding_date: string; story: string };
export type StoryErrors = Partial<Record<keyof StoryForm, string>>;

export function validateStoryForm(f: StoryForm): StoryErrors {
  const errors: StoryErrors = {};
  if (!f.bride_name.trim()) errors.bride_name = "Enter the bride's name.";
  else if (f.bride_name.trim().length > NAME_LIMIT) errors.bride_name = `Keep the name under ${NAME_LIMIT} letters.`;
  if (!f.groom_name.trim()) errors.groom_name = "Enter the groom's name.";
  else if (f.groom_name.trim().length > NAME_LIMIT) errors.groom_name = `Keep the name under ${NAME_LIMIT} letters.`;
  if (f.wedding_date) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.wedding_date);
    const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
    const real = d && d.getUTCFullYear() === +m![1] && d.getUTCMonth() === +m![2] - 1 && d.getUTCDate() === +m![3];
    if (!real || +m![1] < 2000 || +m![1] > 2100) errors.wedding_date = "Pick a real date between 2000 and 2100.";
  }
  if (f.story.length > STORY_LIMIT) errors.story = `Keep the story under ${STORY_LIMIT} letters.`;
  return errors;
}

export function storyPayload(f: StoryForm) {
  return { bride_name: f.bride_name.trim(), groom_name: f.groom_name.trim(), wedding_date: f.wedding_date || null, story: f.story.trim() || null };
}

/** Sections the family can switch, with the words shown beside each switch. The cover is always on, so it is not listed. */
export const SECTION_CHOICES: { key: string; label: string; hint: string }[] = [
  { key: "couple", label: "Our story", hint: "The few words you wrote about the two of you." },
  { key: "journey", label: "Our journey", hint: "The timeline of dated moments with photos." },
  { key: "events", label: "Events", hint: "Every function with time, place and a map button." },
  { key: "rsvp", label: "Replies", hint: "Guests say which events they will come to." },
  { key: "guestbook", label: "Messages", hint: "Guests leave a short message. Only you can read them." },
];

/** The list to save when one section is switched. Sections this editor does not manage are kept as they were. */
export function withSection(current: readonly string[], key: string, on: boolean, managed: readonly string[]): string[] {
  const kept = current.filter((s) => !managed.includes(s) && s !== "cover");
  const chosen = managed.filter((s) => (s === key ? on : current.includes(s)));
  return ["cover", ...kept, ...chosen];
}

const WORDS: Record<string, string> = { bride_name: "bride's name", groom_name: "groom's name", wedding_date: "date", story: "story", color_preset: "colour", font_pair: "font", sections_enabled: "sections" };

/** Turn the API's refusal into a sentence. */
export function parseSaveError(body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail)) {
    const fields = (detail as { loc?: unknown[] }[]).map((d) => WORDS[String(d.loc?.[d.loc.length - 1] ?? "")]).filter(Boolean);
    if (fields.length) return `Check the ${[...new Set(fields)].join(" and ")}.`;
  }
  return "We could not save that. Please try again.";
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/** "Saved a moment ago", "Saved 3 minutes ago" and so on. */
export function savedLabel(savedAt: number | null, now: number): string {
  if (savedAt === null) return "";
  const seconds = Math.max(0, Math.round((now - savedAt) / 1000));
  if (seconds < 10) return "Saved a moment ago";
  if (seconds < 60) return `Saved ${seconds} seconds ago`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60 ? `Saved ${minutes} minute${minutes === 1 ? "" : "s"} ago` : "Saved earlier";
}
