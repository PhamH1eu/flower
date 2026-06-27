"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { clearAdminSession, getAdminSession } from "@/lib/adminAuth";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/images", label: "Quản lý hình ảnh" },
  { href: "/admin/comments", label: "Quản lý bình luận" },
  { href: "/admin/settings", label: "Cài đặt" },
  { href: "/admin/account", label: "Tài khoản" },
];

export default function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getAdminSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <aside className="sticky top-6 rounded-[2rem] border border-silver-soft bg-surface p-8 shadow-sm lg:h-fit lg:w-80">
          <div className="mb-10 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-accent text-lg font-semibold text-background shadow-sm">
              F
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Flower Admin</p>
              <p className="text-lg font-semibold text-foreground">Quản trị</p>
            </div>
          </div>

          <nav className="space-y-2">
            {items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-3xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-accent text-background"
                      : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-10 rounded-[2rem] border border-silver-soft bg-background p-5 text-sm text-muted">
            <p className="font-semibold text-foreground">Tài khoản</p>
            <p className="mt-2 text-base text-foreground">{session?.name ?? "Admin"}</p>
            <p className="mt-1 text-xs text-muted">{session?.email ?? "admin@shop.com"}</p>
            <div className="mt-4">
              <button
                onClick={() => {
                  clearAdminSession();
                  router.push("/admin/login");
                }}
                className="inline-flex items-center rounded-full bg-accent px-3 py-2 text-sm font-semibold text-background transition hover:bg-accent-hover"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="rounded-[2rem] border border-silver-soft bg-surface p-8 shadow-sm">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.25em] text-accent">Bảng điều khiển</p>
              <h1 className="mt-3 text-4xl font-serif font-semibold text-foreground">{title}</h1>
              <p className="mt-4 text-sm leading-7 text-muted">
                Quản lý nội dung cửa hàng, hình ảnh, bình luận và cài đặt một cách trực quan.
              </p>
            </div>
          </div>

          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
