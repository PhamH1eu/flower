import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Footer() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");

  return (
    <footer className="border-t border-silver-soft bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-serif text-xl tracking-wide text-foreground">
              Blütenhaus
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              {t("tagline")}
            </p>
          </div>

          <nav className="flex flex-col gap-3 text-sm">
            <Link href="/" className="text-muted hover:text-foreground">
              {tNav("home")}
            </Link>
            <Link href="/gallery" className="text-muted hover:text-foreground">
              {tNav("gallery")}
            </Link>
            <Link href="/comments" className="text-muted hover:text-foreground">
              {tNav("comments")}
            </Link>
            <Link href="/contact" className="text-muted hover:text-foreground">
              {tNav("contact")}
            </Link>
          </nav>

          <div className="flex flex-col gap-4">
            <LanguageSwitcher />
            <p className="text-sm text-muted">{t("address")}</p>
            <p className="text-sm text-muted">{t("hotline")}</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-silver-soft pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {t("year")} Blütenhaus. {t("rights")}
          </p>
          <div className="flex gap-6">
            <Link href="/impressum" className="hover:text-foreground">
              {t("imprint")}
            </Link>
            <Link href="/datenschutz" className="hover:text-foreground">
              {t("privacy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
