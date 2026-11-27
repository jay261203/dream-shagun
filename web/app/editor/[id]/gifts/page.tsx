import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { pageTitle } from "@/lib/brand";
import { loadEditorWedding } from "@/lib/editor-context";
import { GIFT_COLUMNS, type GiftRow } from "@/lib/gifts";
import { createClient, currentClaims } from "@/lib/supabase/server";

import { GiftRegister } from "./gift-register";

export const metadata: Metadata = { title: pageTitle("Gift register") };

export default function GiftsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1 px-5 py-16 text-center text-muted">Loading the register...</main>}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await loadEditorWedding(id, "gifts");

  // Row-level security lets only this invitation's hosts read the register, so a guest or another host gets no rows.
  const supabase = await createClient();
  const claims = await currentClaims();
  const [{ data: rows }, { data: me }] = await Promise.all([
    supabase.from("blessings").select(GIFT_COLUMNS).eq("wedding_id", id).order("created_at", { ascending: false }),
    supabase.from("family_members").select("id").eq("wedding_id", id).eq("user_id", claims?.sub ?? "").maybeSingle(),
  ]);

  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="gifts">
      <GiftRegister weddingId={id} rows={(rows ?? []) as GiftRow[]} myMemberId={me?.id ?? null} brideName={w.bride_name} groomName={w.groom_name} />
    </EditorShell>
  );
}
