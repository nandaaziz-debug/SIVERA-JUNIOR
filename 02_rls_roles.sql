-- ============================================
-- SIVERA JUNIOR — Fase 6: Autentikasi & RLS per Role
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query
-- (Jalankan SETELAH 01_schema_sivera_junior.sql)
-- ============================================

-- ============================================
-- 1. Tabel profiles — menyimpan peran tiap user
-- ============================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nama text,
  role text not null default 'verifikator' check (role in ('verifikator', 'spmpf', 'admin')),
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- ============================================
-- 2. Auto-buat profile saat user baru mendaftar (default role: verifikator)
--    Role diubah manual oleh admin lewat Supabase Table Editor jika perlu
--    (SPMPF/admin) — tidak ada halaman ubah role di aplikasi untuk fase ini.
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nama, role)
  values (new.id, new.raw_user_meta_data->>'nama', 'verifikator');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- 3. Fungsi bantu ambil role user aktif
--    security definer -> menghindari recursive RLS saat dipanggil dari
--    kebijakan tabel lain
-- ============================================
create or replace function public.get_user_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================
-- 4. Kebijakan RLS untuk tabel profiles
-- ============================================
drop policy if exists "user_read_own_profile" on profiles;
create policy "user_read_own_profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "admin_manage_profiles" on profiles;
create policy "admin_manage_profiles" on profiles
  for all
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

-- ============================================
-- 5. Hapus kebijakan placeholder Fase 1 (longgar)
-- ============================================
drop policy if exists "temp_authenticated_full_access_logic_rules" on logic_rules;
drop policy if exists "temp_authenticated_full_access_case_analyses" on case_analyses;
drop policy if exists "temp_authenticated_read_audit_log" on audit_log;
drop policy if exists "temp_authenticated_insert_audit_log" on audit_log;
drop policy if exists "temp_authenticated_read_hospitals" on hospitals;

-- ============================================
-- 6. Kebijakan baru: logic_rules
--    - Semua user login boleh MELIHAT (verifikator butuh baca sebagai
--      referensi, SPMPF butuh baca untuk audit)
--    - Hanya ADMIN yang boleh membuat/mengubah/menghapus/menyetujui aturan
-- ============================================
create policy "logic_rules_select_authenticated" on logic_rules
  for select using (auth.role() = 'authenticated');

create policy "logic_rules_insert_admin_only" on logic_rules
  for insert with check (public.get_user_role() = 'admin');

create policy "logic_rules_update_admin_only" on logic_rules
  for update
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

create policy "logic_rules_delete_admin_only" on logic_rules
  for delete using (public.get_user_role() = 'admin');

-- ============================================
-- 7. Kebijakan baru: case_analyses
--    - Verifikator: CRUD hanya kasus miliknya sendiri
--    - SPMPF: hanya boleh MELIHAT semua kasus (audit sampling)
--    - Admin: akses penuh
-- ============================================
create policy "case_analyses_select_own_or_privileged" on case_analyses
  for select using (
    created_by = auth.uid()
    or public.get_user_role() in ('spmpf', 'admin')
  );

create policy "case_analyses_insert_own" on case_analyses
  for insert with check (created_by = auth.uid());

create policy "case_analyses_update_own_or_admin" on case_analyses
  for update
  using (created_by = auth.uid() or public.get_user_role() = 'admin')
  with check (created_by = auth.uid() or public.get_user_role() = 'admin');

-- ============================================
-- 8. Kebijakan baru: audit_log
--    - Setiap user hanya boleh menulis log atas namanya sendiri
--    - Hanya admin & SPMPF yang boleh membaca log (keperluan audit)
-- ============================================
create policy "audit_log_insert_self" on audit_log
  for insert with check (user_id = auth.uid());

create policy "audit_log_select_privileged" on audit_log
  for select using (public.get_user_role() in ('admin', 'spmpf'));

-- ============================================
-- 9. Kebijakan baru: hospitals (tetap terbuka untuk semua yang login)
-- ============================================
create policy "hospitals_select_authenticated" on hospitals
  for select using (auth.role() = 'authenticated');

-- ============================================
-- SELESAI FASE 6
-- Setelah dijalankan, buat user pertama Anda (role default: verifikator)
-- lewat Supabase Dashboard > Authentication > Add User, lalu ubah role-nya
-- jadi 'admin' manual lewat Table Editor > profiles > kolom role.
-- ============================================
