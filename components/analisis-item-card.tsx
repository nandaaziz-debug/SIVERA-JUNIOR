"use client";

import { createClient } from "@/lib/supabase/client";

export interface QueueItem {
  localId: string;
  file: File;
  previewUrl: string | null;
  status: "menunggu" | "memindai" | "siap_review" | "diproses" | "tersimpan" | "error";
  errorMsg?: string;
  maskingTerdeteksi?: boolean;
  jumlahDitemukan?: { nik: number; noBpjs: number };
  teksEditable: string;
  rumahSakit: string;
  sepNumber: string;
  kodeDiagnosis: string;
  kodeTambahan: string;
  caseId?: string;
  hasilProses?: {
    temuan: { kategori: string; deskripsi: string; sumber: string }[];
    accuracyScore: number;
    jalurAnalisis: string;
  };
}

const DAFTAR_RS = ["RS ASM", "RS Haryanda"];

const WARNA_KATEGORI: Record<string, string> = {
  kritis: "bg-red-500/15 text-red-400 border-red-500/30",
  sedang: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ringan: "bg-yellow-500/10 text-yellow-300 border-yellow-500/20",
  informasi: "bg-white/5 text-gray-400 border-white/10",
};

const LABEL_STATUS: Record<QueueItem["status"], { teks: string; warna: string }> = {
  menunggu: { teks: "Menunggu", warna: "bg-gray-500/15 text-gray-400" },
  memindai: { teks: "Memindai...", warna: "bg-blue-500/15 text-blue-400" },
  siap_review: { teks: "Perlu Ditinjau", warna: "bg-amber-500/15 text-amber-400" },
  diproses: { teks: "Diproses...", warna: "bg-blue-500/15 text-blue-400" },
  tersimpan: { teks: "Tersimpan", warna: "bg-green-500/15 text-green-400" },
  error: { teks: "Gagal", warna: "bg-red-500/15 text-red-400" },
};

