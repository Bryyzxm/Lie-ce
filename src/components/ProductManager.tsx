'use client';

import React, {useState} from 'react';

interface Product {
 id: string;
 name: string;
 stock: number;
 price: number;
 modalPrice: number;
 exp: string;
}

interface ProductManagerProps {
 products: Product[];
 setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export default function ProductManager({products, setProducts}: ProductManagerProps) {
 const [form, setForm] = useState<{id: string; name: string; stock: string; price: string; modalPrice: string; exp: string}>({id: '', name: '', stock: '', price: '', modalPrice: '', exp: ''});
 const [editingId, setEditingId] = useState<string | null>(null);

 // Handle input change
 const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setForm({...form, [e.target.name]: e.target.value});
 };

 // Add or update product
 const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!form.name) return;

  const newProduct = {
   id: editingId || crypto.randomUUID(),
   name: form.name,
   stock: Number(form.stock),
   price: Number(form.price),
   modalPrice: Number(form.modalPrice),
   exp: form.exp,
  };

  if (editingId) {
   // Update existing product
   setProducts(products.map((p) => (p.id === editingId ? newProduct : p)));
   setEditingId(null);
  } else {
   // Add new product
   setProducts([...products, newProduct]);
  }
  setForm({id: '', name: '', stock: '', price: '', modalPrice: '', exp: ''});
 };

 // Edit product
 const handleEdit = (id: string) => {
  const product = products.find((p) => p.id === id);
  if (product) {
   setForm({
    id: product.id,
    name: product.name,
    stock: product.stock.toString(),
    price: product.price.toString(),
    modalPrice: product.modalPrice.toString(),
    exp: product.exp,
   });
   setEditingId(id);
  }
 };

 // Delete product
 const handleDelete = (id: string) => {
  if (confirm('Are you sure you want to delete this product?')) {
   setProducts(products.filter((p) => p.id !== id));
  }
 };

 return (
  <section className="mb-8">
   <h2 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2">Manage Products</h2>
   <form
    onSubmit={handleSubmit}
    className="mb-6 grid grid-cols-1 sm:grid-cols-5 gap-4"
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
     type="number"
     name="stock"
     placeholder="Stock"
     value={form.stock}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     min={0}
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
     type="text"
     name="exp"
     placeholder="Exp Product"
     value={form.exp}
     onChange={handleChange}
     className="border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
     required
    />
    <button
     type="submit"
     className="bg-black text-white rounded px-6 py-3 hover:bg-gray-900 transition font-semibold"
    >
     {editingId ? 'Update' : 'Add'}
    </button>
   </form>
   <table className="w-full border-collapse border border-gray-300 shadow-sm">
    <thead>
     <tr className="bg-gray-100">
      <th className="border border-gray-300 p-3 text-left font-medium">Name</th>
      <th className="border border-gray-300 p-3 text-left font-medium">Stock</th>
      <th className="border border-gray-300 p-3 text-left font-medium">Price</th>
      <th className="border border-gray-300 p-3 text-left font-medium">Harga Modal</th>
      <th className="border border-gray-300 p-3 text-left font-medium">Exp Product</th>
      <th className="border border-gray-300 p-3 text-left font-medium">Actions</th>
     </tr>
    </thead>
    <tbody>
     {products.map((product) => (
      <tr
       key={product.id}
       className="hover:bg-gray-50 transition"
      >
       <td className="border border-gray-300 p-3">{product.name}</td>
       <td className="border border-gray-300 p-3">{product.stock}</td>
       <td className="border border-gray-300 p-3">{product.price.toLocaleString()}</td>
       <td className="border border-gray-300 p-3">{product.modalPrice.toLocaleString()}</td>
       <td className="border border-gray-300 p-3">{product.exp}</td>
       <td className="border border-gray-300 p-3 space-x-4">
        <button
         onClick={() => handleEdit(product.id)}
         className="text-blue-600 hover:underline font-semibold"
        >
         Edit
        </button>
        <button
         onClick={() => handleDelete(product.id)}
         className="text-red-600 hover:underline font-semibold"
        >
         Delete
        </button>
       </td>
      </tr>
     ))}
     {products.length === 0 && (
      <tr>
       <td
        colSpan={6}
        className="text-center p-6 text-gray-500 italic"
       >
        No products available.
       </td>
      </tr>
     )}
    </tbody>
   </table>
  </section>
 );
}
