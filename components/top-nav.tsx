"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MENU = [
  { href: "/", label: "Dashboard" },
  { href: "/analisis", label: "Analisis Kasus" },
  { href: "/riwayat", label: "Riwayat Analisa" },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [profil, setProfil] = useState<{ nama: string | null; role: string; email: string } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setProfil(data);
      });
  }, []);

  async function handleKeluar() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A1420]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <span className="text-sm font-extrabold uppercase tracking-widest text-white">
            SIVERA <span className="text-primary-light">Junior</span>
          </span>
          <nav className="flex gap-1">
            {MENU.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-white"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {profil?.role === "admin" && (
              <Link
                href="/kelola-logic"
                className={`rounded px-3 py-1.5 text-sm font-medium transition ${
                  pathname.startsWith("/kelola-logic")
                    ? "bg-primary text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                Kelola Logic JSON
              </Link>
            )}
          </nav>
        </div>

        {profil && (
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <p className="font-medium text-white">{profil.nama ?? profil.email}</p>
              <p className="text-xs uppercase tracking-wide text-primary-light">
                {profil.role}
              </p>
            </div>
            <button
              onClick={handleKeluar}
              className="rounded border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:border-red-500 hover:text-red-400"
            >
              Keluar
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
