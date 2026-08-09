/**
 * Utilitas pencocokan kode ICD, dipakai bersama oleh:
 * - check-kombinasi.ts (aturan kombinasi Logic SIMPATIK)
 * - app/api/analisis/proses/route.ts (pencarian logic_rules multi-kode)
 *
 * Mendukung tiga bentuk penulisan kode dalam SATU field:
 * - Kode persis: "I21.0"
 * - Prefix kategori: "I21" -> cocok ke I21, I21.0, I21.1, dst
 * - Rentang: "I21.0-I21.4" -> cocok ke semua kode dalam rentang itu
 * - Beberapa kode sekaligus, dipisah koma atau baris baru: "I21.0, I21.1, I21.2"
 */

export function kodeCocok(kodeAturan: string, kodeKasus: string[]): boolean {
  const kodeAturanBersih = kodeAturan.trim().toUpperCase();
  if (!kodeAturanBersih) return false;

  if (kodeAturanBersih.includes("-")) {
    const [awal, akhir] = kodeAturanBersih.split("-").map((s) => s.trim());
    return kodeKasus.some((k) => kodeDalamRentang(k.toUpperCase(), awal, akhir));
  }

  return kodeKasus.some((k) => {
    const kBersih = k.trim().toUpperCase();
    return kBersih === kodeAturanBersih || kBersih.startsWith(kodeAturanBersih + ".");
  });
}

function kodeDalamRentang(kode: string, awal: string, akhir: string): boolean {
  const parseKode = (k: string) => {
    const match = k.match(/^([A-Z]+)(\d+)/);
    if (!match) return null;
    return { huruf: match[1], angka: parseInt(match[2], 10) };
  };

  const kParsed = parseKode(kode);
  const awalParsed = parseKode(awal);
  const akhirParsed = parseKode(akhir);

  if (!kParsed || !awalParsed || !akhirParsed) return false;
  if (kParsed.huruf !== awalParsed.huruf || kParsed.huruf !== akhirParsed.huruf) {
    return false;
  }

  return kParsed.angka >= awalParsed.angka && kParsed.angka <= akhirParsed.angka;
}

/**
 * Memecah field "Kode Diagnosis" yang mungkin berisi beberapa kode
 * (dipisah koma atau baris baru) menjadi daftar kode aturan tersendiri.
 */
export function pecahDaftarKode(field: string): string[] {
  return field
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Cek apakah SATU kode kasus cocok dengan field kode_diagnosis aturan yang
 * mungkin berisi beberapa kode/prefix/rentang sekaligus.
 */
export function kodeTermasukAturan(kodeKasus: string, fieldKodeAturan: string): boolean {
  const daftarKodeAturan = pecahDaftarKode(fieldKodeAturan);
  return daftarKodeAturan.some((kodeAturan) => kodeCocok(kodeAturan, [kodeKasus]));
}
