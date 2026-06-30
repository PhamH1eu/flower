"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useShopSettings } from "@/hooks/useShopSettings";
import type { GalleryImage } from "@/lib/api/types";
import { EditorialImage } from "../gallery/EditorialImage";
import { loadLandingImage } from "../gallery/landingImages";
import { Reveal } from "../ui/Reveal";

export function About() {
  const t = useTranslations("about");
  const [image, setImage] = useState<GalleryImage>();
  const settings = useShopSettings({
    storeName: "Tường Vi Flower",
    phone: t("hotline"),
    address: t("address"),
    googleMapsUrl: "https://www.google.com/maps",
    openingHours: t("hours"),
    locale: "vi",
  });

  useEffect(() => {
    const controller = new AbortController();

    loadLandingImage("about", { category: "other", latest: true }, controller.signal).then(
      setImage,
    );

    return () => controller.abort();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <Reveal className="md:order-2">
          <EditorialImage
            image={image}
            label={t("imageLabel")}
            aspect="aspect-[4/3]"
            className="rounded-sm"
          />
        </Reveal>

        <Reveal delay={120} className="md:order-1">
          <p className="text-xs uppercase tracking-[0.25em] text-accent">
            {t("eyebrow")}
          </p>
          <h2 className="mt-4 font-serif text-3xl leading-tight text-foreground md:text-4xl">
            {t("title")}
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted">
            {t("body")}
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-silver-soft pt-6 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-[0.15em] text-muted">
                {t("addressLabel")}
              </dt>
              <dd className="mt-1 text-foreground">{settings.address}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.15em] text-muted">
                {t("hotlineLabel")}
              </dt>
              <dd className="mt-1 text-foreground">{settings.phone}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.15em] text-muted">
                {t("hoursLabel")}
              </dt>
              <dd className="mt-1 whitespace-pre-line text-foreground">{settings.openingHours}</dd>
            </div>
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
