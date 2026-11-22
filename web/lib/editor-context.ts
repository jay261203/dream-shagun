import { notFound, redirect } from "next/navigation";

import { isId } from "@/lib/ids";
import { createClient, currentClaims } from "@/lib/supabase/server";

export type EditorWedding = {
  id: string;
  status: string;
  slug: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string | null;
  story: string | null;
  color_preset: string | null;
  font_pair: string | null;
  music_enabled: boolean;
  sections_enabled: string[];
  template_id: string | null;
};

const COLUMNS = "id, status, slug, bride_name, groom_name, wedding_date, story, color_preset, font_pair, music_enabled, sections_enabled, template_id";

/**
 * Who may edit this wedding, in one place for every editor page: not signed in goes to login, and anyone who is not in
 * the family gets "not found", exactly as for a wedding that does not exist (row-level security hides the rows).
 */
export async function loadEditorWedding(id: string, section: string): Promise<EditorWedding> {
  if (!isId(id)) notFound();
  const claims = await currentClaims().catch(() => null);
  if (!claims) redirect(`/login?next=${encodeURIComponent(`/editor/${id}/${section}`)}`);

  const supabase = await createClient();
  const { data } = await supabase.from("family_members").select(`role, weddings(${COLUMNS})`).eq("wedding_id", id).maybeSingle();
  const member = data as unknown as { weddings: EditorWedding | EditorWedding[] | null } | null;
  const wedding = Array.isArray(member?.weddings) ? member?.weddings[0] : member?.weddings;
  if (!member || !wedding) notFound();
  return wedding;
}
