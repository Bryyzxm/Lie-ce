'use client';

import React, {useMemo, useState} from 'react';

import {useAuthSession} from '../hooks/useAuthSession';
import {useCloudData} from '../hooks/useCloudData';
import {createProduct, deleteProduct, deleteTransaction, recordSale, updateProduct} from '../lib/store';
import {getSupabase, isSupabaseConfigured} from '../lib/supabase';
import type {ProductInput} from '../lib/types';

import AuthGate from './AuthGate';
import ExportData from './ExportData';
import ProductManager from './ProductManager';
import Reports from './Reports';
import SearchFilter from './SearchFilter';
import StockView from './StockView';
import TransactionManager from './TransactionManager';

function SetupNotice() {
 return (
  <main className="min-h-screen bg-white text-black p-6 max-w-2xl mx-auto">
   <h1 className="text-3xl font-extrabold mb-4 tracking-tight">Lie ce</h1>
   <p className="mb-4">
    Aplikasi ini menyimpan data di Supabase agar bisa dibuka dari device mana pun, tetapi kredensialnya belum diisi saat build.
   </p>
   <p className="text-sm text-gray-700">
    Set repository secret <code className="bg-gray-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code> dan <code className="bg-gray-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, lalu jalankan ulang workflow deploy. Langkah lengkap ada di <code className="bg-gray-100 px-1">README.md</code>.
   </p>
  </main>
 );
}

export default function Dashboard() {
 const {userId, email, checking} = useAuthSession();
 const data = useCloudData(userId);
 const [searchTerm, setSearchTerm] = useState<string>('');

 const filteredProducts = useMemo(() => {
  const needle = searchTerm.trim().toLowerCase();
  return needle ? data.products.filter((product) => product.name.toLowerCase().includes(needle)) : data.products;
 }, [data.products, searchTerm]);

 if (!isSupabaseConfigured) return <SetupNotice />;

 if (checking) {
  return (
   <main className="min-h-screen bg-white text-black flex items-center justify-center">
    <p className="text-gray-600">Memuat sesi...</p>
   </main>
  );
 }

 if (!userId) return <AuthGate />;

 return (
  <main className="min-h-screen bg-white text-black p-6 max-w-7xl mx-auto space-y-10">
   <header className="flex flex-wrap items-center justify-between gap-4">
    <h1 className="text-4xl font-extrabold tracking-tight">Lie ce - Stock & Sales Management</h1>
    <div className="flex items-center gap-3 text-sm">
     <span className="text-gray-600">{email}</span>
     <button
      onClick={() => void getSupabase().auth.signOut()}
      className="border border-gray-400 rounded px-4 py-2 hover:bg-gray-100 transition font-semibold"
     >
      Keluar
     </button>
    </div>
   </header>

   {data.legacy && (
    <div className="border border-yellow-500 bg-yellow-50 rounded p-4 space-y-3">
     <p className="font-semibold">Data lama ditemukan di penyimpanan browser ini.</p>
     <p className="text-sm text-gray-700">
      {data.legacy.products.length} produk dan {data.legacy.transactions.length} transaksi masih tersimpan lokal. Pindahkan ke penyimpanan bersama agar terlihat di semua device.
     </p>
     <div className="flex gap-3">
      <button
       onClick={() => void data.importLegacy()}
       disabled={data.busy}
       className="bg-black text-white rounded px-4 py-2 font-semibold hover:bg-gray-900 transition disabled:opacity-50"
      >
       Pindahkan sekarang
      </button>
      <button
       onClick={data.dismissLegacy}
       className="border border-gray-400 rounded px-4 py-2 font-semibold hover:bg-gray-100 transition"
      >
       Buang data lokal
      </button>
     </div>
    </div>
   )}

   {data.error && (
    <div
     role="alert"
     className="border border-red-500 bg-red-50 text-red-700 rounded p-4 flex items-start justify-between gap-4"
    >
     <span>{data.error}</span>
     <button
      onClick={data.dismissError}
      aria-label="Tutup pesan error"
      className="font-bold"
     >
      X
     </button>
    </div>
   )}

   {data.notice && (
    <div className="border border-green-600 bg-green-50 text-green-800 rounded p-4 flex items-start justify-between gap-4">
     <span>{data.notice}</span>
     <button
      onClick={data.dismissNotice}
      aria-label="Tutup pesan"
      className="font-bold"
     >
      X
     </button>
    </div>
   )}

   {data.loading ? (
    <p className="text-gray-600">Memuat data...</p>
   ) : (
    <>
     <SearchFilter
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
     />
     <ProductManager
      products={filteredProducts}
      busy={data.busy}
      createAction={(input: ProductInput) => data.mutate(() => createProduct(input))}
      updateAction={(id: string, input: ProductInput) => data.mutate(() => updateProduct(id, input))}
      deleteAction={(id: string) => data.mutate(() => deleteProduct(id))}
     />
     <TransactionManager
      products={data.products}
      transactions={data.transactions}
      busy={data.busy}
      recordSaleAction={(productId: string, quantity: number, date: string) => data.mutate(() => recordSale(productId, quantity, date))}
      deleteAction={(id: string) => data.mutate(() => deleteTransaction(id))}
     />
     <StockView products={data.products} />
     <Reports transactions={data.transactions} />
     <ExportData transactions={data.transactions} />
    </>
   )}
  </main>
 );
}
