-- Migrasi aman untuk stok dan quantity desimal.
-- Jalankan satu kali di Supabase SQL Editor.
-- Tidak menghapus baris products maupun transactions.

begin;

-- Hapus function lama yang menerima integer agar RPC tidak ambigu.
drop function if exists public.record_sale(uuid, integer, date);

-- Kolom total adalah generated column. Hapus hanya kolom hasil kalkulasi ini;
-- data sumber (quantity, unit_price, dan transaksi) tetap dipertahankan.
alter table public.transactions drop column if exists total;

-- Konversi langsung mempertahankan nilai stok/quantity lama.
alter table public.products
  alter column stock type numeric(20,3)
  using stock::numeric;

alter table public.transactions
  alter column quantity type numeric(20,3)
  using quantity::numeric;

alter table public.transactions
  add column total numeric(30,3)
  generated always as (quantity * unit_price) stored;

create or replace function public.record_sale(
  p_product_id uuid,
  p_quantity numeric,
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

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

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

revoke execute on function public.record_sale(uuid, numeric, date) from public;
grant execute on function public.record_sale(uuid, numeric, date) to authenticated;

commit;
