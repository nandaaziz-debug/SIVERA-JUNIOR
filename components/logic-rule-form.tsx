"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SUMBER_OPSI = ["Logic_BPJS", "BA_Kesepakatan", "TKMKB", "PPK", "PNPK"];
const RS_OPSI = ["RS ASM", "RS Haryanda"];

export interface LogicRuleFormData {
  id?: string;
  kodeDiagnosis: string;
  namaDiagnosis: string;
  sumber: string;
  jenisAturan: "terstruktur" | "narasi_fallback";
  kriteriaDiagnosis: string; // satu baris = satu kriteria
  syaratTatalaksana: string;
  narasiAsli: string;
  kategoriTemuan: "kritis" | "sedang" | "ringan";
  referensiSumber: string;
  rumahSakit: string[];
  status?: string;
}

export default function LogicRuleForm({
  initialData,
}: {
  initialData?: LogicRuleFormData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<LogicRuleFormData>(
    initialData ?? {
      kodeDiagnosis: "",
      namaDiagnosis: "",
      sumber: SUMBER_OPSI[0],
      jenisAturan: "terstruktur",
      kriteriaDiagnosis: "",
      syaratTatalaksana: "",
      narasiAsli: "",
      kategoriTemuan: "sedang",
      referensiSumber: "",
      rumahSakit: [],
    }
  );
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  function toggleRS(rs: string) {
    setForm((f) => ({
      ...f,
      rumahSakit: f.rumahSakit.includes(rs)
        ? f.rumahSakit.filter((r) => r !== rs)
        : [...f.rumahSakit, rs],
    }));
  }

  async function handleSimpan(statusBaru?: string) {
    setMenyimpan(true);
    setPesan(null);

    const payload = {
      kodeDiagnosis: form.kodeDiagnosis,
      namaDiagnosis: form.namaDiagnosis,
      sumber: form.sumber,
      jenisAturan: form.jenisAturan,
      ketentuan:
        form.jenisAturan === "terstruktur"
          ? {
              kriteria_diagnosis: form.kriteriaDiagnosis
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              syarat_tatalaksana: form.syaratTatalaksana
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            }
          : null,
      narasiAsli: form.jenisAturan === "narasi_fallback" ? form.narasiAsli : null,
      kategoriTemuan: form.kategoriTemuan,
      referensiSumber: form.referensiSumber,
      rumahSakit: form.rumahSakit,
      ...(statusBaru ? { status: statusBaru } : {}),
    };

    try {
      const url = form.id ? `/api/logic-rules/${form.id}` : "/api/logic-rules";
      const method = form.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setPesan(data.error ?? "Gagal menyimpan aturan");
        return;
      }

      setPesan("Tersimpan.");
      router.push("/kelola-logic");
      router.refresh();
    } catch {
      setPesan("Terjadi kesalahan jaringan.");
    } finally {
      setMenyimpan(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Kode Diagnosis
          </label>
          <input
            className="mt-1 w-full rounded border-gray-300 p-2"
            value={form.kodeDiagnosis}
            onChange={(e) => setForm({ ...form, kodeDiagnosis: e.target.value })}
            placeholder="I21.0, I21.1, I21.2  atau  I21  atau  I21.0-I21.4"
          />
          <p className="mt-1 text-xs text-gray-400">
            Bisa isi beberapa kode dipisah koma, satu prefix kategori (mis.
            "I21" cocok ke semua turunannya), atau rentang (mis. "I21.0-I21.4").
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nama Diagnosis
          </label>
          <input
            className="mt-1 w-full rounded border-gray-300 p-2"
            value={form.namaDiagnosis}
            onChange={(e) => setForm({ ...form, namaDiagnosis: e.target.value })}
            placeholder="STEMI Anterior"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sumber
          </label>
          <select
            className="mt-1 w-full rounded border-gray-300 p-2"
            value={form.sumber}
            onChange={(e) => setForm({ ...form, sumber: e.target.value })}
          >
            {SUMBER_OPSI.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Kategori Temuan Jika Dilanggar
          </label>
          <select
            className="mt-1 w-full rounded border-gray-300 p-2"
            value={form.kategoriTemuan}
            onChange={(e) =>
              setForm({ ...form, kategoriTemuan: e.target.value as any })
            }
          >
            <option value="kritis">Kritis</option>
            <option value="sedang">Sedang</option>
            <option value="ringan">Ringan</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">
          Referensi Sumber (bab/poin/halaman)
        </label>
        <input
          className="mt-1 w-full rounded border-gray-300 p-2"
          value={form.referensiSumber}
          onChange={(e) => setForm({ ...form, referensiSumber: e.target.value })}
          placeholder="TKMKB Bab 4, Poin 4.2"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">
          Berlaku untuk Rumah Sakit
        </label>
        <div className="mt-1 flex gap-3">
          {RS_OPSI.map((rs) => (
            <label key={rs} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={form.rumahSakit.includes(rs)}
                onChange={() => toggleRS(rs)}
              />
              {rs}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Kosongkan jika berlaku untuk semua rumah sakit.
        </p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700">
          Jenis Aturan
        </label>
        <div className="mt-1 flex gap-4">
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              checked={form.jenisAturan === "terstruktur"}
              onChange={() => setForm({ ...form, jenisAturan: "terstruktur" })}
            />
            Terstruktur (kriteria tetap)
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="radio"
              checked={form.jenisAturan === "narasi_fallback"}
              onChange={() => setForm({ ...form, jenisAturan: "narasi_fallback" })}
            />
            Narasi Fallback (AI interpretasi bebas)
          </label>
        </div>
      </div>

      {form.jenisAturan === "terstruktur" ? (
        <>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Kriteria Diagnosis (satu per baris)
            </label>
            <textarea
              className="mt-1 w-full rounded border-gray-300 p-2 font-mono text-sm"
              rows={4}
              value={form.kriteriaDiagnosis}
              onChange={(e) =>
                setForm({ ...form, kriteriaDiagnosis: e.target.value })
              }
              placeholder={"Nyeri dada khas > 20 menit\nElevasi ST pada EKG\nPeningkatan troponin"}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Syarat Tatalaksana (satu per baris)
            </label>
            <textarea
              className="mt-1 w-full rounded border-gray-300 p-2 font-mono text-sm"
              rows={3}
              value={form.syaratTatalaksana}
              onChange={(e) =>
                setForm({ ...form, syaratTatalaksana: e.target.value })
              }
              placeholder={"PCI primer dalam 90 menit\natau fibrinolitik jika PCI tidak tersedia"}
            />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">
            Narasi Ketentuan Asli
          </label>
          <textarea
            className="mt-1 w-full rounded border-gray-300 p-2 text-sm"
            rows={8}
            value={form.narasiAsli}
            onChange={(e) => setForm({ ...form, narasiAsli: e.target.value })}
            placeholder="Tempel narasi lengkap dari TKMKB/PPK/PNPK di sini..."
          />
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => handleSimpan(form.status)}
          disabled={menyimpan}
          className="rounded bg-gray-200 px-4 py-2 text-sm disabled:opacity-40"
        >
          Simpan sebagai Draft
        </button>
        <button
          onClick={() => handleSimpan("disetujui")}
          disabled={menyimpan}
          className="rounded bg-green-700 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          Simpan &amp; Setujui
        </button>
      </div>

      {pesan && <p className="mt-3 text-sm text-gray-700">{pesan}</p>}
    </div>
  );
}
