import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { loadEditorWedding } from "@/lib/editor-context";
import { checklist, inviteUrl, whatsappLink, whatsappMessage } from "@/lib/publish";
import { createClient } from "@/lib/supabase/server";

import { PublishPanel } from "./publish-panel";

export const metadata: Metadata = { title: "Publish | Dream Shagun" };

export default function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1 px-5 py-16 text-center text-muted">Loading...</main>}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await loadEditorWedding(id, "publish");
  const supabase = await createClient();
  const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("wedding_id", id);

  const origin = await siteOrigin();
  const url = inviteUrl(origin, w.slug);
  const message = whatsappMessage(w.bride_name, w.groom_name, url);
  // A picture of the link, drawn here so no outside service ever sees it.
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 256, errorCorrectionLevel: "M" });

  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="publish">
      <PublishPanel
        weddingId={id}
        initialStatus={w.status === "published" ? "published" : "draft"}
        url={url}
        draftUrl={`${origin}/editor/${id}/preview?banner=1`}
        qr={qr}
        whatsapp={whatsappLink(message)}
        message={message}
        items={checklist({ bride_name: w.bride_name, groom_name: w.groom_name, wedding_date: w.wedding_date, event_count: count ?? 0 })}
      />
    </EditorShell>
  );
}
