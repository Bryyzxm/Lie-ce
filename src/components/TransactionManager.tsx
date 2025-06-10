'use client';

import React, {useState} from 'react';

interface Product {
 id: string;
 name: string;
 stock: number;
 price: number;
 code: string;
}

interface Transaction {
 id: string;
 date: string;
 productId: string;
 quantity: number;
 total: number;
}

interface TransactionManagerProps {
 products: Product[];
 transactions: Transaction[];
 setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
 setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export default function TransactionManager({products, transactions, setTransactions, setProducts}: TransactionManagerProps) {
 const [form, setForm] = useState({
  date: new Date().toISOString().slice(0, 10),
  productId: '',
  quantity: '',
 });

 // Handle input change
 const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  setForm({...form, [e.target.name]: e.target.value});
 };

 // Add new transaction and update product stock
 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.productId || !form.quantity) return;

  const product = products.find((p) => p.id === form.productId);
  if (!product) return;

  const qty = Number(form.quantity);
  if (qty <= 0 || qty > product.stock) {
   alert('Invalid quantity or insufficient stock');
   return;
  }

  const total = qty * product.price;

  const newTransaction = {
   id: crypto.randomUUID(),
   date: form.date,
   productId: form.productId,
   quantity: qty,
   total,
  };

  setTransactions([...transactions, newTransaction]);

  // Update product stock
  setProducts(products.map((p) => (p.id === form.productId ? {...p, stock: p.stock - qty} : p)));

  setForm({...form, productId: '', quantity: ''});
 };

 // Delete transaction and restore product stock
 const handleDelete = (transactionId: string) => {
  const transactionToDelete = transactions.find((tx) => tx.id === transactionId);
  if (!transactionToDelete) return;

  // Restore product stock
  setProducts(products.map((p) => (p.id === transactionToDelete.productId ? {...p, stock: p.stock + transactionToDelete.quantity} : p)));

  // Remove transaction
  setTransactions(transactions.filter((tx) => tx.id !== transactionId));
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
       {product.name} (Stock: {product.stock})
      </option>
     ))}
    </select>
    <input
     type="number"
     name="quantity"
     placeholder="Quantity"
     value={form.quantity}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     min={1}
     required
    />
    <button
     type="submit"
     className="bg-black text-white rounded px-6 py-3 hover:bg-gray-900 transition font-semibold"
    >
     Add Transaction
    </button>
   </form>
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
     {transactions.map((tx) => {
      const product = products.find((p) => p.id === tx.productId);
      return (
       <tr
        key={tx.id}
        className="hover:bg-gray-50 transition"
       >
        <td className="border border-gray-300 p-3">{tx.date}</td>
        <td className="border border-gray-300 p-3">{product ? product.name : 'Unknown'}</td>
        <td className="border border-gray-300 p-3">{tx.quantity}</td>
        <td className="border border-gray-300 p-3">{tx.total.toLocaleString()}</td>
        <td className="border border-gray-300 p-3">
         <button
          onClick={() => handleDelete(tx.id)}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
          aria-label="Delete transaction"
         >
          Delete
         </button>
        </td>
       </tr>
      );
     })}
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
  </section>
 );
}
