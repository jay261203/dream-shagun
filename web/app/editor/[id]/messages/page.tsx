import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { pageTitle } from "@/lib/brand";
import { loadEditorWedding } from "@/lib/editor-context";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: pageTitle("Messages") };

export default function MessagesPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1 px-5 py-16 text-center text-muted">Loading messages...</main>}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

const when = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await loadEditorWedding(id, "messages");

  // Row-level security lets only this invitation's hosts read messages, so a guest or another host gets nothing.
  const supabase = await createClient();
  const { data } = await supabase.from("guestbook").select("id, guest_name, message, created_at").eq("wedding_id", id).order("created_at", { ascending: false });
  const messages = data ?? [];

  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="messages">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-base text-muted">What your guests wrote. Only you can read these.</p>
        </div>
        {messages.length === 0 ? (
          <div className="rounded-[20px] border border-line p-7">
            <p className="text-lg text-muted">No messages yet. They appear here when guests leave one on the invitation.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 rounded-[20px] border border-line p-5">
                <p className="whitespace-pre-wrap text-base">{m.message}</p>
                <p className="text-[15px] text-muted">
                  <span className="font-semibold text-ink">{m.guest_name}</span> · {when.format(new Date(m.created_at))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </EditorShell>
  );
}
