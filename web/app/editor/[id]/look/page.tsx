import type { Metadata } from "next";
import { Suspense } from "react";

import { EditorShell } from "@/components/editor-shell";
import { SiteHeader } from "@/components/site-chrome";
import { loadEditorWedding } from "@/lib/editor-context";
import { loadTemplate } from "@/lib/templates/load";

import { LookEditor } from "./look-editor";

export const metadata: Metadata = { title: "Look and music | Dream Shagun" };

export default function LookPage({ params }: { params: Promise<{ id: string }> }) {
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
  const w = await loadEditorWedding(id, "look");
  const { manifest } = await loadTemplate(w.template_id ?? process.env.DEFAULT_TEMPLATE_ID ?? "marigold");
  const colors = Object.entries(manifest.colorPresets).map(([key, p]) => ({ key, name: p.name, swatch: [p.vars["--color-primary"], p.vars["--color-accent"], p.vars["--color-bg"]] }));
  const fonts = Object.entries(manifest.fontPairs).map(([key, p]) => ({ key, name: p.name, heading: p.vars["--font-heading"], body: p.vars["--font-body"] }));
  return (
    <EditorShell weddingId={id} names={`${w.bride_name} and ${w.groom_name}`} status={w.status} active="look">
      <LookEditor
        weddingId={id}
        colors={colors}
        fonts={fonts}
        hasMusic={Boolean(manifest.music)}
        initial={{ color: w.color_preset ?? manifest.defaults.colorPreset, font: w.font_pair ?? manifest.defaults.fontPair, music: w.music_enabled }}
      />
    </EditorShell>
  );
}
