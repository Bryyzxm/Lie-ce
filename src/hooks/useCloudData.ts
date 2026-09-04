'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {clearLegacyData, fetchProducts, fetchTransactions, importLegacyData, readLegacyData, type LegacyData} from '../lib/store';
import {getSupabase} from '../lib/supabase';
import type {Product, Transaction} from '../lib/types';

export interface CloudData {
 products: Product[];
 transactions: Transaction[];
 loading: boolean;
 busy: boolean;
 error: string | null;
 notice: string | null;
 legacy: LegacyData | null;
 /**
  * Jalankan satu operasi tulis: error masuk ke state, dan data dimuat ulang
  * bila berhasil. Mengembalikan true jika operasi sukses.
  */
 mutate: (action: () => Promise<unknown>) => Promise<boolean>;
 refresh: () => Promise<void>;
 dismissError: () => void;
 dismissNotice: () => void;
 importLegacy: () => Promise<void>;
 dismissLegacy: () => void;
}

/**
 * Sumber data tunggal dari Supabase, dibagikan ke semua device.
 *
 * Perubahan tabel products/transactions memicu refetch lewat Realtime, jadi
 * device lain ikut ter-update tanpa reload. Refetch penuh dipilih dibanding
 * merge event per baris: payload realtime tidak memuat kolom generated dan
 * urutan event tidak dijamin, sehingga merge manual mudah salah.
 */
export function useCloudData(userId: string | null): CloudData {
 const [products, setProducts] = useState<Product[]>([]);
 const [transactions, setTransactions] = useState<Transaction[]>([]);
 const [loading, setLoading] = useState<boolean>(true);
 const [busy, setBusy] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);
 const [notice, setNotice] = useState<string | null>(null);
 const [legacy, setLegacy] = useState<LegacyData | null>(null);

 // Satu refetch berjalan pada satu waktu; burst event realtime tidak menumpuk.
 const inFlight = useRef<Promise<void> | null>(null);

 const refresh = useCallback(async (): Promise<void> => {
  if (!userId) return;
  if (inFlight.current) return inFlight.current;

  const run = (async () => {
   try {
    const [nextProducts, nextTransactions] = await Promise.all([fetchProducts(), fetchTransactions()]);
    setProducts(nextProducts);
    setTransactions(nextTransactions);
    setError(null);
   } catch (err) {
    setError(err instanceof Error ? err.message : 'Gagal memuat data');
   } finally {
    setLoading(false);
    inFlight.current = null;
   }
  })();

  inFlight.current = run;
  return run;
 }, [userId]);

 useEffect(() => {
  // Ganti akun berarti ganti konteks: bersihkan data dan pesan akun sebelumnya.
  setError(null);
  setNotice(null);

  if (!userId) {
   setProducts([]);
   setTransactions([]);
   setLegacy(null);
   setLoading(false);
   return;
  }

  setLoading(true);
  void refresh();

  const found = readLegacyData();
  setLegacy(found.products.length > 0 || found.transactions.length > 0 ? found : null);

  const supabase = getSupabase();
  const channel = supabase
   .channel('liece-data')
   .on('postgres_changes', {event: '*', schema: 'public', table: 'products'}, () => void refresh())
   .on('postgres_changes', {event: '*', schema: 'public', table: 'transactions'}, () => void refresh())
   .subscribe();

  // Browser HP membekukan tab di background; sinkron ulang saat aktif/online.
  const resync = () => {
   if (document.visibilityState === 'visible') void refresh();
  };
  document.addEventListener('visibilitychange', resync);
  window.addEventListener('online', resync);

  return () => {
   document.removeEventListener('visibilitychange', resync);
   window.removeEventListener('online', resync);
   void supabase.removeChannel(channel);
  };
 }, [userId, refresh]);

 const mutate = useCallback(
  async (action: () => Promise<unknown>): Promise<boolean> => {
   setBusy(true);
   try {
    await action();
    setError(null);
    await refresh();
    return true;
   } catch (err) {
    setError(err instanceof Error ? err.message : 'Operasi gagal');
    return false;
   } finally {
    setBusy(false);
   }
  },
  [refresh]
 );

 const importLegacy = useCallback(async () => {
  if (!legacy) return;
  setBusy(true);
  try {
   const result = await importLegacyData(legacy);
   setLegacy(null);
   setError(null);
   setNotice(`Berhasil memindahkan ${result.products} produk dan ${result.transactions} transaksi ke penyimpanan bersama.`);
   await refresh();
  } catch (err) {
   setError(err instanceof Error ? err.message : 'Gagal mengimpor data lama');
  } finally {
   setBusy(false);
  }
 }, [legacy, refresh]);

 const dismissLegacy = useCallback(() => {
  clearLegacyData();
  setLegacy(null);
 }, []);

 const dismissError = useCallback(() => setError(null), []);
 const dismissNotice = useCallback(() => setNotice(null), []);

 return useMemo(
  () => ({products, transactions, loading, busy, error, notice, legacy, mutate, refresh, dismissError, dismissNotice, importLegacy, dismissLegacy}),
  [products, transactions, loading, busy, error, notice, legacy, mutate, refresh, dismissError, dismissNotice, importLegacy, dismissLegacy]
 );
}
