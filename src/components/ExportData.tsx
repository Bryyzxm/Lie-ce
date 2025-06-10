'use client';

import React from 'react';

interface Transaction {
 id: string;
 date: string;
 productId: string;
 quantity: number;
 total: number;
}

import {Product} from './ProductManager';

interface ExportDataProps {
 transactions: Transaction[];
 products: Product[];
}

export default function ExportData({transactions, products}: Readonly<ExportDataProps>) {
 // Convert transactions with product details to CSV string
 const convertToCSV = () => {
  const headers = ['Transaction ID', 'Date', 'Product Name', 'Product ID', 'Product Found', 'Quantity', 'Price', 'Modal Price', 'Total', 'Profit'];
  const rows = transactions.map((tx) => {
   const product = products.find((p) => p.id === tx.productId);
   const productName = product ? product.name : 'Unknown';
   const price = product ? product.price : 0;
   const modalPrice = product ? product.modalPrice : 0;
   const profit = (price - modalPrice) * tx.quantity;
   const productFound = product ? 'Yes' : 'No';
   return [tx.id, tx.date, productName, tx.productId, productFound, tx.quantity.toString(), price.toString(), modalPrice.toString(), tx.total.toString(), profit.toString()];
  });

  const csvContent = [headers, ...rows].map((e) => e.join(';')).join('\n');
  return csvContent;
 };

 // Trigger download of CSV file
 const handleExport = () => {
  const csv = convertToCSV();
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'sales_data.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
 };

 return (
  <section className="mb-8">
   <button
    onClick={handleExport}
    className="bg-black text-white rounded px-6 py-3 hover:bg-gray-900 transition font-semibold"
   >
    Export Sales Data to CSV
   </button>
  </section>
 );
}
