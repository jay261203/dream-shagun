import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { currentClaims } from "@/lib/supabase/server";

import { CreateForm } from "./create-form";

export const metadata: Metadata = { title: "Create your wedding | Dream Shagun" };

export default function CreatePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-7 px-5 py-12">
        <Suspense fallback={<p className="text-muted">Loading...</p>}>
          <CreateGate />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function CreateGate() {
  const claims = await currentClaims().catch(() => null);
  if (!claims) redirect("/login?next=/create");
  return <CreateForm email={typeof claims.email === "string" ? claims.email : null} />;
}
