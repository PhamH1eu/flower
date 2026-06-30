"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { GalleryImage, ImageCategory } from "@/lib/api/types";
import { EditorialImage } from "../gallery/EditorialImage";
import { loadLandingImage } from "../gallery/landingImages";
import { Reveal } from "../ui/Reveal";

const KEYS = ["wedding", "birthday", "funeral"] as const;
type OccasionKey = (typeof KEYS)[number];

export function Occasions() {
  const t = useTranslations("occasions");
  const [active, setActive] = useState<OccasionKey>("wedding");
  const [imagesByCategory, setImagesByCategory] = useState<
    Partial<Record<OccasionKey, GalleryImage>>
  >({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadImages() {
      const entries = await Promise.all(
        KEYS.map(async (category) => {
          const image = await loadLandingImage(
            category,
            { category: category as ImageCategory },
            controller.signal,
          );
          return [category, image] as const;
        }),
      );

      setImagesByCategory(Object.fromEntries(entries));
    }

    void loadImages();
    return () => controller.abort();
  }, []);

  const services = useMemo(
    () =>
      KEYS.map((key, index) => ({
        key,
        number: String(index + 1).padStart(2, "0"),
        label: t(`items.${key}.label`),
        title: t(`items.${key}.title`),
        description: t(`items.${key}.description`),
        image: imagesByCategory[key],
      })),
    [imagesByCategory, t],
  );

  const activeService =
    services.find((service) => service.key === active) ?? services[0];

  return (
    <section className="border-t border-silver-soft bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            {t("eyebrow")}
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <h2 className="max-w-2xl font-serif text-4xl leading-tight text-foreground md:text-5xl">
              {t("title")}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted lg:justify-self-end">
              {activeService.description}
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="border-y border-silver-soft">
            {services.map((service, index) => {
              const isActive = service.key === active;
              return (
                <Reveal key={service.key} delay={index * 90}>
                  <article
                    onMouseEnter={() => setActive(service.key)}
                    onFocus={() => setActive(service.key)}
                    className={`group border-b border-silver-soft py-7 transition-colors last:border-b-0 ${
                      isActive ? "text-foreground" : "text-muted"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActive(service.key)}
                      className="grid w-full gap-4 text-left sm:grid-cols-[4rem_1fr] sm:gap-6"
                    >
                      <span className="text-xs uppercase tracking-[0.25em] text-accent">
                        {service.number}
                      </span>
                      <span>
                        <span className="block font-serif text-3xl leading-tight text-foreground transition-colors md:text-4xl">
                          {service.title}
                        </span>
                        <span className="mt-3 block max-w-md text-sm leading-relaxed text-muted">
                          {service.description}
                        </span>
                      </span>
                    </button>

                    <div className="mt-6 lg:hidden">
                      <EditorialImage
                        image={service.image}
                        label={service.label}
                        aspect="aspect-[4/3]"
                        className="rounded-sm"
                      />
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120} className="hidden lg:block">
            <div className="sticky top-28">
              <EditorialImage
                key={activeService.key}
                image={activeService.image}
                label={activeService.label}
                aspect="aspect-[5/6]"
                className="rounded-sm"
                overlay
              />
              <div className="mt-4 flex items-center justify-between border-t border-silver-soft pt-4 text-xs uppercase tracking-[0.22em] text-muted">
                <span>{activeService.label}</span>
                <span>{activeService.number} / 03</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
