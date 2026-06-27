import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Header } from "@/components/public/layout/Header";
import { Footer } from "@/components/public/layout/Footer";

export default function NotFound() {
  const t = useTranslations("notFound");

  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-7xl text-accent">404</p>
        <h1 className="mt-4 font-serif text-3xl text-foreground md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          {t("body")}
        </p>
        <Link
          href="/"
          className="mt-8 rounded-sm bg-foreground px-7 py-3 text-sm tracking-wide text-background transition-colors hover:bg-accent-hover"
        >
          {t("cta")}
        </Link>
      </main>
      <Footer />
    </>
  );
}
