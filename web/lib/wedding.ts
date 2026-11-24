import type { WeddingData, WeddingEvent, WeddingMoment } from "./templates/types";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Only columns the anonymous role may read. Asking for UPI columns here would be refused by the database.
const WEDDING_COLUMNS = [
  "id",
  "slug",
  "bride_name",
  "groom_name",
  "wedding_date",
  "story",
  "cover_photo_url",
  "template_id",
  "color_preset",
  "font_pair",
  "music_url",
  "music_enabled",
  "sections_enabled",
  "languages",
  "blessings_enabled",
  "gift_mode",
  "rsvp_deadline",
].join(",");

type WeddingRow = Omit<WeddingData, "events" | "moments"> & { id: string };

async function rest<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${res.status} for ${path.split("?")[0]}`);
  return (await res.json()) as T;
}

/**
 * The published wedding with this link name, or null. Row-level security hides drafts from the anonymous role,
 * so a draft looks exactly like a link that does not exist.
 */
export async function getPublishedWedding(slug: string): Promise<WeddingData | null> {
  if (!SLUG.test(slug) || slug.length < 3 || slug.length > 60) return null;

  const rows = await rest<WeddingRow[]>(`weddings?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=${WEDDING_COLUMNS}`);
  const wedding = rows[0];
  if (!wedding) return null;

  const id = encodeURIComponent(wedding.id);
  const [events, moments] = await Promise.all([
    rest<WeddingEvent[]>(
      `events?wedding_id=eq.${id}&select=id,name,starts_at,venue_name,venue_address,map_url,sort_order,kind,dress_code,note&order=sort_order,starts_at`,
    ),
    rest<WeddingMoment[]>(`moments?wedding_id=eq.${id}&select=title,happened_on,caption,photo_url,sort_order&order=sort_order`),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, ...rest_ } = wedding;
  return { ...rest_, events, moments };
}

const FAMILY_COLUMNS = `${WEDDING_COLUMNS},status`;

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => { eq: (column: string, value: string) => { order: (c: string, o: { ascending: boolean }) => unknown } & PromiseLike<{ data: unknown[] | null }> };
  };
};

/**
 * The family's own wedding as the guest page would show it, drafts included, for the live preview.
 * Reads with the signed-in person's login, so row-level security decides: anyone who is not in the family gets null.
 * Events carry no id here so the preview shows no calendar links (the public calendar address 404s for a draft).
 */
export async function getWeddingForFamily(supabase: unknown, id: string): Promise<WeddingData | null> {
  const db = supabase as SupabaseLike;
  const { data: rows } = await db.from("weddings").select(FAMILY_COLUMNS).eq("id", id);
  const wedding = (rows?.[0] ?? null) as (WeddingRow & { status?: string }) | null;
  if (!wedding) return null;
  const [{ data: events }, { data: moments }] = await Promise.all([
    db.from("events").select("name,starts_at,venue_name,venue_address,map_url,sort_order,kind,dress_code,note").eq("wedding_id", id) as PromiseLike<{ data: WeddingEvent[] | null }>,
    db.from("moments").select("title,happened_on,caption,photo_url,sort_order").eq("wedding_id", id) as PromiseLike<{ data: WeddingMoment[] | null }>,
  ]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, status: _status, ...rest_ } = wedding;
  return { ...rest_, events: events ?? [], moments: moments ?? [] };
}
