import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Mode ringkasan singkat, dipakai dashboard
  if (searchParams.get("ringkasan")) {
    const { count: totalKasus } = await supabase
      .from("case_analyses")
      .select("*", { count: "exact", head: true });

    const { count: menunggu } = await supabase
      .from("case_analyses")
      .select("*", { count: "exact", head: true })
      .eq("status_review", "menunggu");

    return NextResponse.json({ totalKasus: totalKasus ?? 0, menunggu: menunggu ?? 0 });
  }

  const cari = searchParams.get("cari");
  const hospitalId = searchParams.get("hospitalId");
  const status = searchParams.get("status");

  let query = supabase
    .from("case_analyses")
    .select("id, sep_number, kode_diagnosis, accuracy_score, status_review, jalur_analisis, created_at, hospitals(nama)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (hospitalId) query = query.eq("hospital_id", hospitalId);
  if (status) query = query.eq("status_review", status);
  if (cari) {
    query = query.or(
      `sep_number.ilike.%${cari}%,kode_diagnosis.ilike.%${cari}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
