'use client';

import React from 'react';

interface Product {
 id: string;
 name: string;
 stock: number;
 price: number;
}

interface StockViewProps {
 products: Product[];
}

export default function StockView({products}: Readonly<StockViewProps>) {
 return (
  <section className="mb-8">
   <h2 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2">Stock Overview</h2>
   <table className="w-full border-collapse border border-gray-300 shadow-sm">
    <thead>
     <tr className="bg-gray-100">
      <th className="border border-gray-300 p-3 text-left font-medium">Product</th>
      <th className="border border-gray-300 p-3 text-left font-medium">Stock Remaining</th>
      <th className="border border-gray-300 p-3 text-left font-medium">Status</th>
     </tr>
    </thead>
    <tbody>
     {products.map((product) => {
      const isLowStock = product.stock < 5;
      return (
       <tr
        key={product.id}
        className="hover:bg-gray-50 transition"
       >
        <td className="border border-gray-300 p-3">{product.name}</td>
        <td className="border border-gray-300 p-3">{product.stock}</td>
        <td className={`border border-gray-300 p-3 font-semibold ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>{isLowStock ? 'Low Stock' : 'Sufficient'}</td>
       </tr>
      );
     })}
     {products.length === 0 && (
      <tr>
       <td
        colSpan={3}
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
