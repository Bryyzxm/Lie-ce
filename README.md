# Lie ce - Stock & Sales Management

Aplikasi stok & penjualan. Data disimpan di **Supabase (Postgres)**, bukan `localStorage`, sehingga produk yang dimasukkan di satu HP/laptop langsung terlihat di device lain. Frontend tetap Next.js static export dan tetap bisa di-deploy ke **GitHub Pages**.

Live: https://bryyzxm.github.io/Lie-ce/

## Cara kerja singkat

| Bagian | Keterangan |
| --- | --- |
| Frontend | Next.js `output: 'export'` -> folder `out/` -> branch `gh-pages` (tanpa server) |
| Database | Supabase Postgres, diakses langsung dari browser lewat `@supabase/supabase-js` |
| Login | Supabase Auth (email + password). Tanpa login, database menolak semua query |
| Akses data | Satu dataset bersama. Hanya akun di tabel `members` yang boleh baca/tulis (Row Level Security) |
| Sinkronisasi | Supabase Realtime: perubahan di satu device langsung muncul di device lain tanpa reload |
| Stok | Pengurangan stok lewat fungsi database `record_sale()` yang mengunci baris produk, jadi dua device tidak bisa menjual stok terakhir yang sama |

## Setup (sekali saja)

### 1. Buat project Supabase

1. Daftar di https://supabase.com (free tier cukup), buat project baru.
2. Buka **SQL Editor**, tempel seluruh isi [`supabase/schema.sql`](supabase/schema.sql), jalankan.
   Script ini membuat tabel `products`, `transactions`, `members`, kebijakan RLS, dan fungsi `record_sale` / `delete_transaction`. Aman dijalankan ulang.
3. Buka **Settings -> API Keys**, catat:
   - **Project URL** (dari **Settings -> Data API**) -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key (`eyJ…`) **atau** **publishable** key (`sb_publishable_…`) -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Kedua format key didukung `@supabase/supabase-js` yang dipakai di sini. Key ini memang ikut terpasang di file JavaScript publik dan itu normal. Yang menjaga data adalah RLS + allowlist `members`: tanpa login yang terdaftar, key itu tidak bisa membaca atau menulis apa pun. Jangan pakai `service_role` / `sb_secret_…` — key itu melewati RLS.

### 2. Isi secret di GitHub

**Settings -> Secrets and variables -> Actions -> New repository secret**, tambahkan dua secret dengan nama persis:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Workflow deploy gagal dengan pesan jelas kalau keduanya belum ada, jadi tidak akan ada versi terdeploy yang "kosong tanpa database".

### 3. Deploy

Push ke `main` (atau jalankan workflow **Deploy to GitHub Pages** manual). Workflow build static export lalu publish ke branch `gh-pages`.

### 4. Buat akun & tambah anggota

1. Buka situsnya, klik **Belum punya akun? Daftar**, daftar dengan email + password.
   Akun **pertama** otomatis menjadi `owner` dan langsung punya akses.
2. Untuk menambah device/orang lain: daftarkan akunnya, lalu di Supabase **SQL Editor** jalankan:

   ```sql
   insert into public.members (user_id, email, role)
   select id, email, 'staff' from auth.users where email = 'orang-kedua@contoh.com';
   ```

   Sebelum ditambahkan, akun baru bisa login tetapi tidak melihat data apa pun.
3. Kalau di Supabase **Authentication -> Providers -> Email** opsi *Confirm email* aktif, akun baru harus klik link konfirmasi dulu. Untuk pemakaian internal, opsi itu boleh dimatikan.

### Memindahkan data lama

Kalau browser masih menyimpan data versi `localStorage`, aplikasi menampilkan banner **"Data lama ditemukan"** setelah login dengan tombol:

- **Pindahkan sekarang** - unggah produk & transaksi lama ke database bersama, lalu bersihkan `localStorage`.
- **Buang data lokal** - hapus saja tanpa mengunggah.

Lakukan hanya di satu device (device yang datanya paling lengkap) supaya tidak ada duplikat.

## Development lokal

```bash
npm install
cp .env.example .env.local   # isi URL + anon key
npm run dev                  # http://localhost:3000
```

Build seperti di CI:

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run build
```

Hasilnya di `out/`. Tanpa kedua variabel itu, aplikasi tampil sebagai halaman instruksi setup (tidak crash).

## Struktur

```
src/lib/types.ts          tipe bersama + konversi baris DB <-> UI
src/lib/supabase.ts       pembuatan client Supabase
src/lib/store.ts          semua query/RPC + migrasi data localStorage lama
src/hooks/useAuthSession  status login
src/hooks/useCloudData    fetch + realtime + wrapper operasi tulis
src/components/           Dashboard, AuthGate, ProductManager, TransactionManager, StockView, Reports, ExportData, SearchFilter
supabase/schema.sql       schema, RLS, fungsi stok atomik
```

## Catatan teknis

- Transaksi menyimpan snapshot `product_name`, `unit_price`, `unit_cost`. Laporan lama tidak berubah saat harga produk diedit, dan riwayat tetap ada saat produk dihapus.
- `basePath` di `next.config.mjs` adalah `/Lie-ce`; ganti kalau nama repository berubah.
- Prototipe lama versi `localStorage` (`index.html` di root, folder `docs/`, dan `next.config.ts` yang tidak terpakai) sudah dihapus supaya tidak ada dua sumber data.
