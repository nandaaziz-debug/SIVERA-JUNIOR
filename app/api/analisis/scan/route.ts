import { NextRequest, NextResponse } from "next/server";
import { scanResumeMedis } from "@/lib/ai/scan-resume";
import { maskSensitiveData } from "@/lib/security/masking";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60; // AI baca PDF/gambar bisa lebih dari 10 detik default

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Belum login" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("berkas") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Berkas resume medis wajib diunggah" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBase64 = Buffer.from(arrayBuffer).toString("base64");

  const mediaType = file.type as
    | "image/jpeg"
    | "image/png"
    | "image/webp"
    | "application/pdf";

  const FORMAT_DIDUKUNG = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!FORMAT_DIDUKUNG.includes(mediaType)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Gunakan JPEG, PNG, WebP, atau PDF." },
      { status: 400 }
    );
  }

  const MAKS_UKURAN = 4 * 1024 * 1024; // 4MB — batas aman di bawah limit platform Vercel (~4.5MB per request)
  if (file.size > MAKS_UKURAN) {
    return NextResponse.json(
      { error: "Ukuran berkas maksimal 4MB. Kompres PDF atau potong jadi beberapa halaman dulu." },
      { status: 400 }
    );
  }

  try {
    const hasil = await scanResumeMedis({ fileBase64, mediaType });
    const hasilMasking = maskSensitiveData(hasil.ringkasanKlinis);

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "scan_resume",
      detail: { masking_terdeteksi: hasilMasking.maskingTerdeteksi },
    });

    return NextResponse.json({
      sepNumber: hasil.sepNumber,
      kodeDiagnosisUtama: hasil.kodeDiagnosisUtama,
      kodeDiagnosisSekunder: hasil.kodeDiagnosisSekunder,
      kodeProsedur: hasil.kodeProsedur,
      teksEkstraksi: hasilMasking.maskedText,
      maskingTerdeteksi: hasilMasking.maskingTerdeteksi,
      jumlahDitemukan: hasilMasking.jumlahDitemukan,
    });
  } catch (error: any) {
    console.error("Gagal scan berkas:", error);
    return NextResponse.json(
      { error: `Gagal memproses berkas: ${error?.message ?? "coba lagi"}` },
      { status: 500 }
    );
  }
}
