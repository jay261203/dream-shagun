import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { listTemplates } from "@/lib/templates/list";

import { TryForm } from "./try-form";

export const metadata: Metadata = {
  title: "Try a template with your names | Dream Shagun",
};

export default function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<main className="flex-1 px-5 py-16 text-center text-muted sm:px-10">Loading the template...</main>}>
        <TemplateContent params={params} />
      </Suspense>
    </>
  );
}

async function TemplateContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const all = await listTemplates();
  const template = all.find((t) => t.id === id);
  if (!template) notFound();

  return (
    <>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-10 lg:px-20 lg:py-12">
        <TryForm template={template} others={all.filter((t) => t.id !== id)} />
      </main>
      <SiteFooter credits={template.credit ? [template.credit] : []} />
    </>
  );
}
