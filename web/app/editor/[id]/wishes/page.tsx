import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { loadEditorWedding } from "@/lib/editor-context";
import type { SideForm } from "@/lib/sides";
import { createClient } from "@/lib/supabase/server";

import { WishesEditor } from "./wishes-editor";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("Gifts and wishes") };

export default function WishesPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1 px-5 py-16 text-center text-muted">Loading...</main>}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await loadEditorWedding(id, "wishes");

  // Row-level security lets only this wedding's family read the UPI columns, so guests can never see them.
  const supabase = await createClient();
  const [{ data: money }, { data: wishes }] = await Promise.all([
    supabase.from("weddings").select("bride_side_upi, bride_side_payee_name, groom_side_upi, groom_side_payee_name").eq("id", id).maybeSingle(),
    supabase.from("wishes").select("side, title").eq("wedding_id", id),
  ]);
  const wish = (side: string) => wishes?.find((x) => x.side === side)?.title ?? "";
  const initial: Record<"bride" | "groom", SideForm> = {
    bride: { upi_id: money?.bride_side_upi ?? "", payee_name: money?.bride_side_payee_name ?? "", wish: wish("bride") },
    groom: { upi_id: money?.groom_side_upi ?? "", payee_name: money?.groom_side_payee_name ?? "", wish: wish("groom") },
  };

  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="wishes">
      <WishesEditor weddingId={id} slug={w.slug} published={w.status === "published"} giftMode={w.gift_mode} brideName={w.bride_name} groomName={w.groom_name} initial={initial} />
    </EditorShell>
  );
}
