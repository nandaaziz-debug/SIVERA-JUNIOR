import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("logic_rules")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const body = await request.json();

  const updatePayload: Record<string, any> = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  // Hanya update field yang dikirim — mendukung dua jenis pemanggilan:
  // (1) simpan form lengkap, (2) hanya ubah status (mis. draft -> disetujui)
  if (body.kodeDiagnosis !== undefined) updatePayload.kode_diagnosis = body.kodeDiagnosis;
  if (body.namaDiagnosis !== undefined) updatePayload.nama_diagnosis = body.namaDiagnosis;
  if (body.sumber !== undefined) updatePayload.sumber = body.sumber;
  if (body.jenisAturan !== undefined) updatePayload.jenis_aturan = body.jenisAturan;
  if (body.ketentuan !== undefined) updatePayload.ketentuan = body.ketentuan;
  if (body.narasiAsli !== undefined) updatePayload.narasi_asli = body.narasiAsli;
  if (body.kategoriTemuan !== undefined)
    updatePayload.kategori_temuan_jika_dilanggar = body.kategoriTemuan;
  if (body.referensiSumber !== undefined)
    updatePayload.referensi_sumber = body.referensiSumber;
  if (body.rumahSakit !== undefined) updatePayload.rumah_sakit = body.rumahSakit;
  if (body.status !== undefined) updatePayload.status = body.status;
  if (body.catatanReviewer !== undefined)
    updatePayload.catatan_reviewer = body.catatanReviewer;

  const { data, error } = await supabase
    .from("logic_rules")
    .update(updatePayload)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: body.status ? `ubah_status_logic_rule:${body.status}` : "edit_logic_rule",
    target_table: "logic_rules",
    target_id: params.id,
  });

  return NextResponse.json({ data });
}
