/**
 * Memanggil Claude (vision/PDF) untuk membaca berkas klaim BPJS dan
 * mengekstrak field terstruktur (No. SEP, kode diagnosis, kode prosedur)
 * plus ringkasan klinis naratif. NIK/nomor peserta TIDAK diminta disertakan
 * di field apa pun oleh model — tapi ini hanya lapisan pertama. Lapisan
 * kedua (wajib) ada di lib/security/masking.ts, dijalankan setelah fungsi
 * ini mengembalikan hasil.
 */

const SYSTEM_PROMPT = `Anda membantu mengekstrak informasi dari berkas klaim BPJS Kesehatan
(resume medis, lembar SEP, atau ringkasan klaim RS) untuk keperluan verifikasi.

ATURAN WAJIB:
- JANGAN sertakan nama lengkap pasien, NIK, atau nomor BPJS/nomor peserta di field apa pun
- Ambil kode-kode SEPERSIS mungkin seperti tertulis di berkas (kode ICD-10 diagnosis,
  kode ICD-9-CM prosedur, nomor SEP) — ini krusial karena kode yang salah baca bisa
  fatal untuk verifikasi
- Jika suatu field tidak ditemukan di berkas, isi dengan null atau array kosong,
  JANGAN mengarang
- ringkasanKlinis: ringkasan naratif singkat kondisi klinis (keluhan, hasil penunjang,
  tindakan) — TANPA nama pasien/NIK/nomor peserta

Keluarkan HANYA JSON valid dengan struktur persis ini, tanpa teks lain:
{
  "sepNumber": "..." atau null,
  "kodeDiagnosisUtama": "..." atau null,
  "kodeDiagnosisSekunder": ["...", "..."],
  "kodeProsedur": ["...", "..."],
  "ringkasanKlinis": "..."
}`;

interface ScanResumeParams {
  fileBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
}

export interface HasilEkstraksi {
  sepNumber: string | null;
  kodeDiagnosisUtama: string | null;
  kodeDiagnosisSekunder: string[];
  kodeProsedur: string[];
  ringkasanKlinis: string;
}

export async function scanResumeMedis({
  fileBase64,
  mediaType,
}: ScanResumeParams): Promise<HasilEkstraksi> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY belum diatur di environment variable");
  }

  const isPdf = mediaType === "application/pdf";

  const fileBlock = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: mediaType, data: fileBase64 },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: fileBase64 },
      };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  // Header beta wajib untuk model membaca ISI PDF (bukan hanya render halaman
  // pertama sebagai gambar) — tanpa ini, request PDF bisa ditolak API.
  if (isPdf) {
    headers["anthropic-beta"] = "pdfs-2024-09-25";
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: `${SYSTEM_PROMPT}\n\nPENTING: keluarkan HANYA JSON, tanpa markdown code fence, tanpa teks pembuka/penutup.`,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: "Ekstrak informasi dari berkas ini sesuai struktur JSON yang diminta.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block: any) => block.type === "text");
  const rawText: string = textBlock?.text ?? "{}";
  const clean = rawText.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    return {
      sepNumber: parsed.sepNumber ?? null,
      kodeDiagnosisUtama: parsed.kodeDiagnosisUtama ?? null,
      kodeDiagnosisSekunder: parsed.kodeDiagnosisSekunder ?? [],
      kodeProsedur: parsed.kodeProsedur ?? [],
      ringkasanKlinis: parsed.ringkasanKlinis ?? "",
    };
  } catch {
    // Fallback: kalau AI tidak taat format JSON, tetap kembalikan teks
    // mentahnya sebagai ringkasan supaya verifikator masih bisa lihat &
    // isi manual, daripada gagal total.
    return {
      sepNumber: null,
      kodeDiagnosisUtama: null,
      kodeDiagnosisSekunder: [],
      kodeProsedur: [],
      ringkasanKlinis: rawText,
    };
  }
}
