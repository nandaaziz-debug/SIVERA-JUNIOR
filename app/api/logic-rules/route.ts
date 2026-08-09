import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);

  const sumber = searchParams.get("sumber");
  const status = searchParams.get("status");
  const jenisAturan = searchParams.get("jenisAturan");
  const cari = searchParams.get("cari");

  let query = supabase
    .from("logic_rules")
    .select("*")
    .order("updated_at", { ascending: false });

  if (sumber) query = query.eq("sumber", sumber);
  if (status) query = query.eq("status", status);
  if (jenisAturan) query = query.eq("jenis_aturan", jenisAturan);
  if (cari) {
    query = query.or(
      `kode_diagnosis.ilike.%${cari}%,nama_diagnosis.ilike.%${cari}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const body = await request.json();

  const { data, error } = await supabase
    .from("logic_rules")
    .insert({
      kode_diagnosis: body.kodeDiagnosis,
      nama_diagnosis: body.namaDiagnosis,
      sumber: body.sumber,
      jenis_aturan: body.jenisAturan,
      ketentuan: body.jenisAturan === "terstruktur" ? body.ketentuan : null,
      narasi_asli: body.jenisAturan === "narasi_fallback" ? body.narasiAsli : null,
      kategori_temuan_jika_dilanggar: body.kategoriTemuan,
      referensi_sumber: body.referensiSumber,
      rumah_sakit: body.rumahSakit ?? [],
      status: "draft",
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("audit_log").insert({
    user_id: user.id,
    action: "buat_logic_rule",
    target_table: "logic_rules",
    target_id: data.id,
  });

  return NextResponse.json({ data });
}
