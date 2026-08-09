"use client";

import { useCallback, useRef, useState } from "react";
import AnalisisItemCard, { QueueItem } from "@/components/analisis-item-card";

const FORMAT_DIDUKUNG = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAKS_UKURAN = 15 * 1024 * 1024;

function buatId() {
  return Math.random().toString(36).slice(2);
}

export default function AnalisisKasusPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sedangMemproses, setSedangMemproses] = useState(false);
  const [dragAktif, setDragAktif] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateItem(localId: string, patch: Partial<QueueItem>) {
    setQueue((q) => q.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  }

  function removeItem(localId: string) {
    setQueue((q) => q.filter((it) => it.localId !== localId));
  }

  const tambahBerkas = useCallback((files: FileList | File[]) => {
    const daftar = Array.from(files);
    const itemBaru: QueueItem[] = [];

    for (const file of daftar) {
      if (!FORMAT_DIDUKUNG.includes(file.type)) continue;
      if (file.size > MAKS_UKURAN) continue;

      itemBaru.push({
        localId: buatId(),
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        status: "menunggu",
        teksEditable: "",
        rumahSakit: "RS ASM",
        sepNumber: "",
        kodeDiagnosis: "",
        kodeTambahan: "",
      });
    }

    if (itemBaru.length > 0) {
      setQueue((q) => [...q, ...itemBaru]);
    }
  }, []);

  // Dukungan paste (Ctrl+V) — screenshot langsung dari clipboard
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) tambahBerkas(files);
    },
    [tambahBerkas]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragAktif(false);
    if (e.dataTransfer.files?.length) tambahBerkas(e.dataTransfer.files);
  }

  // Antrian diproses SATU PER SATU (bukan Promise.all) — ini yang menjaga
  // beban API AI tetap terkendali meski banyak kasus diunggah sekaligus.
  async function prosesSemua() {
    setSedangMemproses(true);

    const menunggu = queue.filter((it) => it.status === "menunggu");

    for (const item of menunggu) {
      updateItem(item.localId, { status: "memindai" });

      try {
        const formData = new FormData();
        formData.append("berkas", item.file);

        const res = await fetch("/api/analisis/scan", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          updateItem(item.localId, { status: "error", errorMsg: data.error ?? "Gagal memindai" });
          continue;
        }

        const kodeSekunderDanProsedur = [
          ...(data.kodeDiagnosisSekunder ?? []),
          ...(data.kodeProsedur ?? []),
        ].join("\n");

        updateItem(item.localId, {
          status: "siap_review",
          teksEditable: data.teksEkstraksi,
          maskingTerdeteksi: data.maskingTerdeteksi,
          jumlahDitemukan: data.jumlahDitemukan,
          // Auto-isi dari hasil scan AI — tetap bisa dikoreksi manual sebelum
          // disimpan (human checkpoint), karena akurasi baca kode tetap
          // wajib ditinjau verifikator.
          sepNumber: data.sepNumber ?? "",
          kodeDiagnosis: data.kodeDiagnosisUtama ?? "",
          kodeTambahan: kodeSekunderDanProsedur,
        });
      } catch (err: any) {
        updateItem(item.localId, {
          status: "error",
          errorMsg: err?.message ?? "Kesalahan jaringan saat memindai",
        });
      }
    }

    setSedangMemproses(false);
  }

  const jumlahMenunggu = queue.filter((it) => it.status === "menunggu").length;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="rounded-xl border border-white/10 bg-gradient-to-r from-[#0C447C] to-[#042C53] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-light">
          Verifikasi
        </p>
        <h1 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight text-white">
          Analisis Kasus
        </h1>
        <p className="mt-1 text-sm text-gray-300">
          Unggah beberapa kasus sekaligus — diproses satu per satu secara
          otomatis agar tidak membebani API AI.
        </p>
      </div>

      {/* Dropzone: paste, drag & drop, atau klik */}
      <div
        tabIndex={0}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragAktif(true);
        }}
        onDragLeave={() => setDragAktif(false)}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
          dragAktif ? "border-primary-light bg-primary/10" : "border-white/15 hover:border-white/30"
        }`}
      >
        <p className="text-sm font-medium text-white">
          Klik untuk lampirkan, seret berkas ke sini, atau paste (Ctrl+V) screenshot
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Format: JPG, PNG, WEBP, atau PDF — maksimal 15MB per berkas, bisa banyak sekaligus
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={FORMAT_DIDUKUNG.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && tambahBerkas(e.target.files)}
        />
      </div>

      {queue.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {queue.length} berkas dalam antrian
            {jumlahMenunggu > 0 && ` · ${jumlahMenunggu} menunggu diproses`}
          </p>
          {jumlahMenunggu > 0 && (
            <button
              onClick={prosesSemua}
              disabled={sedangMemproses}
              className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 btn-3d"
            >
              {sedangMemproses ? "Memindai..." : `Proses ${jumlahMenunggu} Kasus`}
            </button>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {queue.map((item) => (
          <AnalisisItemCard
            key={item.localId}
            item={item}
            onUpdate={(patch) => updateItem(item.localId, patch)}
            onRemove={() => removeItem(item.localId)}
          />
        ))}
      </div>
    </main>
  );
}
