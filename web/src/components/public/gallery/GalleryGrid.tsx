"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { listImages } from "@/lib/api/images";
import type { GalleryImage, ImageCategory } from "@/lib/api/types";
import { ImageFrame } from "../ui/ImageFrame";
import { Reveal } from "../ui/Reveal";
import { getGalleryImageLayout, type GalleryImageFit } from "./imageLayout";

// Filter tabs map to the shop's occasion categories. "other" images (shop /
// ambiance) appear only under "all". Keep this in sync with ImageCategory in
// web/src/lib/api/types.ts and the admin upload category selector.
const CATEGORIES = ["wedding", "birthday", "funeral"] as const;
type Filter = "all" | (typeof CATEGORIES)[number];

// Grid uses thumbUrl, lightbox uses url.
type Tile = {
  id: string;
  aspectRatio: number;
  fit: GalleryImageFit;
  url?: string;
  thumbUrl?: string;
  alt?: string;
};

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
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [visible, setVisible] = useState(false); // drives enter/exit fade+scale
  const [dir, setDir] = useState<1 | -1>(1); // slide direction on switch

  const items = useMemo<Tile[]>(() => {
    return images.map((image, i) => {
      const layout = getGalleryImageLayout(image, i);
      return {
        id: image.id,
        aspectRatio: layout.aspectRatio,
        fit: layout.fit,
        url: image.url,
        thumbUrl: image.thumbUrl,
        alt: image.alt,
      };
    });
  }, [images]);

  const fetchImages = useCallback(
    async (cursor?: string) => {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setLoaded(false);
        setFailed(false);
      }

      try {
        const page = await listImages({
          category: filter === "all" ? undefined : (filter as ImageCategory),
          cursor,
          limit: 24,
        });
        setImages((current) => (cursor ? [...current, ...page.items] : page.items));
        setNextCursor(page.nextCursor);
      } catch {
        setFailed(true);
        if (!cursor) {
          setImages([]);
          setNextCursor(null);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        if (!cursor) {
          setLoaded(true);
        }
      }
    },
    [filter],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchImages();
    }, 0);
    return () => window.clearTimeout(id);
  }, [fetchImages]);

  const openAt = useCallback((i: number) => {
    setDir(1);
    setOpen(i);
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => setOpen(null), 220); // matches CSS .lb-overlay
  }, []);

  const show = useCallback(
    (next: 1 | -1) => {
      setDir(next);
      setOpen((i) => ((i ?? 0) + next + items.length) % items.length);
    },
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
    setVisible(false);
    setImages([]);
    setNextCursor(null);
    setLoaded(false);
    setLoading(true);
    setFailed(false);
    setFilter(f);
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: t("all") },
    ...CATEGORIES.map((c) => ({ key: c, label: to(`items.${c}.label`) })),
  ];

  const current = open !== null ? items[open] : null;

  return (
    <>
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

      {loaded && items.length === 0 ? (
        <div className="min-h-44 border-t border-silver pt-3">
          <p className="text-2xl text-muted">
            {failed ? t("fallback") : t("empty")}
          </p>
        </div>
      ) : (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
          {items.map((tile, i) => (
            <Reveal
              key={tile.id}
              className="break-inside-avoid"
              delay={(i % 8) * 70}
            >
              <button
                type="button"
                onClick={() => openAt(i)}
                aria-label={`${t("imageLabel")} ${i + 1}`}
                className="block w-full rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <ImageFrame
                  label={t("imageLabel")}
                  src={tile.thumbUrl}
                  alt={tile.alt || `${t("imageLabel")} ${i + 1}`}
                  aspectRatio={tile.aspectRatio}
                  fit={tile.fit}
                  hover
                  flat
                />
              </button>
            </Reveal>
          ))}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-muted">{t("loading")}</p>
      ) : nextCursor ? (
        <button
          type="button"
          onClick={() => {
            if (nextCursor) void fetchImages(nextCursor);
          }}
          disabled={loadingMore}
          className="mt-10 rounded-sm border border-silver px-7 py-3 text-sm tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
        >
          {loadingMore ? t("loading") : t("loadMore")}
        </button>
      ) : null}

      {open !== null && current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("imageLabel")}
          onClick={close}
          className={`lb-overlay fixed inset-0 z-[60] flex items-center justify-center bg-foreground/90 p-4 backdrop-blur-sm sm:p-8 ${
            visible ? "is-open" : ""
          }`}
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
            className="lb-panel max-h-[82vh] w-full max-w-3xl"
          >
            <div
              key={open}
              className={`lb-slide ${dir > 0 ? "from-right" : "from-left"}`}
            >
              <ImageFrame
                label={t("imageLabel")}
                src={current.url}
                alt={current.alt || t("imageLabel")}
                aspect="aspect-[4/3]"
                fit="contain"
              />
            </div>
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
