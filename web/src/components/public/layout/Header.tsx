"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Header() {
  const t = useTranslations("nav");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "/", label: t("home") },
    { href: "/gallery", label: t("gallery") },
    { href: "/comments", label: t("comments") },
    { href: "/contact", label: t("contact") },
  ] as const;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-silver-soft bg-background/90 backdrop-blur"
          : "border-b border-silver-soft/60 bg-background/78 backdrop-blur"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="font-serif text-xl tracking-wide text-foreground"
        >
          Blütenhaus
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-foreground/80 transition-colors hover:text-accent"
            >
              {l.label}
            </Link>
          ))}
          <LanguageSwitcher />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="md:hidden"
        >
          <span className="block h-px w-6 bg-foreground" />
          <span className="mt-1.5 block h-px w-6 bg-foreground" />
          <span className="mt-1.5 block h-px w-6 bg-foreground" />
        </button>
      </div>

      {open && (
        <nav className="flex flex-col gap-4 border-t border-silver-soft bg-background px-6 py-6 md:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm text-foreground/80"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2">
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
}
