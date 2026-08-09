import { callClaudeJSON } from "@/lib/ai/call-claude-json";
import { LogicRule, Temuan } from "./types";

/**
 * Berbeda dengan RAG bebas, di sini aturan SUDAH DITEMUKAN secara pasti
 * (lookup langsung by kode_diagnosis, bukan pencarian similarity). AI hanya
 * diminta menilai apakah tiap kriteria yang SUDAH TETAP itu terpenuhi di
 * teks kasus — bukan mencari sendiri aturan mana yang relevan. Ini yang
 * membuat jalur ini jauh lebih konsisten dibanding RAG.
 */
export async function checkTerstruktur(
  rule: LogicRule,
  teksKasus: string
): Promise<Temuan[]> {
  const kriteria = rule.ketentuan?.kriteria_diagnosis ?? [];
  const syarat = rule.ketentuan?.syarat_tatalaksana ?? [];

  if (kriteria.length === 0 && syarat.length === 0) {
    return [];
  }

  const hasil = await callClaudeJSON({
    system: `Anda menilai apakah fakta dalam teks kasus klinis memenuhi daftar
kriteria/syarat yang SUDAH DITETAPKAN (bukan mencari aturan sendiri).
Untuk tiap item kriteria/syarat, tentukan apakah "terpenuhi", "tidak_terpenuhi",
atau "tidak_disebutkan" di teks kasus. Jangan menilai di luar daftar yang diberikan.

Format output JSON:
{
  "penilaian_kriteria": [{"item": "...", "status": "terpenuhi|tidak_terpenuhi|tidak_disebutkan", "alasan": "..."}],
  "penilaian_syarat": [{"item": "...", "status": "terpenuhi|tidak_terpenuhi|tidak_disebutkan", "alasan": "..."}]
}`,
    userMessage: `Diagnosis: ${rule.nama_diagnosis} (${rule.kode_diagnosis})

Daftar kriteria diagnosis yang harus dinilai:
${kriteria.map((k, i) => `${i + 1}. ${k}`).join("\n") || "(tidak ada)"}

Daftar syarat tatalaksana yang harus dinilai:
${syarat.map((s, i) => `${i + 1}. ${s}`).join("\n") || "(tidak ada)"}

Teks kasus (hasil ekstraksi resume medis, identitas sudah disamarkan):
"""
${teksKasus}
"""`,
  });

  const temuan: Temuan[] = [];
  const kategori = rule.kategori_temuan_jika_dilanggar ?? "sedang";

  const semuaPenilaian = [
    ...(hasil.penilaian_kriteria ?? []),
    ...(hasil.penilaian_syarat ?? []),
  ];

  for (const p of semuaPenilaian) {
    if (p.status === "tidak_terpenuhi" || p.status === "tidak_disebutkan") {
      temuan.push({
        kategori,
        deskripsi: `${p.item} — ${p.alasan}`,
        referensiRuleId: rule.id,
        sumber: rule.referensi_sumber ?? rule.sumber,
        jalur: "terstruktur",
      });
    }
  }

  return temuan;
}
