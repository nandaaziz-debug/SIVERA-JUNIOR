import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkTerstruktur } from "@/lib/logic-engine/check-terstruktur";
import { checkNarasiFallback } from "@/lib/logic-engine/check-narasi-fallback";
import { cekKombinasi, KombinasiRule } from "@/lib/logic-engine/check-kombinasi";
import { hitungSkorAkurasi } from "@/lib/logic-engine/accuracy-score";
import { Temuan, LogicRule } from "@/lib/logic-engine/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const { caseId } = await request.json();
  if (!caseId) {
    return NextResponse.json({ error: "caseId wajib diisi" }, { status: 400 });
  }

  const { data: kasus, error: errKasus } = await supabase
    .from("case_analyses")
    .select("id, kode_diagnosis, teks_ekstraksi, semua_kode")
    .eq("id", caseId)
    .single();

  if (errKasus || !kasus) {
    return NextResponse.json({ error: "Kasus tidak ditemukan" }, { status: 404 });
  }

  if (!kasus.kode_diagnosis) {
    return NextResponse.json(
      { error: "Kode diagnosis belum diisi pada kasus ini" },
      { status: 400 }
    );
  }

  // Lookup LANGSUNG by kode diagnosis — bukan pencarian similarity/RAG,
  // sehingga aturan yang dipakai selalu pasti dan sama untuk kode yang sama.
  const { data: rules, error: errRules } = await supabase
    .from("logic_rules")
    .select("*")
    .eq("kode_diagnosis", kasus.kode_diagnosis)
    .eq("status", "disetujui");

  const semuaTemuan: Temuan[] = [];
  const jalurTerpakai = new Set<string>();

  if (!errRules && rules && rules.length > 0) {
    for (const rule of rules as LogicRule[]) {
      if (rule.jenis_aturan === "terstruktur") {
        const temuan = await checkTerstruktur(rule, kasus.teks_ekstraksi);
        semuaTemuan.push(...temuan);
        jalurTerpakai.add("terstruktur");
      } else {
        const temuan = await checkNarasiFallback(rule, kasus.teks_ekstraksi);
        semuaTemuan.push(...temuan);
        jalurTerpakai.add("narasi_fallback");
      }
    }
  } else {
    semuaTemuan.push({
      kategori: "informasi",
      deskripsi:
        "Belum ada aturan Logic JSON yang disetujui untuk kode diagnosis ini. Perlu ditelaah manual sepenuhnya oleh verifikator.",
      referensiRuleId: null,
      sumber: "-",
      jalur: "terstruktur",
    });
  }

  // Pengecekan kombinasi kode — TANPA AI, murni logika, jalan terlepas dari
  // apakah aturan per-diagnosis di atas ditemukan atau tidak.
  const kodeKasus = kasus.semua_kode ?? (kasus.kode_diagnosis ? [kasus.kode_diagnosis] : []);
  if (kodeKasus.length > 0) {
    const { data: kombinasiRules } = await supabase
      .from("kombinasi_rules")
      .select("*")
      .eq("status", "disetujui");

    for (const rule of (kombinasiRules ?? []) as KombinasiRule[]) {
      if (cekKombinasi(kodeKasus, rule)) {
        semuaTemuan.push({
          kategori: rule.kategori_temuan,
          deskripsi: `[${rule.flag}] ${rule.aturan}`,
          referensiRuleId: rule.id,
          sumber: rule.referensi_sumber ?? "Logic SIMPATIK",
          jalur: "kombinasi_kode",
        });
        jalurTerpakai.add("kombinasi_kode");
      }
    }
  }

  const jalurAnalisis =
    jalurTerpakai.size > 1
      ? "campuran"
      : jalurTerpakai.size === 1
        ? Array.from(jalurTerpakai)[0]
        : "terstruktur";

  const skor = hitungSkorAkurasi(semuaTemuan);

  const { error: errUpdate } = await supabase
    .from("case_analyses")
    .update({
      temuan: semuaTemuan,
      accuracy_score: skor,
      jalur_analisis: jalurAnalisis,
      updated_at: new Date().toISOString(),
    })
    .eq("id", caseId);

  if (errUpdate) {
    console.error("Gagal update hasil analisis:", errUpdate);
    return NextResponse.json(
      { error: "Gagal menyimpan hasil analisis" },
      { status: 500 }
    );
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "proses_logic_engine",
    target_table: "case_analyses",
    target_id: caseId,
    detail: { jalur_analisis: jalurAnalisis, jumlah_temuan: semuaTemuan.length },
  });

  return NextResponse.json({
    temuan: semuaTemuan,
    accuracyScore: skor,
    jalurAnalisis,
  });
}
