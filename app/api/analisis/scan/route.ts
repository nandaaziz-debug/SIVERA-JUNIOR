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
  const file = formData.get("gambar") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Gambar resume medis wajib diunggah" },
      { status: 400 }
    );
  }

  // Catatan penting: gambar HANYA diproses di memori (request ini), TIDAK
  // pernah ditulis ke Supabase Storage atau disk. Setelah response
  // dikembalikan, buffer gambar dibuang oleh runtime — mengurangi risiko
  // kebocoran dibanding menyimpan gambar mentah secara permanen.
  const arrayBuffer = await file.arrayBuffer();
  const imageBase64 = Buffer.from(arrayBuffer).toString("base64");

  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) {
    return NextResponse.json(
      { error: "Format gambar tidak didukung. Gunakan JPEG, PNG, atau WebP." },
      { status: 400 }
    );
  }

  try {
    const teksAsli = await scanResumeMedis({ imageBase64, mediaType });
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
    console.error("Gagal scan resume:", error);
    return NextResponse.json(
      { error: "Gagal memproses gambar. Coba lagi." },
      { status: 500 }
    );
  }
}
