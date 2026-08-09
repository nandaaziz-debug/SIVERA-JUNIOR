"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [ringkasan, setRingkasan] = useState<{ totalKasus: number; menunggu: number } | null>(null);

  useEffect(() => {
    fetch("/api/riwayat?ringkasan=1")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setRingkasan(data);
      });
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#0C447C] to-[#042C53] p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">
          Status Report
        </p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase tracking-tight text-white">
          SIVERA Junior
        </h1>
        <p className="mt-2 max-w-xl text-sm text-gray-300">
          Alat bantu verifikasi klaim BPJS — fokus RS ASM &amp; RS Haryanda.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total Kasus</p>
          <p className="mt-1 text-3xl font-bold text-white">
            {ringkasan?.totalKasus ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400">Menunggu Review</p>
          <p className="mt-1 text-3xl font-bold text-amber-400">
            {ringkasan?.menunggu ?? "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <a
          href="/analisis"
          className="rounded bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light"
        >
          + Analisis Kasus Baru
        </a>
        <a
          href="/riwayat"
          className="rounded border border-white/15 px-5 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/5"
        >
          Lihat Riwayat
        </a>
      </div>
    </main>
  );
}
