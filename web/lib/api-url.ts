/** Where the FastAPI service answers, as seen from this server. Kept apart so a plain page route can use it without the login helpers. */
export function apiBase(): string {
  return (process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
}
