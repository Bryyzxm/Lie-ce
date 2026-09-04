'use client';

import React from 'react';

import type {Transaction} from '../lib/types';

interface ExportDataProps {
 transactions: Transaction[];
}

const HEADERS = ['Transaction ID', 'Date', 'Product Name', 'Product ID', 'Quantity', 'Price', 'Modal Price', 'Total', 'Profit'];

/** Bungkus field agar tanda kutip, titik koma, dan newline tidak merusak kolom CSV. */
function csvCell(value: string | number): string {
 const text = String(value);
 return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function ExportData({transactions}: Readonly<ExportDataProps>) {
 const handleExport = () => {
  const rows = transactions.map((tx) => [
   tx.id,
   tx.date,
   tx.productName,
   tx.productId ?? '',
   tx.quantity,
   tx.unitPrice,
   tx.unitCost,
   tx.total,
   (tx.unitPrice - tx.unitCost) * tx.quantity,
  ]);

  const csv = [HEADERS, ...rows].map((row) => row.map(csvCell).join(';')).join('\r\n');
  // BOM agar Excel membaca UTF-8 dengan benar.
  const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'sales_data.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
