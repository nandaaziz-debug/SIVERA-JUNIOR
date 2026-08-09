/**
 * Berbeda dari check-terstruktur.ts dan check-narasi-fallback.ts, engine ini
 * TIDAK memanggil AI sama sekali. Aturan Logic SIMPATIK sifatnya "kalau kode
 * X hadir bersamaan dengan kode Y di satu kasus, maka Z" — ini murni
 * pencocokan string/pola kode, sehingga instan, gratis, dan 100% konsisten
 * setiap kali dijalankan (tidak ada variasi hasil sama sekali).
 */

export type KodeTriggerItem = string | string[];

export interface KombinasiRule {
  id: string;
  flag: string;
  kategori: "diagnosa_kombinasi" | "prosedur_kombinasi";
  kode_trigger: KodeTriggerItem[];
  aturan: string;
  kategori_temuan: "kritis" | "sedang" | "ringan";
  referensi_sumber: string | null;
}

/**
 * Mencocokkan satu kode aturan terhadap daftar kode kasus.
 * Mendukung tiga bentuk penulisan kode:
 * - Kode persis: "A09" -> cocok dengan "A09" atau "A09.1" (prefix)
 * - Rentang kategori: "N20-N23" -> cocok dengan N20, N21, N22, N23, dan sub-kodenya
 */
function kodeCocok(kodeAturan: string, kodeKasus: string[]): boolean {
  const kodeAturanBersih = kodeAturan.trim().toUpperCase();

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
 * Satu rule cocok jika SEMUA item di kode_trigger terpenuhi (AND).
 * Item berupa array kecil berarti OR (salah satu dari daftar itu cukup).
 */
export function cekKombinasi(kodeKasus: string[], rule: KombinasiRule): boolean {
  return rule.kode_trigger.every((item) => {
    if (Array.isArray(item)) {
      return item.some((k) => kodeCocok(k, kodeKasus));
    }
    return kodeCocok(item, kodeKasus);
  });
}
