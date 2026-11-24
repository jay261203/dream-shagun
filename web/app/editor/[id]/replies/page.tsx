import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { loadEditorWedding } from "@/lib/editor-context";
import { answerLabel, countsByEvent, foodLabel, repliesByGuest, type ReplyGuest, type ReplyRow } from "@/lib/replies";
import { createClient } from "@/lib/supabase/server";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("Replies") };

export default function RepliesPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1 px-5 py-16 text-center text-muted">Loading replies...</main>}>
        <Content params={params} />
      </Suspense>
    </>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await loadEditorWedding(id, "replies");

  // Row-level security lets only this wedding's family read guests and replies, so no extra check is needed here.
  const supabase = await createClient();
  const [{ data: events }, { data: guests }] = await Promise.all([
    supabase.from("events").select("id, name").eq("wedding_id", id).order("sort_order", { ascending: true }).order("starts_at", { ascending: true }),
    supabase.from("guests").select("id, display_name, phone, created_at").eq("wedding_id", id),
  ]);
  const guestIds = (guests ?? []).map((g) => g.id);
  const { data: rows } = guestIds.length
    ? await supabase.from("rsvps").select("guest_id, event_id, response, party_size, food_choice, allergies").in("guest_id", guestIds)
    : { data: [] };

  const eventList = events ?? [];
  const counts = countsByEvent(eventList, (rows ?? []) as ReplyRow[]);
  const replies = repliesByGuest(eventList, (guests ?? []) as ReplyGuest[], (rows ?? []) as ReplyRow[]);

  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="replies">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Replies</h1>
          <p className="text-base text-muted">What your guests said. Only the family can see this page.</p>
        </div>

        {counts.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {counts.map((c) => (
              <li key={c.event.id} className="rounded-[20px] border border-line p-5">
                <h2 className="text-lg font-bold">{c.event.name}</h2>
                <p className="text-[15px]">
                  <span className="font-semibold">{c.coming}</span> coming, <span className="font-semibold">{c.maybe}</span> maybe, <span className="font-semibold">{c.notComing}</span> not coming
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {replies.length === 0 ? (
          <div className="rounded-[20px] border border-line p-7">
            <p className="text-lg text-muted">No replies yet. They appear here as guests answer from the invitation link.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {replies.map(({ guest, answers, food, allergies }) => (
              <li key={guest.id} className="flex flex-col gap-1 rounded-[20px] border border-line p-5">
                <h2 className="text-lg font-bold">{guest.display_name}</h2>
                {guest.phone ? <p className="text-[15px] text-muted">{guest.phone}</p> : null}
                <ul className="mt-1 flex flex-col gap-0.5 text-[15px]">
                  {answers.map((a) => (
                    <li key={a.event.id}>
                      <span className="font-semibold">{a.event.name}:</span> {answerLabel(a)}
                    </li>
                  ))}
                </ul>
                {foodLabel(food) ? <p className="text-[15px] text-muted">Food: {foodLabel(food)}</p> : null}
                {allergies ? <p className="text-[15px] text-muted">Allergies: {allergies}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </EditorShell>
  );
}
