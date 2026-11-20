/**
 * Where to send someone after signing in. Only a path on this site is allowed, so a crafted link such as
 * /login?next=https://evil.example cannot bounce a signed-in visitor to another site.
 */
export function safeNext(value: string | null | undefined, fallback = "/create"): string {
  if (!value) return fallback;
  // One leading slash, and nothing a browser could read as another host: "//host", "/\host", a scheme, control characters.
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value) || value.includes("://")) {
    return fallback;
  }
  return value;
}
