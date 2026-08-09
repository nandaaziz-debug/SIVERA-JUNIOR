import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const body = await request.json();
  const { hospitalId, sepNumber, kodeDiagnosis, semuaKode, teksEkstraksi, maskingTerdeteksi } = body;

  if (!hospitalId || !teksEkstraksi) {
    return NextResponse.json(
      { error: "Rumah sakit dan teks ekstraksi wajib diisi" },
      { status: 400 }
    );
  }

  // Catatan: kolom `temuan`, `accuracy_score`, dan `jalur_analisis` masih
  // kosong di sini — akan diisi oleh engine Logic JSON yang dibangun di
  // Fase 4. Untuk sekarang, kasus tersimpan berstatus "menunggu".
  const { data, error } = await supabase
    .from("case_analyses")
    .insert({
      hospital_id: hospitalId,
      sep_number: sepNumber ?? null,
      kode_diagnosis: kodeDiagnosis ?? null,
      semua_kode: semuaKode ?? null,
      teks_ekstraksi: teksEkstraksi,
      masking_terdeteksi: maskingTerdeteksi ?? false,
      status_review: "menunggu",
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Gagal simpan kasus:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan kasus" },
      { status: 500 }
    );
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "simpan_kasus",
    target_table: "case_analyses",
    target_id: data.id,
  });

  return NextResponse.json({ success: true, caseId: data.id });
}
