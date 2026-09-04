-- Liece - shared cloud storage schema
--
-- Jalankan sekali di Supabase Studio -> SQL Editor (atau `psql` dengan role postgres).
-- Script ini idempotent: aman dijalankan ulang.
--
-- Model akses: satu dataset bersama (satu toko). Hanya akun yang terdaftar di
-- public.members boleh membaca/menulis. Akun pertama yang mendaftar otomatis
-- menjadi 'owner'; akun berikutnya harus ditambahkan manual oleh owner.

-- gen_random_uuid() sudah built-in sejak Postgres 13, tidak perlu extension.

-- ---------------------------------------------------------------------------
-- 1. Daftar anggota (allowlist)
-- ---------------------------------------------------------------------------

create table if not exists public.members (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  role       text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- security definer: kebijakan RLS tabel lain memanggil fungsi ini, jadi ia harus
-- bisa membaca public.members tanpa terkena RLS tabel itu sendiri.
create or replace function public.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m where m.user_id = (select auth.uid())
  );
$$;

-- Akun pertama yang dibuat menjadi owner. Akun selanjutnya tidak dapat akses
-- sampai owner menambahkannya ke public.members.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Kunci transaksi agar dua pendaftaran bersamaan tidak sama-sama jadi owner.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('liece_members_bootstrap'));

  if not exists (select 1 from public.members) then
    insert into public.members (user_id, email, role)
    values (new.id, new.email, 'owner');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. Produk
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) > 0),
  stock       integer not null default 0 check (stock >= 0),
  price       bigint not null default 0 check (price >= 0),
  modal_price bigint not null default 0 check (modal_price >= 0),
  exp         text check (exp ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists products_name_idx on public.products (lower(name));

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Transaksi penjualan
--
-- product_name / unit_price / unit_cost adalah snapshot saat penjualan terjadi,
-- sehingga laporan & profit tidak berubah ketika produk diedit atau dihapus.
-- ---------------------------------------------------------------------------

create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid references public.products (id) on delete set null,
  product_name text not null,
  occurred_on  date not null default current_date,
  quantity     integer not null check (quantity > 0),
  unit_price   bigint not null check (unit_price >= 0),
  unit_cost    bigint not null check (unit_cost >= 0),
  total        bigint generated always as (quantity::bigint * unit_price) stored,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null
);

create index if not exists transactions_occurred_on_idx on public.transactions (occurred_on desc);
create index if not exists transactions_product_id_idx on public.transactions (product_id);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.members enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;

drop policy if exists members_select_self on public.members;
create policy members_select_self on public.members
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists products_select_members on public.products;
create policy products_select_members on public.products
  for select to authenticated
  using (public.is_member());

drop policy if exists products_insert_members on public.products;
create policy products_insert_members on public.products
  for insert to authenticated
  with check (public.is_member());

drop policy if exists products_update_members on public.products;
create policy products_update_members on public.products
  for update to authenticated
  using (public.is_member())
  with check (public.is_member());

drop policy if exists products_delete_members on public.products;
create policy products_delete_members on public.products
  for delete to authenticated
  using (public.is_member());

drop policy if exists transactions_select_members on public.transactions;
create policy transactions_select_members on public.transactions
  for select to authenticated
  using (public.is_member());

drop policy if exists transactions_insert_members on public.transactions;
create policy transactions_insert_members on public.transactions
  for insert to authenticated
  with check (public.is_member());

drop policy if exists transactions_update_members on public.transactions;
create policy transactions_update_members on public.transactions
  for update to authenticated
  using (public.is_member())
  with check (public.is_member());

drop policy if exists transactions_delete_members on public.transactions;
create policy transactions_delete_members on public.transactions
  for delete to authenticated
  using (public.is_member());

-- ---------------------------------------------------------------------------
-- 5. RPC: operasi stok harus atomik (banyak device menulis bersamaan)
-- ---------------------------------------------------------------------------

create or replace function public.record_sale(
  p_product_id uuid,
  p_quantity integer,
  p_occurred_on date default current_date
)
returns public.transactions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product public.products;
  v_row public.transactions;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Jumlah harus lebih dari 0' using errcode = '22023';
  end if;

  -- Lock baris produk: mencegah dua device menjual stok terakhir yang sama.
  select * into v_product from public.products where id = p_product_id for update;

  if not found then
    raise exception 'Produk tidak ditemukan' using errcode = 'P0002';
  end if;

  if v_product.stock < p_quantity then
    raise exception 'Stok % tidak cukup (tersisa %)', v_product.name, v_product.stock
      using errcode = '23514';
  end if;

  update public.products
     set stock = stock - p_quantity
   where id = p_product_id;

  insert into public.transactions (
    product_id, product_name, occurred_on, quantity, unit_price, unit_cost, created_by
  )
  values (
    p_product_id,
    v_product.name,
    coalesce(p_occurred_on, current_date),
    p_quantity,
    v_product.price,
    v_product.modal_price,
    (select auth.uid())
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.delete_transaction(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_tx public.transactions;
begin
  select * into v_tx from public.transactions where id = p_id for update;

  if not found then
    raise exception 'Transaksi tidak ditemukan' using errcode = 'P0002';
  end if;

  if v_tx.product_id is not null then
    update public.products
       set stock = stock + v_tx.quantity
     where id = v_tx.product_id;
  end if;

  delete from public.transactions where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Privileges
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

revoke all on public.members from anon;
revoke all on public.products from anon;
revoke all on public.transactions from anon;

grant select on public.members to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;

revoke execute on function public.is_member() from public;
revoke execute on function public.record_sale(uuid, integer, date) from public;
revoke execute on function public.delete_transaction(uuid) from public;

grant execute on function public.is_member() to authenticated;
grant execute on function public.record_sale(uuid, integer, date) to authenticated;
grant execute on function public.delete_transaction(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Realtime (sinkronisasi antar device)
--
-- replica identity full: agar event DELETE membawa data lama sehingga bisa
-- difilter RLS dan diterima subscriber.
-- ---------------------------------------------------------------------------

alter table public.products replica identity full;
alter table public.transactions replica identity full;

do $$
begin
  if exists (select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
    ) then
      execute 'alter publication supabase_realtime add table public.products';
    end if;

    if not exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
    ) then
      execute 'alter publication supabase_realtime add table public.transactions';
    end if;
  end if;
end;
$$;