export default function AnalisisItemCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: QueueItem;
  onUpdate: (patch: Partial<QueueItem>) => void;
  onRemove: () => void;
}) {
  async function handleSimpan() {
    onUpdate({ status: "diproses" });
    try {
      const supabase = createClient();
      const { data: hospitals } = await supabase
        .from("hospitals")
        .select("id")
        .eq("nama", item.rumahSakit)
        .single();

      const res = await fetch("/api/analisis/simpan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId: hospitals?.id,
          sepNumber: item.sepNumber,
          kodeDiagnosis: item.kodeDiagnosis,
          semuaKode: [
            item.kodeDiagnosis,
            ...item.kodeTambahan.split("\n").map((s) => s.trim()).filter(Boolean),
          ].filter(Boolean),
          teksEkstraksi: item.teksEditable,
          maskingTerdeteksi: item.maskingTerdeteksi ?? false,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        onUpdate({ status: "error", errorMsg: data.error ?? "Gagal menyimpan" });
        return;
      }

      onUpdate({ status: "tersimpan", caseId: data.caseId });
    } catch {
      onUpdate({ status: "error", errorMsg: "Kesalahan jaringan saat menyimpan" });
    }
  }

  async function handleProses() {
    if (!item.caseId) return;
    try {
      const res = await fetch("/api/analisis/proses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: item.caseId }),
      });
      const data = await res.json();
      if (!res.ok) {
        onUpdate({ errorMsg: data.error ?? "Gagal memproses" });
        return;
      }
      onUpdate({ hasilProses: data });
    } catch {
      onUpdate({ errorMsg: "Kesalahan jaringan saat memproses" });
    }
  }

  const status = LABEL_STATUS[item.status];

  return (
    <div className="rounded-lg glass-panel p-4">
      <div className="flex gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded glass-input">
          {item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
              PDF
            </div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-medium text-white">{item.file.name}</p>
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${status.warna}`}>
              {status.teks}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-4 gap-2">
            <select
              className="rounded glass-input p-1.5 text-xs text-white"
              value={item.rumahSakit}
              onChange={(e) => onUpdate({ rumahSakit: e.target.value })}
              disabled={item.status === "tersimpan"}
            >
              {DAFTAR_RS.map((rs) => (
                <option key={rs} value={rs}>
                  {rs}
                </option>
              ))}
            </select>
            <input
              className="rounded glass-input p-1.5 text-xs text-white placeholder:text-gray-600"
              placeholder="No. SEP"
              value={item.sepNumber}
              onChange={(e) => onUpdate({ sepNumber: e.target.value })}
              disabled={item.status === "tersimpan"}
            />
            <input
              className="rounded glass-input p-1.5 text-xs text-white placeholder:text-gray-600"
              placeholder="Kode diagnosis"
              value={item.kodeDiagnosis}
              onChange={(e) => onUpdate({ kodeDiagnosis: e.target.value })}
              disabled={item.status === "tersimpan"}
            />
            <input
              className="rounded glass-input p-1.5 text-xs text-white placeholder:text-gray-600"
              placeholder="Kode tambahan (koma)"
              value={item.kodeTambahan.replace(/\n/g, ", ")}
              onChange={(e) =>
                onUpdate({ kodeTambahan: e.target.value.split(",").map((s) => s.trim()).join("\n") })
              }
              disabled={item.status === "tersimpan"}
            />
          </div>

          {(item.status === "siap_review") && (item.sepNumber || item.kodeDiagnosis) && (
            <p className="mt-1 text-[10px] text-primary-light">
              Kode di atas diisi otomatis dari hasil scan — periksa kembali sebelum disimpan.
            </p>
          )}

          {item.status === "error" && (
            <p className="mt-2 text-xs text-red-400">{item.errorMsg}</p>
          )}

          {(item.status === "siap_review" || item.status === "tersimpan" || item.status === "diproses") && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Hasil ekstraksi — tinjau sebelum disimpan</p>
                {item.maskingTerdeteksi && (
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-400">
                    {item.jumlahDitemukan?.nik ?? 0} NIK &amp; {item.jumlahDitemukan?.noBpjs ?? 0} no. BPJS disamarkan
                  </span>
                )}
              </div>
              <textarea
                className="mt-1 w-full rounded glass-input p-2 font-mono text-xs text-gray-200"
                rows={16}
                value={item.teksEditable}
                onChange={(e) => onUpdate({ teksEditable: e.target.value })}
                disabled={item.status === "tersimpan"}
              />

              {item.status !== "tersimpan" && (
                <button
                  onClick={handleSimpan}
                  className="mt-2 rounded bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
                >
                  Konfirmasi &amp; Simpan
                </button>
              )}

              {item.status === "tersimpan" && !item.hasilProses && (
                <button
                  onClick={handleProses}
                  className="mt-2 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light"
                >
                  Proses dengan Logic Engine
                </button>
              )}

              {item.hasilProses && (
                <div className="mt-3 rounded border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      Jalur: {item.hasilProses.jalurAnalisis}
                    </span>
                    <span className="text-xl font-bold text-white">
                      {item.hasilProses.accuracyScore}
                      <span className="text-xs font-normal text-gray-500">/100</span>
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {item.hasilProses.temuan.length === 0 && (
                      <p className="text-xs text-green-400">Tidak ada temuan.</p>
                    )}
                    {item.hasilProses.temuan.map((t, i) => (
                      <div
                        key={i}
                        className={`rounded border px-2 py-1.5 text-xs ${WARNA_KATEGORI[t.kategori] ?? WARNA_KATEGORI.informasi}`}
                      >
                        <span className="font-semibold uppercase">{t.kategori}</span> — {t.deskripsi}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {item.status !== "tersimpan" && (
          <button
            onClick={onRemove}
            className="h-fit text-xs text-gray-500 hover:text-red-400"
            title="Hapus dari antrian"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
