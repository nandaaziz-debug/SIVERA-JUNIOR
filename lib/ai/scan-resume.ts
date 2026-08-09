/**
 * Memanggil Claude (vision) untuk membaca gambar resume medis dan
 * mengekstrak teks klinis relevan. Model TIDAK diminta menyimpan/menyertakan
 * NIK atau nomor BPJS di ringkasannya — tapi ini hanya lapisan pertama.
 * Lapisan kedua (wajib) ada di lib/security/masking.ts, dijalankan setelah
 * fungsi ini mengembalikan hasil.
 */

const SYSTEM_PROMPT = `Anda membantu mengekstrak informasi klinis dari gambar resume medis
untuk keperluan verifikasi klaim BPJS Kesehatan.

ATURAN WAJIB:
- JANGAN sertakan nama lengkap pasien, NIK, atau nomor BPJS dalam hasil ekstraksi
- Fokus hanya pada: diagnosis (kode ICD jika terbaca), keluhan utama, hasil
  pemeriksaan penunjang, tindakan/terapi yang diberikan, dan ringkasan klinis lain
  yang relevan untuk verifikasi klaim
- Jika tulisan tidak terbaca jelas, tulis "[tidak terbaca]" pada bagian itu,
  jangan mengarang isi

Keluarkan hasil sebagai teks naratif terstruktur, bukan JSON.`;

interface ScanResumeParams {
  fileBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
}

export async function scanResumeMedis({
  fileBase64,
  mediaType,
}: ScanResumeParams): Promise<string> {
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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: "Ekstrak informasi klinis dari resume medis pada berkas ini sesuai aturan yang diberikan.",
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
  return textBlock?.text ?? "";
}
