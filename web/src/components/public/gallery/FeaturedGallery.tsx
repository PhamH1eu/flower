"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { listImages } from "@/lib/api/images";
import type { GalleryImage } from "@/lib/api/types";
import { Reveal } from "../ui/Reveal";
import { ImageFrame } from "../ui/ImageFrame";
import { getGalleryImageLayout } from "./imageLayout";

export function FeaturedGallery() {
  const t = useTranslations("featured");
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    let cancelled = false;

    listImages({ limit: 3 })
      .then((page) => {
        if (!cancelled) setImages(page.items.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setImages([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const slots = images.length > 0 ? images : [0, 1, 2];

  return (
    <section className="border-t border-silver-soft bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-tight text-foreground md:text-4xl">
            {t("title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {slots.map((item, i) => {
            const image = typeof item === "number" ? null : item;
            const key = image ? image.id : `placeholder-${item}`;
            const layout = image ? getGalleryImageLayout(image, i) : null;
            return (
              <Reveal key={key} delay={i * 120}>
                <ImageFrame
                  label={t("imageLabel")}
                  src={image?.thumbUrl}
                  alt={image?.alt || t("imageLabel")}
                  aspect={i === 1 ? "aspect-[3/4]" : "aspect-[4/5]"}
                  aspectRatio={layout?.aspectRatio}
                  fit={layout?.fit}
                  hover
                />
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-12">
          <Link
            href="/gallery"
            className="inline-block rounded-sm border border-silver px-7 py-3 text-sm tracking-wide text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {t("cta")}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
