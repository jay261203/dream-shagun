/** Editors tell the preview pane that something was saved, so it redraws. No data travels: the preview reads the saved wedding. */
export const PREVIEW_EVENT = "editor:saved";

export function notifyPreview(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PREVIEW_EVENT));
}
