'use client';

import React, {useMemo} from 'react';

import type {Transaction} from '../lib/types';

interface ReportsProps {
 transactions: Transaction[];
}

/**
 * Ringkasan penjualan. Profit dihitung dari snapshot harga & modal yang
 * tersimpan di transaksi, bukan dari harga produk saat ini, supaya laporan
 * lama tidak berubah ketika harga produk diedit.
 */
export default function Reports({transactions}: Readonly<ReportsProps>) {
 const summary = useMemo(() => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - 6);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const buckets = {
   daily: {label: 'Daily Sales', from: startOfDay, total: 0, profit: 0, count: 0},
   weekly: {label: 'Weekly Sales', from: startOfWeek, total: 0, profit: 0, count: 0},
   monthly: {label: 'Monthly Sales', from: startOfMonth, total: 0, profit: 0, count: 0},
  };

  for (const tx of transactions) {
   // occurred_on adalah tanggal lokal (YYYY-MM-DD); parse manual agar tidak
   // bergeser sehari karena interpretasi UTC oleh new Date(string).
   const [year, month, day] = tx.date.split('-').map(Number);
   if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) continue;

   const when = new Date(year, month - 1, day);
   if (when > now) continue;

   const profit = (tx.unitPrice - tx.unitCost) * tx.quantity;

   for (const bucket of Object.values(buckets)) {
    if (when < bucket.from) continue;
    bucket.total += tx.total;
    bucket.profit += profit;
    bucket.count += 1;
   }
  }

  return Object.values(buckets);
 }, [transactions]);

 return (
  <section className="mb-8">
   <h2 className="text-2xl font-semibold mb-6 border-b border-gray-300 pb-2">Sales Reports</h2>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
    {summary.map((bucket) => (
     <div
      key={bucket.label}
      className="p-6 border rounded-lg shadow-md bg-gray-50 flex flex-col items-center"
     >
      <h3 className="text-lg font-semibold mb-3">{bucket.label}</h3>
      <p className="text-3xl font-extrabold">Rp {bucket.total.toLocaleString()}</p>
      <p className="text-sm text-gray-600 mt-1">{bucket.count} transactions</p>
      <p className="text-lg text-green-600 mt-2">Profit: Rp {bucket.profit.toLocaleString()}</p>
     </div>
    ))}
   </div>
  </section>
 );
}
