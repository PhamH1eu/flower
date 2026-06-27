import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/public/ui/PageShell";
import { PageIntro } from "@/components/public/ui/PageIntro";
import { LegalNotice } from "@/components/public/legal/LegalNotice";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("impressum.title"),
    description: t("impressum.title"),
    robots: { index: false },
  };
}

export default function ImpressumPage() {
  const t = useTranslations("legal");

  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <PageIntro eyebrow={t("eyebrow")} title={t("impressum.title")} />
        <LegalNotice text={t("draftNotice")} />

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="mb-2 font-serif text-xl text-foreground">
              Angaben gemäß § 5 TMG
            </h2>
            <p className="whitespace-pre-line">
              {`{{Firmenname / Inhaber}}
{{Straße und Hausnummer}}
{{PLZ Ort}}
Deutschland`}
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl text-foreground">Kontakt</h2>
            <p className="whitespace-pre-line">
              {`Telefon: {{+49 …}}
E-Mail: {{kontakt@…}}`}
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl text-foreground">
              Umsatzsteuer-ID
            </h2>
            <p>
              Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG:{" "}
              {`{{USt-IdNr. oder „nicht vorhanden / Kleinunternehmer §19 UStG"}}`}
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl text-foreground">
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p className="whitespace-pre-line">
              {`{{Name}}
{{Anschrift wie oben}}`}
            </p>
          </section>
        </div>
      </article>
    </PageShell>
  );
}
