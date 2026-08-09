"use client";

import { useEffect, useState } from "react";

interface RiwayatRow {
  id: string;
  sep_number: string | null;
  kode_diagnosis: string | null;
  accuracy_score: number | null;
  status_review: string;
  jalur_analisis: string | null;
  created_at: string;
  hospitals: { nama: string } | null;
}

const WARNA_STATUS: Record<string, string> = {
  menunggu: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  disetujui: "bg-green-500/15 text-green-400 border-green-500/30",
  disanggah: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function RiwayatPage() {
  const [data, setData] = useState<RiwayatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cari, setCari] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (cari) params.set("cari", cari);
    if (status) params.set("status", status);

    setLoading(true);
    fetch(`/api/riwayat?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => setData(res.data ?? []))
      .finally(() => setLoading(false));
  }, [cari, status]);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#0C447C] to-[#042C53] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">
          Rekap
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight text-white">
          Riwayat Analisa
        </h1>
      </div>

      <div className="mt-5 flex gap-3">
        <input
          className="flex-1 rounded glass-input p-2.5 text-sm text-white placeholder:text-gray-500"
          placeholder="Cari nomor SEP atau kode diagnosis..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
        <select
          className="rounded glass-input p-2.5 text-sm text-white"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="menunggu">Menunggu</option>
          <option value="disetujui">Disetujui</option>
          <option value="disanggah">Disanggah</option>
        </select>
      </div>

      <div className="mt-5 space-y-2">
        {loading && <p className="text-sm text-gray-500">Memuat...</p>}
        {!loading && data.length === 0 && (
          <p className="text-sm text-gray-500">Belum ada kasus tercatat.</p>
        )}
        {data.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-lg glass-panel p-4"
          >
            <div>
              <p className="font-semibold text-white">
                {row.kode_diagnosis ?? "(tanpa kode)"}
                {row.sep_number && (
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    SEP {row.sep_number}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                {row.hospitals?.nama ?? "-"} ·{" "}
                {new Date(row.created_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
                {row.jalur_analisis && <> · jalur: {row.jalur_analisis}</>}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {row.accuracy_score !== null && (
                <span className="text-lg font-bold text-white">
                  {row.accuracy_score}
                  <span className="text-xs font-normal text-gray-500">/100</span>
                </span>
              )}
              <span
                className={`rounded border px-2.5 py-1 text-xs font-medium uppercase ${WARNA_STATUS[row.status_review]}`}
              >
                {row.status_review}
              </span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
