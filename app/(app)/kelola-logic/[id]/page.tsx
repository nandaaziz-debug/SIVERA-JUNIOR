"use client";

import { useEffect, useState } from "react";
import LogicRuleForm, { LogicRuleFormData } from "@/components/logic-rule-form";

export default function EditLogicRulePage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<LogicRuleFormData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/logic-rules/${params.id}`)
      .then((r) => r.json())
      .then((res) => {
        const d = res.data;
        if (!d) return;
        setData({
          id: d.id,
          kodeDiagnosis: d.kode_diagnosis,
          namaDiagnosis: d.nama_diagnosis,
          sumber: d.sumber,
          jenisAturan: d.jenis_aturan,
          kriteriaDiagnosis: (d.ketentuan?.kriteria_diagnosis ?? []).join("\n"),
          syaratTatalaksana: (d.ketentuan?.syarat_tatalaksana ?? []).join("\n"),
          narasiAsli: d.narasi_asli ?? "",
          kategoriTemuan: d.kategori_temuan_jika_dilanggar ?? "sedang",
          referensiSumber: d.referensi_sumber ?? "",
          rumahSakit: d.rumah_sakit ?? [],
          status: d.status,
        });
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <main className="p-8">Memuat...</main>;
  if (!data) return <main className="p-8">Aturan tidak ditemukan.</main>;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-xl bg-white p-6 text-gray-900">
      <h1 className="text-2xl font-semibold text-primary">
        Edit Aturan — {data.kodeDiagnosis}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Status saat ini:{" "}
        <span className="font-medium">{data.status}</span>
      </p>
      <div className="mt-6">
        <LogicRuleForm initialData={data} />
      </div>
      </div>
    </main>
  );
}
