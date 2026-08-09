import { NextRequest, NextResponse } from "next/server";
import { scanResumeMedis } from "@/lib/ai/scan-resume";
import { maskSensitiveData } from "@/lib/security/masking";
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

  const formData = await request.formData();
  const file = formData.get("berkas") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Berkas resume medis wajib diunggah" },
      { status: 400 }
    );
  }

  // Catatan penting: berkas HANYA diproses di memori (request ini), TIDAK
  // pernah ditulis ke Supabase Storage atau disk. Setelah response
  // dikembalikan, buffer dibuang oleh runtime — mengurangi risiko kebocoran
  // dibanding menyimpan berkas mentah secara permanen.
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

  const MAKS_UKURAN = 15 * 1024 * 1024; // 15MB
  if (file.size > MAKS_UKURAN) {
    return NextResponse.json(
      { error: "Ukuran berkas maksimal 15MB." },
      { status: 400 }
    );
  }

  try {
    const teksAsli = await scanResumeMedis({ fileBase64, mediaType });
    const hasilMasking = maskSensitiveData(teksAsli);

    await supabase.from("audit_log").insert({
      user_id: user.id,
      action: "scan_resume",
      detail: { masking_terdeteksi: hasilMasking.maskingTerdeteksi },
    });

    return NextResponse.json({
      teksEkstraksi: hasilMasking.maskedText,
      maskingTerdeteksi: hasilMasking.maskingTerdeteksi,
      jumlahDitemukan: hasilMasking.jumlahDitemukan,
    });
  } catch (error) {
    console.error("Gagal scan berkas:", error);
    return NextResponse.json(
      { error: "Gagal memproses berkas. Coba lagi." },
      { status: 500 }
    );
  }
}
