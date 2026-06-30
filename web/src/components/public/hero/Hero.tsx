"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GalleryImage } from "@/lib/api/types";
import { loadLandingImage } from "../gallery/landingImages";

export function Hero() {
  const t = useTranslations("hero");
  const [image, setImage] = useState<GalleryImage>();

  useEffect(() => {
    const controller = new AbortController();

    loadLandingImage("hero", { latest: true }, controller.signal).then(setImage);

    return () => controller.abort();
  }, []);

  return (
    <section className="relative isolate min-h-[calc(100svh-4.5rem)] overflow-hidden border-b border-silver-soft bg-foreground pt-24 text-background">
      {image?.url || image?.thumbUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url || image.thumbUrl}
            alt={image.alt || t("imageLabel")}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(43,42,40,0.84)_0%,rgba(43,42,40,0.58)_38%,rgba(43,42,40,0.16)_72%,rgba(43,42,40,0.32)_100%)]" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(169,139,93,0.28),transparent_32%),linear-gradient(135deg,#2b2a28,#56524b)]" />
      )}

      <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-6xl items-end px-6 py-14 md:py-20">
        <div className="reveal is-visible max-w-3xl">
          <p className="mb-5 text-xs uppercase tracking-[0.25em] text-background/75">
            {t("eyebrow")}
          </p>
          <h1 className="font-serif text-5xl leading-[0.98] text-background sm:text-6xl md:text-7xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-background/78 md:text-lg">
            {t("subtitle")}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-6">
            <Link
              href="/gallery"
              className="rounded-sm bg-background px-7 py-3 text-sm tracking-wide text-foreground transition-colors hover:bg-silver-soft"
            >
              {t("ctaPrimary")}
            </Link>
            <a
              href="#visit"
              className="text-sm tracking-wide text-background/85 transition-colors hover:text-background"
            >
              {t("ctaSecondary")} →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
