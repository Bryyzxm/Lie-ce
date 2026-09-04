/**
 * Tipe data bersama untuk seluruh aplikasi.
 *
 * Transaksi menyimpan snapshot nama/harga/modal produk saat penjualan terjadi,
 * sehingga laporan tidak berubah ketika produk diedit atau dihapus.
 */

export interface Product {
 id: string;
 name: string;
 stock: number;
 price: number;
 modalPrice: number;
 exp: string;
}

/** Field produk yang bisa diisi user (tanpa id, karena id dibuat database). */
export type ProductInput = Omit<Product, 'id'>;

export interface Transaction {
 id: string;
 /** Tanggal penjualan, format YYYY-MM-DD. */
 date: string;
 productId: string | null;
 productName: string;
 quantity: number;
 unitPrice: number;
 unitCost: number;
 total: number;
}

export interface SaleInput {
 productId: string;
 quantity: number;
 date: string;
}

/** Bentuk baris tabel di Postgres (snake_case). */
export interface ProductRow {
 id: string;
 name: string;
 stock: number;
 price: number;
 modal_price: number;
 exp: string | null;
}

export interface TransactionRow {
 id: string;
 product_id: string | null;
 product_name: string;
 occurred_on: string;
 quantity: number;
 unit_price: number;
 unit_cost: number;
 total: number;
}

export function toProduct(row: ProductRow): Product {
 return {
  id: row.id,
  name: row.name,
  stock: row.stock,
  price: row.price,
  modalPrice: row.modal_price,
  exp: row.exp ?? '',
 };
}

export function toProductRow(input: ProductInput): Omit<ProductRow, 'id'> {
 return {
  name: input.name.trim(),
  stock: input.stock,
  price: input.price,
  modal_price: input.modalPrice,
  exp: input.exp ? input.exp : null,
 };
}

export function toTransaction(row: TransactionRow): Transaction {
 return {
  id: row.id,
  // Kolom `date` bisa datang sebagai 'YYYY-MM-DD' atau ISO datetime tergantung
  // serializer; UI hanya butuh tanggalnya.
  date: row.occurred_on.slice(0, 10),
  productId: row.product_id,
  productName: row.product_name,
  quantity: row.quantity,
  unitPrice: row.unit_price,
  unitCost: row.unit_cost,
  total: row.total,
 };
}
