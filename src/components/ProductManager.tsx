'use client';

import React, {useMemo, useState} from 'react';

import type {Product, ProductInput} from '../lib/types';
import {formatDecimal, parseDecimalInput} from '../lib/utils';

interface ProductManagerProps {
 products: Product[];
 busy: boolean;
 createAction: (input: ProductInput) => Promise<boolean>;
 updateAction: (id: string, input: ProductInput) => Promise<boolean>;
 deleteAction: (id: string) => Promise<boolean>;
}

const EMPTY_FORM = {name: '', stock: '', price: '', modalPrice: '', exp: ''};

export default function ProductManager({products, busy, createAction, updateAction, deleteAction}: Readonly<ProductManagerProps>) {
 const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
 const [editingId, setEditingId] = useState<string | null>(null);

 // Produk kedaluwarsa bulan ini atau bulan depan ditandai merah.
 const expWarnings = useMemo(() => {
  const now = new Date();
  const limit = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  const flagged: Record<string, true> = {};

  for (const product of products) {
   const [year, month] = product.exp.split('-').map(Number);
   if (!Number.isFinite(year) || !Number.isFinite(month)) continue;
   if (new Date(year, month - 1, 1).getTime() <= limit) flagged[product.id] = true;
  }

  return flagged;
 }, [products]);

 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setForm({...form, [e.target.name]: e.target.value});
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.name.trim()) return;

  const stock = parseDecimalInput(form.stock);
  if (stock === null || stock < 0) return;

  const input: ProductInput = {
   name: form.name.trim(),
   stock,
   price: Number(form.price),
   modalPrice: Number(form.modalPrice),
   exp: form.exp,
  };

  const ok = editingId ? await updateAction(editingId, input) : await createAction(input);
  if (!ok) return;

  setEditingId(null);
  setForm(EMPTY_FORM);
 };

 const handleEdit = (product: Product) => {
  setForm({
   name: product.name,
   // Simpan format tanpa pemisah ribuan agar bisa langsung diedit kembali.
   stock: product.stock.toString(),
   price: product.price.toString(),
   modalPrice: product.modalPrice.toString(),
   exp: product.exp,
  });
  setEditingId(product.id);
 };

 const handleDelete = async (id: string) => {
  if (!confirm('Hapus produk ini?')) return;

  const ok = await deleteAction(id);
  if (ok && editingId === id) {
   setEditingId(null);
   setForm(EMPTY_FORM);
  }
 };

 return (
  <section className="mb-8">
   <h2 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2">Manage Products</h2>
   <form
    onSubmit={handleSubmit}
    className="mb-6 grid grid-cols-1 sm:grid-cols-6 gap-4"
   >
    <input
     type="text"
     name="name"
     placeholder="Product Name"
     value={form.name}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     required
    />
    <input
     type="text"
     name="stock"
     placeholder="Stock (contoh: 10,5)"
     inputMode="decimal"
     value={form.stock}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     required
    />
    <input
     type="number"
     name="price"
     placeholder="Price"
     value={form.price}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     min={0}
     required
    />
    <input
     type="number"
     name="modalPrice"
     placeholder="Harga Modal"
     value={form.modalPrice}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     min={0}
     required
    />
    <input
     type="month"
     name="exp"
     placeholder="Exp Product"
     value={form.exp}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     required
    />
    <div className="flex gap-2">
     <button
      type="submit"
      disabled={busy}
      className="flex-1 bg-black text-white rounded px-6 py-3 hover:bg-gray-900 transition font-semibold disabled:opacity-50"
     >
      {editingId ? 'Update' : 'Add'}
     </button>
     {editingId && (
      <button
       type="button"
       onClick={() => {
        setEditingId(null);
        setForm(EMPTY_FORM);
       }}
       className="border border-gray-400 rounded px-4 py-3 hover:bg-gray-100 transition font-semibold"
      >
       Batal
      </button>
     )}
    </div>
   </form>
   <div className="overflow-x-auto">
    <table className="w-full border-collapse border border-gray-300 shadow-sm">
     <thead>
      <tr className="bg-gray-100">
       <th className="border border-gray-300 p-3 text-left font-medium w-12">No</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Name</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Stock</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Price</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Harga Modal</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Exp Product</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Actions</th>
      </tr>
     </thead>
     <tbody>
      {products.map((product, index) => (
       <tr
        key={product.id}
        className="hover:bg-gray-50 transition"
       >
        <td className="border border-gray-300 p-3">{index + 1}</td>
        <td className="border border-gray-300 p-3">{product.name}</td>
        <td className="border border-gray-300 p-3">{formatDecimal(product.stock)}</td>
        <td className="border border-gray-300 p-3">{product.price.toLocaleString()}</td>
        <td className="border border-gray-300 p-3">{product.modalPrice.toLocaleString()}</td>
        <td className={'border border-gray-300 p-3' + (expWarnings[product.id] ? ' text-red-600 font-bold' : '')}>{product.exp}</td>
        <td className="border border-gray-300 p-3 space-x-4">
         <button
          onClick={() => handleEdit(product)}
          disabled={busy}
          className="text-blue-600 hover:underline font-semibold disabled:opacity-50"
         >
          Edit
         </button>
         <button
          onClick={() => void handleDelete(product.id)}
          disabled={busy}
          className="text-red-600 hover:underline font-semibold disabled:opacity-50"
         >
          Delete
         </button>
        </td>
       </tr>
      ))}
      {products.length === 0 && (
       <tr>
        <td
         colSpan={7}
         className="text-center p-6 text-gray-500 italic"
        >
         No products available.
        </td>
       </tr>
      )}
     </tbody>
    </table>
   </div>
  </section>
 );
}
