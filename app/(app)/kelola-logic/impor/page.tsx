"use client";

import { useState } from "react";
import LogicRuleForm, { LogicRuleFormData } from "@/components/logic-rule-form";

const SUMBER_OPSI = ["TKMKB", "PPK", "PNPK", "BA_Kesepakatan", "Logic_BPJS"];

export default function ImporNarasiPage() {
  const [sumber, setSumber] = useState(SUMBER_OPSI[0]);
  const [narasi, setNarasi] = useState("");
  const [memproses, setMemproses] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftForm, setDraftForm] = useState<LogicRuleFormData | null>(null);

  async function handleBuatDraft() {
    setMemproses(true);
    setError(null);
    setDraftForm(null);

    try {
      const res = await fetch("/api/logic-rules/import-narasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narasi, sumber }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal membuat draft");
        return;
      }

      const d = data.draft;
      setDraftForm({
        kodeDiagnosis: d.kode_diagnosis ?? "",
        namaDiagnosis: d.nama_diagnosis ?? "",
        sumber,
        jenisAturan: d.bisa_disederhanakan ? "terstruktur" : "narasi_fallback",
        kriteriaDiagnosis: (d.kriteria_diagnosis ?? []).join("\n"),
        syaratTatalaksana: (d.syarat_tatalaksana ?? []).join("\n"),
        narasiAsli: d.bisa_disederhanakan ? "" : narasi,
        kategoriTemuan: d.kategori_temuan_disarankan ?? "sedang",
        referensiSumber: "",
        rumahSakit: [],
      });

      if (!d.bisa_disederhanakan) {
        setError(
          `Catatan AI: narasi ini dinilai sulit disederhanakan jadi kriteria tetap — ${d.alasan_jika_tidak_bisa}. Draft disiapkan sebagai "Narasi Fallback".`
        );
      }
    } catch (err: any) {
      setError(err?.message ?? "Terjadi kesalahan jaringan.");
    } finally {
      setMemproses(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="rounded-xl bg-white p-6 text-gray-900">
      <h1 className="text-2xl font-semibold text-primary">
        Import Aturan dari Narasi
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Tempel satu bagian narasi TKMKB/PPK/PNPK (per diagnosis), AI akan
        membuat draft. Draft <strong>wajib ditinjau dan dikoreksi</strong>{" "}
        sebelum disimpan — belum langsung aktif dipakai sistem.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sumber Dokumen
          </label>
          <select
            className="mt-1 w-full rounded border-gray-300 p-2 text-sm"
            value={sumber}
            onChange={(e) => setSumber(e.target.value)}
          >
            {SUMBER_OPSI.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <label className="mt-3 block text-sm font-medium text-gray-700">
            Narasi Asli
          </label>
          <textarea
            className="mt-1 w-full rounded border-gray-300 p-2 text-sm"
            rows={16}
            value={narasi}
            onChange={(e) => setNarasi(e.target.value)}
            placeholder="Tempel narasi TKMKB/PPK/PNPK untuk satu diagnosis di sini..."
          />

          <button
            onClick={handleBuatDraft}
            disabled={memproses || narasi.trim().length < 20}
            className="mt-3 rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {memproses ? "Membuat draft..." : "Buat Draft JSON dengan AI"}
          </button>

          {error && <p className="mt-2 text-sm text-amber-700">{error}</p>}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700">
            Draft Hasil AI — Tinjau &amp; Koreksi
          </p>
          {!draftForm && (
            <p className="mt-2 text-sm text-gray-400">
              Draft akan muncul di sini setelah diproses.
            </p>
          )}
          {draftForm && (
            <div className="mt-2">
              <LogicRuleForm initialData={draftForm} />
            </div>
          )}
        </div>
      </div>
      </div>
    </main>
  );
}
