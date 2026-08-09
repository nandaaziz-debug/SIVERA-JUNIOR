export interface Temuan {
  kategori: "kritis" | "sedang" | "ringan" | "informasi";
  deskripsi: string;
  referensiRuleId: string | null;
  sumber: string;
  jalur: "terstruktur" | "narasi_fallback" | "kombinasi_kode";
}

export interface LogicRule {
  id: string;
  kode_diagnosis: string;
  nama_diagnosis: string;
  sumber: string;
  jenis_aturan: "terstruktur" | "narasi_fallback";
  ketentuan: {
    kriteria_diagnosis?: string[];
    syarat_tatalaksana?: string[];
  } | null;
  narasi_asli: string | null;
  kategori_temuan_jika_dilanggar: "kritis" | "sedang" | "ringan" | null;
  referensi_sumber: string | null;
}
