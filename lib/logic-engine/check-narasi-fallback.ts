import { callClaudeJSON } from "@/lib/ai/call-claude-json";
import { LogicRule, Temuan } from "./types";

export async function checkNarasiFallback(
  rule: LogicRule,
  teksKasus: string
): Promise<Temuan[]> {
  if (!rule.narasi_asli) return [];

  const hasil = await callClaudeJSON({
    system: `Anda menilai kesesuaian kasus klinis terhadap ketentuan regulasi
yang ditulis dalam bentuk narasi (bukan kriteria tetap terstruktur).
Gunakan pemahaman bahasa untuk menilai, dan jelaskan alasannya.
Bersikap konservatif — kalau ragu, kategorikan sebagai "sedang" bukan "kritis",
dan sebutkan bahwa perlu ditinjau manual oleh verifikator.

Format output JSON:
{
  "temuan": [
    {"kategori": "kritis|sedang|ringan", "deskripsi": "..."}
  ]
}
Jika tidak ada temuan, kembalikan array kosong.`,
    userMessage: `Diagnosis: ${rule.nama_diagnosis} (${rule.kode_diagnosis})
Sumber regulasi: ${rule.sumber} — ${rule.referensi_sumber ?? ""}

Narasi ketentuan asli:
"""
${rule.narasi_asli}
"""

Teks kasus (hasil ekstraksi resume medis, identitas sudah disamarkan):
"""
${teksKasus}
"""`,
  });

  return (hasil.temuan ?? []).map((t: any) => ({
    kategori: t.kategori,
    deskripsi: `🔶 [Interpretasi AI, perlu tinjauan manual] ${t.deskripsi}`,
    referensiRuleId: rule.id,
    sumber: rule.referensi_sumber ?? rule.sumber,
    jalur: "narasi_fallback" as const,
  }));
}
