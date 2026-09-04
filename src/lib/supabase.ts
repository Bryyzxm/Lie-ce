'use client';

import {createClient, type SupabaseClient} from '@supabase/supabase-js';

/**
 * Client Supabase untuk browser.
 *
 * URL dan anon key di-inline saat build (NEXT_PUBLIC_*), jadi aman dipakai di
 * static export GitHub Pages. Anon key memang publik: yang melindungi data
 * adalah Row Level Security + allowlist tabel `members` di database.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
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
