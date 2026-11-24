import { brand } from "./brand";
/** What a visitor typed on "Try with your names", kept in this browser until they sign in and create the wedding. */
export type Draft = {
  template_id: string;
  bride_name: string;
  groom_name: string;
  /** YYYY-MM-DD */
  wedding_date: string;
  color_preset: string | null;
};

const KEY = `${brand.slug}.draft.v1`;

function isDraft(value: unknown): value is Draft {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.template_id === "string" &&
    typeof d.bride_name === "string" &&
    typeof d.groom_name === "string" &&
    typeof d.wedding_date === "string" &&
    (d.color_preset === null || typeof d.color_preset === "string")
  );
}

/** The saved draft, or null. Storage can be blocked or hold something odd; both give null. */
export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns false if the browser would not store it (private mode, storage full). */
export function saveDraft(draft: Draft): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Called once the wedding is created, so the next visitor on this computer starts fresh. */
export function clearDraft(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // nothing to clear if storage is blocked
  }
}
