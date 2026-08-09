"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface HasilScan {
  teksEkstraksi: string;
  maskingTerdeteksi: boolean;
  jumlahDitemukan: { nik: number; noBpjs: number };
}

interface Temuan {
  kategori: "kritis" | "sedang" | "ringan" | "informasi";
  deskripsi: string;
  sumber: string;
  jalur: string;
}

interface HasilProses {
  temuan: Temuan[];
  accuracyScore: number;
  jalurAnalisis: string;
}

const DAFTAR_RS = ["RS ASM", "RS Haryanda"];

const WARNA_KATEGORI: Record<string, string> = {
  kritis: "bg-red-100 text-red-800",
  sedang: "bg-amber-100 text-amber-800",
  ringan: "bg-yellow-50 text-yellow-800",
  informasi: "bg-gray-100 text-gray-600",
};

export default function AnalisisKasusPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rumahSakit, setRumahSakit] = useState(DAFTAR_RS[0]);
  const [sepNumber, setSepNumber] = useState("");
  const [kodeDiagnosis, setKodeDiagnosis] = useState("");
  const [hasilScan, setHasilScan] = useState<HasilScan | null>(null);
  const [teksEditable, setTeksEditable] = useState("");
  const [sedangScan, setSedangScan] = useState(false);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [caseIdTersimpan, setCaseIdTersimpan] = useState<string | null>(null);
  const [hasilProses, setHasilProses] = useState<HasilProses | null>(null);
  const [sedangProses, setSedangProses] = useState(false);

  function handlePilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setHasilScan(null);
    setPesan(null);
  }

  async function handleScan() {
    if (!file) return;
    setSedangScan(true);
    setPesan(null);

    const formData = new FormData();
    formData.append("gambar", file);

    try {
      const res = await fetch("/api/analisis/scan", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setPesan(data.error ?? "Gagal memproses gambar");
        return;
      }

      setHasilScan(data);
      setTeksEditable(data.teksEkstraksi);
    } catch {
      setPesan("Terjadi kesalahan jaringan saat scan.");
    } finally {
      setSedangScan(false);
    }
  }

  async function handleSimpan() {
    setSedangSimpan(true);
    setPesan(null);

    try {
      const supabase = createClient();
      const { data: hospitals } = await supabase
        .from("hospitals")
        .select("id, nama")
        .eq("nama", rumahSakit)
        .single();

      const res = await fetch("/api/analisis/simpan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId: hospitals?.id,
          sepNumber,
          kodeDiagnosis,
          teksEkstraksi: teksEditable,
          maskingTerdeteksi: hasilScan?.maskingTerdeteksi ?? false,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPesan(data.error ?? "Gagal menyimpan kasus");
        return;
      }

      setPesan("Kasus berhasil disimpan. Lanjutkan proses Logic Engine di bawah.");
      setCaseIdTersimpan(data.caseId);
    } catch {
      setPesan("Terjadi kesalahan jaringan saat menyimpan.");
    } finally {
      setSedangSimpan(false);
    }
  }

  async function handleProses() {
    if (!caseIdTersimpan) return;
    setSedangProses(true);
    setPesan(null);

    try {
      const res = await fetch("/api/analisis/proses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: caseIdTersimpan }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPesan(data.error ?? "Gagal memproses kasus");
        return;
      }

      setHasilProses(data);
    } catch {
      setPesan("Terjadi kesalahan jaringan saat memproses.");
    } finally {
      setSedangProses(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold text-primary">Analisis Kasus</h1>
      <p className="mt-1 text-sm text-gray-500">
        Upload resume medis, sistem akan membaca isinya dan menyamarkan
        otomatis NIK/nomor BPJS sebelum data disimpan.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rumah Sakit
          </label>
          <select
            className="mt-1 w-full rounded border-gray-300 p-2"
            value={rumahSakit}
            onChange={(e) => setRumahSakit(e.target.value)}
          >
            {DAFTAR_RS.map((rs) => (
              <option key={rs} value={rs}>
                {rs}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nomor SEP (opsional)
          </label>
          <input
            className="mt-1 w-full rounded border-gray-300 p-2"
            value={sepNumber}
            onChange={(e) => setSepNumber(e.target.value)}
            placeholder="0001R0010125V000001"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">
          Kode Diagnosis (ICD-10)
        </label>
        <input
          className="mt-1 w-full rounded border-gray-300 p-2"
          value={kodeDiagnosis}
          onChange={(e) => setKodeDiagnosis(e.target.value)}
          placeholder="I21.0"
        />
        <p className="mt-1 text-xs text-gray-400">
          Dipakai untuk mencari aturan Logic JSON yang cocok secara otomatis.
        </p>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700">
          Gambar Resume Medis
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handlePilihFile}
          className="mt-1 block w-full text-sm"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Pratinjau resume medis"
            className="mt-3 max-h-64 rounded border"
          />
        )}
      </div>

      <button
        onClick={handleScan}
        disabled={!file || sedangScan}
        className="mt-4 rounded bg-primary px-4 py-2 text-white disabled:opacity-40"
      >
        {sedangScan ? "Memindai..." : "Scan Gambar"}
      </button>

      {hasilScan && (
        <div className="mt-6 rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Hasil Ekstraksi — Wajib Ditinjau</h2>
            {hasilScan.maskingTerdeteksi && (
              <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                {hasilScan.jumlahDitemukan.nik} NIK &amp;{" "}
                {hasilScan.jumlahDitemukan.noBpjs} no. BPJS disamarkan
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Periksa hasil di bawah. Jika ada identitas yang lolos atau data
            klinis penting yang salah tersamarkan, koreksi manual sebelum
            disimpan.
          </p>
          <textarea
            className="mt-3 w-full rounded border-gray-300 p-3 font-mono text-sm"
            rows={10}
            value={teksEditable}
            onChange={(e) => setTeksEditable(e.target.value)}
          />
          <button
            onClick={handleSimpan}
            disabled={sedangSimpan}
            className="mt-3 rounded bg-green-700 px-4 py-2 text-white disabled:opacity-40"
          >
            {sedangSimpan ? "Menyimpan..." : "Konfirmasi & Simpan Kasus"}
          </button>
        </div>
      )}

      {caseIdTersimpan && !hasilProses && (
        <div className="mt-6 rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            Kasus tersimpan. Jalankan pencocokan aturan Logic JSON untuk
            mendapatkan temuan dan skor akurasi.
          </p>
          <button
            onClick={handleProses}
            disabled={sedangProses}
            className="mt-3 rounded bg-primary px-4 py-2 text-white disabled:opacity-40"
          >
            {sedangProses ? "Memproses..." : "Proses dengan Logic Engine"}
          </button>
        </div>
      )}

      {hasilProses && (
        <div className="mt-6 rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Hasil Analisis</h2>
            <span className="text-2xl font-semibold text-primary">
              {hasilProses.accuracyScore}
              <span className="text-sm text-gray-400">/100</span>
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Jalur analisis: <span className="font-medium">{hasilProses.jalurAnalisis}</span>
          </p>

          <div className="mt-4 space-y-2">
            {hasilProses.temuan.length === 0 && (
              <p className="text-sm text-green-700">Tidak ada temuan.</p>
            )}
            {hasilProses.temuan.map((t, i) => (
              <div key={i} className="rounded border border-gray-100 p-3 text-sm">
                <span
                  className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${WARNA_KATEGORI[t.kategori]}`}
                >
                  {t.kategori}
                </span>
                <p className="mt-1 text-gray-700">{t.deskripsi}</p>
                <p className="mt-1 text-xs text-gray-400">Sumber: {t.sumber}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {pesan && <p className="mt-4 text-sm text-gray-700">{pesan}</p>}
    </main>
  );
}
