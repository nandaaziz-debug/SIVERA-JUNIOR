"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
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
    <main className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary">SIVERA Junior</h1>
          <p className="mt-2 text-gray-600">
            Alat bantu verifikasi klaim BPJS — fokus RS ASM &amp; RS Haryanda.
          </p>
        </div>
        {profil && (
          <div className="text-right text-sm">
            <p className="font-medium">{profil.nama ?? profil.email}</p>
            <p className="text-gray-400">{profil.role}</p>
            <button
              onClick={handleKeluar}
              className="mt-1 text-xs text-red-600 hover:underline"
            >
              Keluar
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <a
          href="/analisis"
          className="rounded bg-primary px-4 py-2 text-sm text-white"
        >
          Analisis Kasus
        </a>
        {/* Kelola Logic JSON hanya ditampilkan untuk admin — RLS di database
            tetap jadi pagar utama, ini hanya penyesuaian tampilan */}
        {profil?.role === "admin" && (
          <a
            href="/kelola-logic"
            className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-800"
          >
            Kelola Logic JSON
          </a>
        )}
      </div>
    </main>
  );
}
