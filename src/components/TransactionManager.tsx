'use client';

import React, {useState} from 'react';

import type {Product, Transaction} from '../lib/types';
import {formatDecimal, parseDecimalInput} from '../lib/utils';

interface TransactionManagerProps {
 products: Product[];
 transactions: Transaction[];
 busy: boolean;
 recordSaleAction: (productId: string, quantity: number, date: string) => Promise<boolean>;
 deleteAction: (id: string) => Promise<boolean>;
}

export default function TransactionManager({products, transactions, busy, recordSaleAction, deleteAction}: Readonly<TransactionManagerProps>) {
 const [form, setForm] = useState({
  date: new Date().toISOString().slice(0, 10),
  productId: '',
  quantity: '',
 });

 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  setForm({...form, [e.target.name]: e.target.value});
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const quantity = parseDecimalInput(form.quantity);
  if (!form.productId || quantity === null || quantity <= 0) return;

  // Validasi stok final dilakukan database (baris produk dikunci), jadi dua
  // device tidak bisa menjual stok terakhir yang sama.
  const ok = await recordSaleAction(form.productId, quantity, form.date);
  if (ok) setForm({...form, productId: '', quantity: ''});
 };

 return (
  <section className="mb-8">
   <h2 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2">Record Sales Transaction</h2>
   <form
    onSubmit={handleSubmit}
    className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6"
   >
    <input
     type="date"
     name="date"
     value={form.date}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     required
    />
    <select
     name="productId"
     value={form.productId}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     required
    >
     <option value="">Select Product</option>
      {products.map((product) => (
      <option
       key={product.id}
       value={product.id}
      >
       {product.name} (Stock: {formatDecimal(product.stock)})
      </option>
     ))}
    </select>
    <input
     type="text"
     name="quantity"
     placeholder="Quantity (contoh: 1,5)"
     inputMode="decimal"
     value={form.quantity}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     required
    />
    <button
     type="submit"
     disabled={busy}
     className="bg-black text-white rounded px-6 py-3 hover:bg-gray-900 transition font-semibold disabled:opacity-50"
    >
     Add Transaction
    </button>
   </form>
   <div className="overflow-x-auto">
    <table className="w-full border-collapse border border-gray-300 shadow-sm">
     <thead>
      <tr className="bg-gray-100">
       <th className="border border-gray-300 p-3 text-left font-medium">Date</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Product</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Quantity</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Total</th>
       <th className="border border-gray-300 p-3 text-left font-medium">Actions</th>
      </tr>
     </thead>
     <tbody>
      {transactions.map((tx) => (
       <tr
        key={tx.id}
        className="hover:bg-gray-50 transition"
       >
        <td className="border border-gray-300 p-3">{tx.date}</td>
        <td className="border border-gray-300 p-3">{tx.productName}</td>
        <td className="border border-gray-300 p-3">{formatDecimal(tx.quantity)}</td>
        <td className="border border-gray-300 p-3">{formatDecimal(tx.total)}</td>
        <td className="border border-gray-300 p-3">
         <button
          onClick={() => void deleteAction(tx.id)}
          disabled={busy}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition disabled:opacity-50"
          aria-label="Delete transaction"
         >
          Delete
         </button>
        </td>
       </tr>
      ))}
      {transactions.length === 0 && (
       <tr>
        <td
         colSpan={5}
         className="text-center p-6 text-gray-500 italic"
        >
         No transactions recorded.
        </td>
       </tr>
      )}
     </tbody>
    </table>
   </div>
  </section>
 );
}
