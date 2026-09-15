'use client';

import {getSupabase} from './supabase';
import {toProduct, toProductRow, toTransaction, type Product, type ProductInput, type ProductRow, type Transaction, type TransactionRow} from './types';

const PRODUCT_COLUMNS = 'id, name, stock, price, modal_price, exp';
const TRANSACTION_COLUMNS = 'id, product_id, product_name, occurred_on, quantity, unit_price, unit_cost, total';
const EXP_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Semua error database dinormalkan ke satu bentuk pesan yang bisa ditampilkan ke user. */
function fail(action: string, error: {message: string} | null): never {
 throw new Error(`${action}: ${error?.message ?? 'kesalahan tidak diketahui'}`);
}

export async function fetchProducts(): Promise<Product[]> {
 const {data, error} = await getSupabase().from('products').select(PRODUCT_COLUMNS).order('name');

 if (error) fail('Gagal memuat produk', error);
 return (data as ProductRow[]).map(toProduct);
}

export async function fetchTransactions(): Promise<Transaction[]> {
 const {data, error} = await getSupabase().from('transactions').select(TRANSACTION_COLUMNS).order('occurred_on', {ascending: false}).order('created_at', {ascending: false});

 if (error) fail('Gagal memuat transaksi', error);
 return (data as TransactionRow[]).map(toTransaction);
}

export async function createProduct(input: ProductInput): Promise<Product> {
 const {data, error} = await getSupabase().from('products').insert(toProductRow(input)).select(PRODUCT_COLUMNS).single();

 if (error) fail('Gagal menambah produk', error);
 return toProduct(data as ProductRow);
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
 const {data, error} = await getSupabase().from('products').update(toProductRow(input)).eq('id', id).select(PRODUCT_COLUMNS).single();

 if (error) fail('Gagal menyimpan produk', error);
 return toProduct(data as ProductRow);
}

export async function deleteProduct(id: string): Promise<void> {
 const {error} = await getSupabase().from('products').delete().eq('id', id);

 if (error) fail('Gagal menghapus produk', error);
}

/**
 * Catat penjualan lewat RPC. Database mengunci baris produk lalu mengurangi stok
 * dan menulis transaksi dalam satu transaksi SQL, sehingga dua device tidak bisa
 * menjual stok terakhir yang sama.
 */
export async function recordSale(productId: string, quantity: number, date: string): Promise<Transaction> {
 const {data, error} = await getSupabase().rpc('record_sale', {
  p_product_id: productId,
  p_quantity: quantity,
  p_occurred_on: date,
 });

 if (error) fail('Gagal mencatat transaksi', error);
 return toTransaction(data as TransactionRow);
}

/** Hapus transaksi dan kembalikan stok produk, atomik di database. */
export async function deleteTransaction(id: string): Promise<void> {
 const {error} = await getSupabase().rpc('delete_transaction', {p_id: id});

 if (error) fail('Gagal menghapus transaksi', error);
}

// ---------------------------------------------------------------------------
// Migrasi data localStorage lama (single-device) ke database bersama
// ---------------------------------------------------------------------------

const LEGACY_KEYS = ['products', 'transactions', 'liece_products', 'liece_transactions'];

interface LegacyProduct {
 id?: string;
 name?: string;
 stock?: number;
 price?: number;
 modalPrice?: number;
 cost?: number;
 exp?: string;
}

interface LegacyTransaction {
 date?: string;
 productId?: string;
 quantity?: number;
 total?: number;
}

export interface LegacyData {
 products: LegacyProduct[];
 transactions: LegacyTransaction[];
}

function readLegacyArray<T>(...keys: string[]): T[] {
 for (const key of keys) {
  try {
   const raw = localStorage.getItem(key);
   if (!raw) continue;
   const parsed: unknown = JSON.parse(raw);
   if (Array.isArray(parsed) && parsed.length > 0) return parsed as T[];
  } catch {
   // Data rusak: abaikan, coba key berikutnya.
  }
 }
 return [];
}

export function readLegacyData(): LegacyData {
 return {
  products: readLegacyArray<LegacyProduct>('products', 'liece_products'),
  transactions: readLegacyArray<LegacyTransaction>('transactions', 'liece_transactions'),
 };
}

export function clearLegacyData(): void {
 for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}

/**
 * Pindahkan data lama ke database sekali jalan.
 *
 * Transaksi lama di-insert langsung (bukan lewat record_sale) karena angka stok
 * yang tersimpan sudah memperhitungkan penjualan tersebut; memakai record_sale
 * akan mengurangi stok dua kali.
 */
export async function importLegacyData(legacy: LegacyData): Promise<{products: number; transactions: number}> {
 const supabase = getSupabase();
 const byLegacyId = new Map<string, {id: string; name: string; price: number; modalPrice: number}>();

 if (legacy.products.length > 0) {
  const payload = legacy.products.map((p) => ({
   name: (p.name ?? '').trim() || 'Tanpa nama',
   stock: Math.max(0, Number(p.stock) || 0),
   price: Math.max(0, Math.trunc(Number(p.price) || 0)),
   modal_price: Math.max(0, Math.trunc(Number(p.modalPrice ?? p.cost) || 0)),
   exp: EXP_PATTERN.test(p.exp ?? '') ? p.exp : null,
  }));

  const {data, error} = await supabase.from('products').insert(payload).select(PRODUCT_COLUMNS);
  if (error) fail('Gagal mengimpor produk lama', error);

  const inserted = data as ProductRow[];
  legacy.products.forEach((old, index) => {
   const row = inserted[index];
   if (old.id && row) byLegacyId.set(old.id, {id: row.id, name: row.name, price: row.price, modalPrice: row.modal_price});
  });
 }

 const today = new Date().toISOString().slice(0, 10);
 const transactionRows = legacy.transactions
  .map((tx) => {
   const quantity = Math.max(0, Number(tx.quantity) || 0);
   if (quantity <= 0) return null;

   const mapped = tx.productId ? byLegacyId.get(tx.productId) : undefined;
   const total = Math.max(0, Number(tx.total) || 0);

   return {
    product_id: mapped?.id ?? null,
    product_name: mapped?.name ?? 'Produk lama',
    occurred_on: /^\d{4}-\d{2}-\d{2}$/.test(tx.date ?? '') ? tx.date : today,
    quantity,
    unit_price: Math.max(0, mapped?.price ?? Math.floor(total / quantity)),
    unit_cost: Math.max(0, mapped?.modalPrice ?? 0),
   };
  })
  .filter((row): row is NonNullable<typeof row> => row !== null);

 if (transactionRows.length > 0) {
  const {error} = await supabase.from('transactions').insert(transactionRows);
  if (error) fail('Gagal mengimpor transaksi lama', error);
 }

 clearLegacyData();
 return {products: legacy.products.length, transactions: transactionRows.length};
}
