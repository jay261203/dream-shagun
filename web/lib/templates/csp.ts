/**
 * Content-Security-Policy for a rendered invitation. Page scripts only from our own origin, images and music over
 * https, fonts from Google Fonts. `frameAncestors` says who may put the page in a frame: "none" for the real guest
 * page, "self" for the preview that the "Try with your names" screen shows in a phone frame.
 */
/** Local Supabase serves photos over plain http. That one origin is allowed for images; a real project is https and needs nothing extra. */
function localPhotoOrigin(): string {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    return url.protocol === "http:" ? ` ${url.origin}` : "";
  } catch {
    return "";
  }
}

export function guestPageCsp(frameAncestors: "none" | "self"): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    `img-src 'self' https: data:${localPhotoOrigin()}`,
    "media-src 'self' https:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    `frame-ancestors '${frameAncestors}'`,
  ].join("; ");
}
