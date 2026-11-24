import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { isId } from "@/lib/ids";
import { rowToEvent } from "@/lib/events";
import { createClient, currentClaims } from "@/lib/supabase/server";

import { EventsEditor } from "./events-editor";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("Events") };

export default function EventsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1 px-5 py-16 text-center text-muted">Loading your events...</main>}>
        <EventsContent params={params} />
      </Suspense>
    </>
  );
}

type Wedding = { id: string; status: string; bride_name: string; groom_name: string; wedding_date: string | null };

async function EventsContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isId(id)) notFound();

  const claims = await currentClaims().catch(() => null);
  if (!claims) redirect(`/login?next=${encodeURIComponent(`/editor/${id}/events`)}`);

  // Row-level security lets a signed-in person see only their own membership rows, so no row means "not yours".
  // The page then looks exactly like a wedding that does not exist.
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("family_members")
    .select("role, side, weddings(id, status, bride_name, groom_name, wedding_date)")
    .eq("wedding_id", id)
    .maybeSingle();
  const wedding = (Array.isArray(membership?.weddings) ? membership?.weddings[0] : membership?.weddings) as Wedding | null | undefined;
  if (!membership || !wedding) notFound();

  const { data: rows } = await supabase
    .from("events")
    .select("id, name, kind, starts_at, venue_name, venue_address, map_url, dress_code, note, sort_order")
    .eq("wedding_id", id)
    .order("sort_order", { ascending: true })
    .order("starts_at", { ascending: true });

  return (
    <EditorShell weddingId={id} names={`${wedding.bride_name} and ${wedding.groom_name}`} status={wedding.status} active="events">
      <EventsEditor weddingId={id} weddingDate={wedding.wedding_date} initialEvents={(rows ?? []).map(rowToEvent)} />
    </EditorShell>
  );
}
