'use client';

import {createClient, type SupabaseClient} from '@supabase/supabase-js';

/**
 * Client Supabase untuk browser.
 *
 * URL dan anon key di-inline saat build (NEXT_PUBLIC_*), jadi aman dipakai di
 * static export GitHub Pages. Anon key memang publik: yang melindungi data
 * adalah Row Level Security + allowlist tabel `members` di database.
 */

/**
 * Ambil origin dari nilai yang ditempel user.
 *
 * Dashboard Supabase menampilkan URL Data API lengkap dengan path
 * (`https://xxx.supabase.co/rest/v1/`). Client butuh origin saja; kalau path
 * ikut terbawa, semua request jadi `/rest/v1/rest/v1/...` dan server menjawab
 * "Invalid path specified in request URL". Skema yang lupa ditulis juga
 * dilengkapi, karena `createClient` menolak nilai tanpa `http(s)://`.
 */
function toOrigin(raw: string | undefined): string {
 const trimmed = raw?.trim() ?? '';
 if (!trimmed) return '';

 const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
 try {
  return new URL(withScheme).origin;
 } catch {
  return trimmed;
 }
}

const supabaseUrl = toOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
 if (!isSupabaseConfigured) {
  throw new Error('Supabase belum dikonfigurasi. Set NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY saat build.');
 }

 cached ??= createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
   persistSession: true,
   autoRefreshToken: true,
   // GitHub Pages memakai hash routing untuk apa pun; jangan biarkan
   // Supabase mencoba mengambil token dari URL.
   detectSessionInUrl: false,
  },
 });

 return cached;
}
