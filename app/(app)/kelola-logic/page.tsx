"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LogicRuleRow {
  id: string;
  kode_diagnosis: string;
  nama_diagnosis: string;
  sumber: string;
  jenis_aturan: string;
  status: string;
}

const BADGE_STATUS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  ditinjau: "bg-amber-100 text-amber-800",
  disetujui: "bg-green-100 text-green-800",
};

export default function KelolaLogicPage() {
  const [data, setData] = useState<LogicRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSumber, setFilterSumber] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [cari, setCari] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filterSumber) params.set("sumber", filterSumber);
    if (filterStatus) params.set("status", filterStatus);
    if (cari) params.set("cari", cari);

    setLoading(true);
    fetch(`/api/logic-rules?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => setData(res.data ?? []))
      .finally(() => setLoading(false));
  }, [filterSumber, filterStatus, cari]);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-primary">Kelola Logic JSON</h1>
        <div className="flex gap-2">
          <Link
            href="/kelola-logic/impor"
            className="rounded bg-gray-200 px-4 py-2 text-sm text-gray-800"
          >
            Import dari Narasi
          </Link>
          <Link
            href="/kelola-logic/baru"
            className="rounded bg-primary px-4 py-2 text-sm text-white"
          >
            + Tambah Aturan Baru
          </Link>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <input
          className="rounded border-gray-300 p-2 text-sm"
          placeholder="Cari kode/nama diagnosis..."
          value={cari}
          onChange={(e) => setCari(e.target.value)}
        />
        <select
          className="rounded border-gray-300 p-2 text-sm"
          value={filterSumber}
          onChange={(e) => setFilterSumber(e.target.value)}
        >
          <option value="">Semua Sumber</option>
          <option value="Logic_BPJS">Logic_BPJS</option>
          <option value="BA_Kesepakatan">BA_Kesepakatan</option>
          <option value="TKMKB">TKMKB</option>
          <option value="PPK">PPK</option>
          <option value="PNPK">PNPK</option>
        </select>
        <select
          className="rounded border-gray-300 p-2 text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Semua Status</option>
          <option value="draft">Draft</option>
          <option value="ditinjau">Ditinjau</option>
          <option value="disetujui">Disetujui</option>
        </select>
      </div>

      <div className="mt-4 overflow-hidden rounded border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="p-3">Kode</th>
              <th className="p-3">Nama Diagnosis</th>
              <th className="p-3">Sumber</th>
              <th className="p-3">Jenis</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-400">
                  Memuat...
                </td>
              </tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-400">
                  Belum ada aturan.
                </td>
              </tr>
            )}
            {data.map((row) => (
              <tr key={row.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <Link
                    href={`/kelola-logic/${row.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.kode_diagnosis}
                  </Link>
                </td>
                <td className="p-3">{row.nama_diagnosis}</td>
                <td className="p-3 text-gray-500">{row.sumber}</td>
                <td className="p-3 text-gray-500">{row.jenis_aturan}</td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE_STATUS[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
