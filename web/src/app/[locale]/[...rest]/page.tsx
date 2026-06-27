import { notFound } from "next/navigation";

// Any unmatched path under a locale (e.g. /de/xyz) lands here and triggers the
// localized, branded 404 at app/[locale]/not-found.tsx.
export default function CatchAll() {
  notFound();
}
