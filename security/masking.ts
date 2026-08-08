/**
 * Lapisan keamanan wajib: menyamarkan data identitas sensitif dari hasil
 * ekstraksi AI SEBELUM teks disimpan ke database atau ditampilkan lanjut.
 *
 * Ini jaring pengaman KEDUA — instruksi prompt ke AI ("jangan sertakan NIK")
 * tidak cukup diandalkan sendirian, karena model tetap bisa saja meloloskan
 * data itu di output. Regex ini bekerja terlepas dari kepatuhan model.
 */

export interface MaskingResult {
  maskedText: string;
  maskingTerdeteksi: boolean;
  jumlahDitemukan: {
    nik: number;
    noBpjs: number;
  };
}

// NIK Indonesia: 16 digit
const NIK_PATTERN = /\b\d{16}\b/g;

// Nomor kartu BPJS Kesehatan: 13 digit
const NO_BPJS_PATTERN = /\b\d{13}\b/g;

export function maskSensitiveData(rawText: string): MaskingResult {
  let jumlahNik = 0;
  let jumlahBpjs = 0;

  let maskedText = rawText.replace(NIK_PATTERN, () => {
    jumlahNik += 1;
    return "[NIK-DIMASKING]";
  });

  maskedText = maskedText.replace(NO_BPJS_PATTERN, () => {
    jumlahBpjs += 1;
    return "[NO-BPJS-DIMASKING]";
  });

  return {
    maskedText,
    maskingTerdeteksi: jumlahNik > 0 || jumlahBpjs > 0,
    jumlahDitemukan: { nik: jumlahNik, noBpjs: jumlahBpjs },
  };
}
