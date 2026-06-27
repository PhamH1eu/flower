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
    title: t("datenschutz.title"),
    description: t("datenschutz.title"),
    robots: { index: false },
  };
}

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 font-serif text-xl text-foreground">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function DatenschutzPage() {
  const t = useTranslations("legal");

  return (
    <PageShell>
      <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <PageIntro eyebrow={t("eyebrow")} title={t("datenschutz.title")} />
        <LegalNotice text={t("draftNotice")} />

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/90">
          <Section heading="1. Verantwortlicher">
            <p className="whitespace-pre-line">
              {`{{Firmenname / Inhaber}}
{{Anschrift}} · {{E-Mail}} · {{Telefon}}`}
            </p>
          </Section>

          <Section heading="2. Hosting">
            <p>
              Diese Website wird bei {`{{AWS Amplify / Vercel}}`} gehostet. Beim
              Aufruf werden technisch notwendige Daten (IP-Adresse, Zeitpunkt,
              User-Agent) in Server-Logfiles verarbeitet (Art. 6 Abs. 1 lit. f
              DSGVO) und nach kurzer Zeit gelöscht.
            </p>
          </Section>

          <Section heading="3. Bewertungen / Kommentare">
            <p>
              Beim Absenden einer Bewertung verarbeiten wir Ihren Namen, Ihre
              E-Mail-Adresse und Ihren Kommentar (Art. 6 Abs. 1 lit. a DSGVO).
              Die <strong>E-Mail-Adresse wird nicht öffentlich angezeigt</strong>{" "}
              und dient nur Rückfragen. Der Kommentar erscheint nach dem Absenden
              ohne vorherige Freigabe.
            </p>
          </Section>

          <Section heading="4. Spam-Schutz (Cloudflare Turnstile)">
            <p>
              Zum Schutz des Bewertungsformulars setzen wir Cloudflare Turnstile
              ein. Dabei kann die IP-Adresse an Cloudflare übermittelt werden
              (Art. 6 Abs. 1 lit. f DSGVO). Anbieter: Cloudflare, Inc., USA.
            </p>
          </Section>

          <Section heading="5. Bildergalerie">
            <p>
              In der Galerie zeigen wir Fotos unseres Geschäfts und unserer
              Arbeiten. Hierbei werden keine personenbezogenen Daten der
              Besucher verarbeitet.
            </p>
          </Section>

          <Section heading="6. Google Maps">
            <p>
              Zur Anzeige unseres Standorts binden wir eine Karte von Google
              Maps ein. Beim Laden der Karte kann Ihre IP-Adresse an Google
              übertragen werden. Anbieter: Google Ireland Ltd. Weitere Infos:{" "}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline"
              >
                policies.google.com/privacy
              </a>
              .
            </p>
          </Section>

          <Section heading="7. Ihre Rechte">
            <p>
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
              Einschränkung der Verarbeitung, Datenübertragbarkeit und
              Widerspruch sowie ein Beschwerderecht bei einer Aufsichtsbehörde.
              Kontakt: {`{{E-Mail}}`}.
            </p>
          </Section>
        </div>
      </article>
    </PageShell>
  );
}
