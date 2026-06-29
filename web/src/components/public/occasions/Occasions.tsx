"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { listImages } from "@/lib/api/images";
import type { GalleryImage, ImageCategory } from "@/lib/api/types";
import { GalleryPhoto } from "../gallery/GalleryPhoto";
import { Reveal } from "../ui/Reveal";

const KEYS = ["wedding", "birthday", "funeral"] as const;

export function Occasions() {
  const t = useTranslations("occasions");
  const [imagesByCategory, setImagesByCategory] = useState<
    Partial<Record<(typeof KEYS)[number], GalleryImage>>
  >({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadImages() {
      const entries = await Promise.all(
        KEYS.map(async (category) => {
          try {
            const data = await listImages(
              { category: category as ImageCategory, limit: 1 },
              controller.signal,
            );
            return [category, data.items[0]] as const;
          } catch {
            return [category, undefined] as const;
          }
        }),
      );

      setImagesByCategory(Object.fromEntries(entries));
    }

    void loadImages();
    return () => controller.abort();
  }, []);

  return (
    <section className="border-t border-silver-soft bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 max-w-xl font-serif text-3xl leading-tight text-foreground md:text-4xl">
            {t("title")}
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {KEYS.map((key, i) => (
            <Reveal key={key} delay={i * 120}>
              <article>
                <GalleryPhoto image={imagesByCategory[key]} label={t(`items.${key}.label`)} />
                <h3 className="mt-5 font-serif text-2xl text-foreground">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {t(`items.${key}.description`)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
