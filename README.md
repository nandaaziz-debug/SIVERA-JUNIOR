# SIVERA Junior

Alat bantu kerja mandiri untuk verifikasi klaim BPJS Kesehatan, fokus pada
menu Analisis Kasus untuk RS ASM dan RS Haryanda.

Bukan pengganti SIVERA utama — ini tools ramping, tanpa RAG regulasi luas,
menggunakan Logic JSON (Logic BPJS, BA Kesepakatan, TKMKB, PPK/PNPK) sebagai
sumber aturan.

## Setup

1. Buat project Supabase baru (terpisah dari SIVERA utama)
2. Jalankan `01_schema_sivera_junior.sql` di Supabase SQL Editor
3. Copy `.env.example` menjadi `.env.local`, isi dengan kredensial Supabase
   dan API key AI
4. Deploy ke Vercel — hubungkan repo ini, isi environment variable yang sama
   di Vercel Settings

## Struktur

```
app/
├── layout.tsx, globals.css
├── (app)/page.tsx        ← dashboard (placeholder)
lib/
└── supabase/
    ├── client.ts          ← koneksi sisi browser
    └── server.ts          ← koneksi sisi server
middleware.ts              ← proteksi login otomatis
```

## Status Pengembangan

- [x] Fase 1 — Skema database
- [x] Fase 2 — Struktur project dasar
- [ ] Fase 3 — Halaman Analisis Kasus (scan gambar + masking otomatis)
- [ ] Fase 4 — Engine pengecekan Logic JSON
- [ ] Fase 5 — Halaman admin `/kelola-logic`
- [ ] Fase 6 — Autentikasi & RLS per role
