/**
 * Memanggil Gemini (multimodal) untuk membaca berkas klaim BPJS dan
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
- Baca SEMUA HALAMAN berkas, termasuk lampiran/berkas penunjang (hasil lab, rontgen,
  USG, dll) kalau ada dalam satu PDF yang sama — jangan hanya baca halaman pertama

ringkasanKlinis WAJIB LENGKAP DAN MENYELURUH (BUKAN diringkas/dipangkas), mencakup
SEMUA bagian berikut persis seperti tertulis di berkas, dengan angka/nilai lab apa
adanya (jangan dibulatkan atau dihilangkan):
1. Anamnesis / Keluhan Utama
2. Riwayat Perjalanan Penyakit (lengkap, termasuk rujukan dari mana kalau ada)
3. Pemeriksaan Fisik (tanda vital, temuan pemeriksaan)
4. Pemeriksaan Penunjang — SEMUA hasil lab/rontgen/USG/EKG dengan angka dan nilai
   rujukan persis seperti di berkas, jangan diringkas jadi "hasil lab normal" saja
5. Diagnosis Utama
6. Diagnosis Sekunder (kalau ada)
7. Tatalaksana / Terapi yang diberikan

Tulis sebagai teks terstruktur dengan penanda bagian yang jelas (boleh pakai
penomoran/label seperti contoh di atas), bukan satu paragraf naratif pendek.

Keluarkan HANYA JSON valid dengan struktur persis ini:
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diatur di environment variable");
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: mediaType, data: fileBase64 } },
              { text: "Ekstrak informasi dari berkas ini sesuai struktur JSON yang diminta." },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";

  try {
    const parsed = JSON.parse(rawText);
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
