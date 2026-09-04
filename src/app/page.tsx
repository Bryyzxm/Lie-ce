'use client';

import Dashboard from '../components/Dashboard';

/**
 * Halaman tunggal. Seluruh state hidup di client karena aplikasi ini
 * di-export statis ke GitHub Pages dan bicara langsung ke Supabase.
 */
export default function Home() {
 return <Dashboard />;
}
