/** Draft banner shown on legal pages until the client fills real content. */
export function LegalNotice({ text }: { text: string }) {
  return (
    <p className="mt-6 rounded-sm border border-dashed border-accent/50 bg-accent/5 px-4 py-3 text-xs leading-relaxed text-muted">
      {text}
    </p>
  );
}
