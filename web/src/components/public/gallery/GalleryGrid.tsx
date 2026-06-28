"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ImageFrame } from "../ui/ImageFrame";

// Filter tabs map to the shop's occasion categories. "other" images (shop /
// ambiance) appear only under "all". Keep this in sync with ImageCategory in
// web/src/lib/api/types.ts and the admin upload category selector.
const CATEGORIES = ["wedding", "birthday", "funeral"] as const;
type Category = (typeof CATEGORIES)[number] | "other";
type Filter = "all" | (typeof CATEGORIES)[number];

// Placeholder tiles — replace with real GalleryImage data from GET /images.
// Grid uses thumbUrl, lightbox uses url. Category drives the filter.
type Tile = { aspect: string; category: Category; url?: string; alt?: string };

const ASPECTS = [
  "aspect-[3/4]", "aspect-[1/1]", "aspect-[3/5]", "aspect-[4/3]", "aspect-[3/4]",
  "aspect-[4/5]", "aspect-[1/1]", "aspect-[2/3]", "aspect-[4/3]", "aspect-[3/4]",
  "aspect-[3/5]", "aspect-[4/5]", "aspect-[1/1]", "aspect-[4/3]", "aspect-[2/3]",
];
const CYCLE: Category[] = ["wedding", "birthday", "funeral", "other"];
const TILES: Tile[] = ASPECTS.map((aspect, i) => ({
  aspect,
  category: CYCLE[i % CYCLE.length],
}));

async function downloadImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    triggerDownload(href, filename);
    URL.revokeObjectURL(href);
  } catch {
    triggerDownload(url, filename);
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function GalleryGrid() {
  const t = useTranslations("galleryPage");
  const to = useTranslations("occasions");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<number | null>(null);

  const items = useMemo(
    () => (filter === "all" ? TILES : TILES.filter((tile) => tile.category === filter)),
    [filter],
  );

  const close = useCallback(() => setOpen(null), []);
  const show = useCallback(
    (next: number) =>
      setOpen((i) => ((i ?? 0) + next + items.length) % items.length),
    [items.length],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") show(1);
      if (e.key === "ArrowLeft") show(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, show]);

  const selectFilter = (f: Filter) => {
    setOpen(null); // indexes change with the filter
    setFilter(f);
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("all") },
    ...CATEGORIES.map((c) => ({ key: c, label: to(`items.${c}.label`) })),
  ];

  const current = open !== null ? items[open] : null;

  return (
    <>
      {/* Filter tabs */}
      <div className="mb-10 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectFilter(tab.key)}
              aria-pressed={active}
              className={`rounded-full border px-4 py-1.5 text-sm tracking-wide transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-silver text-muted hover:border-accent hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
        {items.map((tile, i) => (
          <button
            key={`${filter}-${i}`}
            type="button"
            onClick={() => setOpen(i)}
            aria-label={`${t("imageLabel")} ${i + 1}`}
            className="block w-full break-inside-avoid rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <ImageFrame label={t("imageLabel")} aspect={tile.aspect} hover flat />
          </button>
        ))}
      </div>

      {open !== null && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("imageLabel")}
          onClick={close}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/90 p-4 backdrop-blur-sm sm:p-8"
        >
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4">
            <span className="text-sm tabular-nums tracking-wide text-background/70">
              {open + 1} / {items.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (current.url) {
                    void downloadImage(current.url, `bild-${open + 1}.webp`);
                  }
                }}
                aria-label={t("save")}
                title={t("save")}
                className="flex h-10 w-10 items-center justify-center rounded-full text-background/80 transition-colors hover:bg-background/10 hover:text-background"
              >
                <DownloadIcon />
              </button>
              <button
                type="button"
                onClick={close}
                aria-label={t("close")}
                title={t("close")}
                className="flex h-10 w-10 items-center justify-center rounded-full text-background/80 transition-colors hover:bg-background/10 hover:text-background"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              show(-1);
            }}
            aria-label={t("prev")}
            className="absolute left-2 flex h-12 w-12 items-center justify-center rounded-full text-3xl text-background/70 transition-colors hover:bg-background/10 hover:text-background md:left-6"
          >
            ‹
          </button>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] w-full max-w-3xl"
          >
            <ImageFrame label={t("imageLabel")} aspect="aspect-[4/3]" />
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              show(1);
            }}
            aria-label={t("next")}
            className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full text-3xl text-background/70 transition-colors hover:bg-background/10 hover:text-background md:right-6"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
