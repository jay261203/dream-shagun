import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-10 lg:px-20">
      <Link href="/" className="text-2xl font-bold tracking-tight text-accent">
        dream shagun
      </Link>
      <nav className="flex items-center gap-2 text-[15px] font-semibold">
        <Link href="/#how" className="inline-flex min-h-11 items-center rounded-full px-3.5 hover:bg-surface">
          How it works
        </Link>
        <Link href="/login" className="inline-flex min-h-11 items-center rounded-full border border-line px-[18px] hover:bg-surface">
          Sign in
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter({ credits = [] }: { credits?: string[] }) {
  return (
    <footer className="mt-auto flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-line px-5 py-6 text-[13px] leading-relaxed text-muted sm:px-10 lg:px-20">
      <span>{credits.length > 0 ? credits.join(" · ") : "Dream Shagun is a working name."}</span>
      <span>Shagun goes straight from guest to family. We never hold it.</span>
    </footer>
  );
}
