/**
 * Berbeda dari check-terstruktur.ts dan check-narasi-fallback.ts, engine ini
 * TIDAK memanggil AI sama sekali. Aturan Logic SIMPATIK sifatnya "kalau kode
 * X hadir bersamaan dengan kode Y di satu kasus, maka Z" — ini murni
 * pencocokan string/pola kode, sehingga instan, gratis, dan 100% konsisten
 * setiap kali dijalankan (tidak ada variasi hasil sama sekali).
 */

import { kodeCocok } from "./kode-utils";

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
