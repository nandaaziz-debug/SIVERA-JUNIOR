"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface HasilScan {
  teksEkstraksi: string;
  maskingTerdeteksi: boolean;
  jumlahDitemukan: { nik: number; noBpjs: number };
}

const DAFTAR_RS = ["RS ASM", "RS Haryanda"];

export default function AnalisisKasusPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [rumahSakit, setRumahSakit] = useState(DAFTAR_RS[0]);
  const [sepNumber, setSepNumber] = useState("");
  const [hasilScan, setHasilScan] = useState<HasilScan | null>(null);
  const [teksEditable, setTeksEditable] = useState("");
  const [sedangScan, setSedangScan] = useState(false);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

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
          teksEkstraksi: teksEditable,
          maskingTerdeteksi: hasilScan?.maskingTerdeteksi ?? false,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPesan(data.error ?? "Gagal menyimpan kasus");
        return;
      }

      setPesan("Kasus berhasil disimpan.");
      setFile(null);
      setPreview(null);
      setHasilScan(null);
      setTeksEditable("");
      setSepNumber("");
    } catch {
      setPesan("Terjadi kesalahan jaringan saat menyimpan.");
    } finally {
      setSedangSimpan(false);
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

      {pesan && <p className="mt-4 text-sm text-gray-700">{pesan}</p>}
    </main>
  );
}
