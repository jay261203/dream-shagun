import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { loadEditorWedding } from "@/lib/editor-context";

import { SectionsEditor } from "./sections-editor";

export const metadata: Metadata = { title: "Sections | Dream Shagun" };

export default function SectionsPage({ params }: { params: Promise<{ id: string }> }) {
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
  const w = await loadEditorWedding(id, "sections");
  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="sections">
      <SectionsEditor weddingId={id} initial={w.sections_enabled} />
    </EditorShell>
  );
}
