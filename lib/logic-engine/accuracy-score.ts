import { Temuan } from "./types";

const BOBOT: Record<string, number> = {
  kritis: 20,
  sedang: 8,
  ringan: 3,
  informasi: 0, // catatan informatif tidak mengurangi skor
};

export function hitungSkorAkurasi(temuan: Temuan[]): number {
  const pengurangan = temuan.reduce(
    (total, t) => total + (BOBOT[t.kategori] ?? 0),
    0
  );
  return Math.max(0, 100 - pengurangan);
}
