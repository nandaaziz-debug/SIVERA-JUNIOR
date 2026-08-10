import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaudeJSON } from "@/lib/ai/call-claude-json";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Endpoint ini HANYA membuat draft — tidak pernah menyimpan langsung ke
 * logic_rules dengan status "disetujui". Verifikator/admin wajib meninjau
 * dan mengoreksi field per field lewat form sebelum disimpan (lihat
 * app/(app)/kelola-logic/baru/page.tsx yang memakai hasil draft ini).
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya admin yang bisa mengimpor aturan baru" },
      { status: 403 }
    );
  }

  const { narasi, sumber } = await request.json();

  if (!narasi || narasi.trim().length < 20) {
    return NextResponse.json(
      { error: "Narasi terlalu pendek atau kosong" },
      { status: 400 }
    );
  }

  try {
    const hasil = await callClaudeJSON({
      system: `Anda membantu merekap narasi regulasi medis (TKMKB/PPK/PNPK) menjadi
draft data terstruktur untuk sistem verifikasi klaim BPJS.

Baca narasi yang diberikan, lalu identifikasi SATU diagnosis utama yang
dibahas di dalamnya. Tentukan:
- kode_diagnosis: kode ICD-10 jika disebutkan di narasi, atau null jika tidak ada
- nama_diagnosis: nama diagnosis
- kriteria_diagnosis: daftar kriteria yang harus dipenuhi untuk menegakkan diagnosis ini (array string singkat)
- syarat_tatalaksana: daftar syarat tindakan/terapi yang harus dipenuhi (array string singkat)
- kategori_temuan_disarankan: "kritis", "sedang", atau "ringan" — seberapa berat jika ketentuan ini dilanggar
- bisa_disederhanakan: true jika kriteria di atas cukup jelas dan tetap (terstruktur),
  false jika narasi terlalu kontekstual/bertingkat untuk disederhanakan jadi daftar kriteria tetap
- alasan_jika_tidak_bisa: penjelasan singkat kalau bisa_disederhanakan = false

Jika ragu antara terstruktur atau tidak, pilih false (lebih aman diserahkan
ke penilaian manual/narasi fallback daripada dipaksakan jadi kriteria yang
mungkin salah).

Format output JSON:
{
  "kode_diagnosis": "...",
  "nama_diagnosis": "...",
  "kriteria_diagnosis": ["...", "..."],
  "syarat_tatalaksana": ["...", "..."],
  "kategori_temuan_disarankan": "kritis|sedang|ringan",
  "bisa_disederhanakan": true,
  "alasan_jika_tidak_bisa": ""
}`,
      userMessage: `Sumber dokumen: ${sumber ?? "TKMKB"}

Narasi:
"""
${narasi}
"""`,
    });

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "import_narasi_logic_rule",
      detail: { sumber, kode_diagnosis: hasil.kode_diagnosis },
    });

    return NextResponse.json({ draft: hasil });
  } catch (error: any) {
    console.error("Gagal import narasi:", error);
    return NextResponse.json(
      { error: `Gagal membuat draft: ${error?.message ?? "coba lagi"}` },
      { status: 500 }
    );
  }
}
