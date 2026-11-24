import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { loadEditorWedding } from "@/lib/editor-context";

import { StoryEditor } from "./story-editor";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("Couple and story") };

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
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
  const w = await loadEditorWedding(id, "story");
  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="story">
      <StoryEditor weddingId={id} initial={{ bride_name: w.bride_name, groom_name: w.groom_name, wedding_date: w.wedding_date ?? "", story: w.story ?? "" }} />
    </EditorShell>
  );
}
