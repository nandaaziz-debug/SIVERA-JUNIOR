import LogicRuleForm from "@/components/logic-rule-form";

export default function TambahLogicRulePage() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="rounded-xl bg-white p-6 text-gray-900">
      <h1 className="text-2xl font-semibold text-primary">Tambah Aturan Baru</h1>
      <p className="mt-1 text-sm text-gray-500">
        Aturan tersimpan sebagai draft hingga disetujui — tidak langsung
        dipakai mesin analisis sebelum status "disetujui".
      </p>
      <div className="mt-6">
        <LogicRuleForm />
      </div>
      </div>
    </main>
  );
}
