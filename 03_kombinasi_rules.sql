-- ============================================
-- SIVERA JUNIOR — Fase Lanjutan: Aturan Kombinasi Kode (Logic SIMPATIK)
-- Jalankan SETELAH 01_schema_sivera_junior.sql dan 02_rls_roles.sql
-- ============================================

-- ============================================
-- 1. Tabel kombinasi_rules
-- Berbeda dari logic_rules: aturan ini mengecek KEHADIRAN beberapa kode
-- sekaligus dalam satu kasus (bukan satu kode diagnosis tunggal), dan
-- TIDAK PERNAH butuh AI — murni pencocokan kode, sehingga instan & gratis.
-- ============================================
create table if not exists kombinasi_rules (
  id uuid primary key default uuid_generate_v4(),
  flag text not null,
  kategori text not null check (kategori in ('diagnosa_kombinasi', 'prosedur_kombinasi')),
  -- kode_trigger: array kode yang SEMUA harus hadir (AND).
  -- Item bisa berupa string tunggal ("A09") atau array kecil yang berarti
  -- OR (["I11","I13.1"] artinya salah satu dari keduanya cukup).
  -- Contoh: ["N18","I50",["I11","I13.1"]] -> harus ada N18 DAN I50 DAN (I11 ATAU I13.1)
  kode_trigger jsonb not null,
  aturan text not null,
  kategori_temuan text not null default 'sedang' check (kategori_temuan in ('kritis', 'sedang', 'ringan')),
  sumber text not null default 'Logic_BPJS',
  referensi_sumber text,
  status text not null default 'draft' check (status in ('draft', 'ditinjau', 'disetujui')),
  rumah_sakit text[],
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_kombinasi_rules_status on kombinasi_rules (status);

alter table kombinasi_rules enable row level security;

create policy "kombinasi_rules_select_authenticated" on kombinasi_rules
  for select using (auth.role() = 'authenticated');

create policy "kombinasi_rules_insert_admin_only" on kombinasi_rules
  for insert with check (public.get_user_role() = 'admin');

create policy "kombinasi_rules_update_admin_only" on kombinasi_rules
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "kombinasi_rules_delete_admin_only" on kombinasi_rules
  for delete using (public.get_user_role() = 'admin');

-- ============================================
-- 2. Tambah kolom semua_kode ke case_analyses
-- Menyimpan SELURUH kode diagnosis + prosedur dalam satu kasus (bukan cuma
-- satu kode_diagnosis utama) — dibutuhkan agar kombinasi_rules bisa dicek.
-- ============================================
alter table case_analyses add column if not exists semua_kode text[];

-- Perluas check constraint jalur_analisis agar mendukung nilai baru
alter table case_analyses drop constraint if exists case_analyses_jalur_analisis_check;
alter table case_analyses add constraint case_analyses_jalur_analisis_check
  check (jalur_analisis in ('terstruktur', 'narasi_fallback', 'kombinasi_kode', 'campuran'));

-- ============================================
-- SELESAI
-- ============================================
