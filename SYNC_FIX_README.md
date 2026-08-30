# PANDUAN LENGKAP SINKRONISASI SUPABASE (CROSS-DEVICE SYNC)

Dokumen ini menjelaskan arsitektur sinkronisasi database pusat antara **Device Admin** (Desktop/Laptop) dan **Device Pembaca** (HP/Mobile/Tablet/PC).

---

## 1. LANGKAH WAJIB: Vercel Environment Variables

Agar **semua perangkat (Device A & Device B)** langsung terhubung ke database Supabase yang sama secara otomatis tanpa perlu login admin atau setup lokal, Anda **WAJIB** mengisi Environment Variables di Vercel:

1. Buka **[Vercel Dashboard](https://vercel.com)** → Pilih project Anda.
2. Masuk ke tab **Settings** → **Environment Variables**.
3. Tambahkan 2 variabel berikut:
   - **`VITE_SUPABASE_URL`** = `https://PROJECT_ID.supabase.co`
   - **`VITE_SUPABASE_ANON_KEY`** = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` *(Salin dari Supabase Dashboard → Settings → API → `anon public`)*
4. Centang untuk **Production**, **Preview**, dan **Development**.
5. Klik **Save**.
6. **Lakukan Redeploy** di Vercel (menu Deployments → klik titik tiga pada deployment terbaru → Redeploy) agar nilai environment variables aktif.

---

## 2. CARA CEK KONEKSI LINTAS PERANGKAT

Setelah redeploy selesai, buka URL ini dari **Device A (Laptop)** dan **Device B (HP)**:

```text
https://DOMAIN-ANDA/api/supabase-config
```

Kedua perangkat **harus** menampilkan respon JSON yang sama persis:

```json
{
  "url": "https://xxxxxxxx.supabase.co",
  "anonKey": "eyJhbGciOi..."
}
```

> 💡 **Jika nilai `"url"` atau `"anonKey"` masih kosong `""`**: Artinya Environment Variables di Vercel belum diset atau belum di-redeploy.

---

## 3. SETUP SKEMA DATABASE & REALTIME DI SUPABASE

Pastikan seluruh tabel dan izin realtime sudah aktif di Supabase:

1. Buka **[Supabase Dashboard](https://app.supabase.com)** → Masuk ke Project Anda.
2. Buka menu **SQL Editor** di bilah kiri.
3. Buka file `supabase_schema.sql` pada codebase ini, salin seluruh kodenya, paste di SQL Editor, lalu klik tombol **Run**.
4. Untuk memastikan Realtime sudah aktif di seluruh tabel, jalankan query pengecekan ini di SQL Editor:

```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
ORDER BY tablename;
```

Hasil yang keluar harus mencakup minimal tabel-tabel berikut:
- `ads`
- `banners`
- `chapters`
- `comics`
- `comments`
- `drive_accounts`
- `system_settings`
- `users`

---

## 4. URUTAN PENGUJIAN SINKRONISASI

1. Buka web di **Device A** (Laptop Admin) dan **Device B** (HP).
2. Di **Device A**: Tambah 1 Banner Hero atau 1 Judul Komik.
3. Buka **Supabase Dashboard** → **Table Editor** → Pilih tabel `banners` atau `comics`.
4. **Data harus langsung masuk dan muncul sebagai baris baru di Supabase Table Editor.**
5. Di **Device B**:
   - Jika koneksi WebSocket stabil, data langsung terupdate secara instan (*Live Realtime*).
   - Jika terjadi gangguan jaringan seluler, fallback snapshot otomatis menyinkronkan data setiap **10 detik** atau saat layar HP diaktifkan kembali (*tab focus*).
