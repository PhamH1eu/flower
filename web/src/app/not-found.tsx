import Link from "next/link";

// Fallback for paths outside any locale. The locale-aware 404 lives at
// app/[locale]/not-found.tsx; this one provides its own html/body because the
// root layout intentionally has none.
export default function GlobalNotFound() {
  return (
    <html lang="de">
      <body className="antialiased">
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="font-serif text-7xl text-accent">404</p>
          <h1 className="mt-4 font-serif text-3xl text-foreground">
            Seite nicht gefunden
          </h1>
          <Link
            href="/de"
            className="mt-8 rounded-sm bg-foreground px-7 py-3 text-sm tracking-wide text-background transition-colors hover:bg-accent-hover"
          >
            Zur Startseite
          </Link>
        </main>
      </body>
    </html>
  );
}
