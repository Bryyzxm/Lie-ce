'use client';

import React, {useState} from 'react';

import {getSupabase} from '../lib/supabase';

type Mode = 'signIn' | 'signUp';

/**
 * Gerbang login. Data toko dibagi ke semua device, jadi akses harus lewat akun
 * Supabase; tanpa sesi, Row Level Security menolak semua query.
 */
export default function AuthGate() {
 const [mode, setMode] = useState<Mode>('signIn');
 const [email, setEmail] = useState<string>('');
 const [password, setPassword] = useState<string>('');
 const [busy, setBusy] = useState<boolean>(false);
 const [error, setError] = useState<string | null>(null);
 const [info, setInfo] = useState<string | null>(null);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setBusy(true);
  setError(null);
  setInfo(null);

  const auth = getSupabase().auth;
  const credentials = {email: email.trim(), password};

  const {data, error: authError} = mode === 'signIn' ? await auth.signInWithPassword(credentials) : await auth.signUp(credentials);

  if (authError) {
   setError(authError.message);
  } else if (mode === 'signUp' && !data.session) {
   setInfo('Akun dibuat. Cek email untuk konfirmasi, lalu masuk.');
  }

  setBusy(false);
 };

 return (
  <main className="min-h-screen bg-white text-black flex items-center justify-center p-6">
   <div className="w-full max-w-sm">
    <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Lie ce</h1>
    <p className="text-sm text-gray-600 mb-6">Masuk untuk mengakses data stok & penjualan bersama.</p>

    <form
     onSubmit={handleSubmit}
     className="space-y-4"
    >
     <div>
      <label
       htmlFor="auth-email"
       className="block text-sm font-medium mb-1"
      >
       Email
      </label>
      <input
       id="auth-email"
       type="email"
       autoComplete="email"
       value={email}
       onChange={(e) => setEmail(e.target.value)}
       required
       className="w-full border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
      />
     </div>

     <div>
      <label
       htmlFor="auth-password"
       className="block text-sm font-medium mb-1"
      >
       Password
      </label>
      <input
       id="auth-password"
       type="password"
       autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
       value={password}
       onChange={(e) => setPassword(e.target.value)}
       required
       minLength={8}
       className="w-full border border-gray-400 p-3 rounded focus:outline-none focus:ring-2 focus:ring-black transition"
      />
     </div>

     {error && (
      <p
       role="alert"
       className="text-sm text-red-600"
      >
       {error}
      </p>
     )}
     {info && <p className="text-sm text-green-700">{info}</p>}

     <button
      type="submit"
      disabled={busy}
      className="w-full bg-black text-white rounded px-6 py-3 hover:bg-gray-900 transition font-semibold disabled:opacity-50"
     >
      {busy ? 'Memproses...' : mode === 'signIn' ? 'Masuk' : 'Daftar'}
     </button>
    </form>

    <button
     type="button"
     onClick={() => {
      setMode(mode === 'signIn' ? 'signUp' : 'signIn');
      setError(null);
      setInfo(null);
     }}
     className="mt-4 text-sm text-blue-600 hover:underline"
    >
     {mode === 'signIn' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
    </button>
   </div>
  </main>
 );
}
