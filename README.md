<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally or deploy to **Vercel** (`vercel.com`).

View your app in AI Studio: https://ai.studio/apps/6f02fa55-fee7-4f9b-abff-67fecf326e55

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Jalankan server lokal:
   ```bash
   npm run dev
   ```

---

## 🚀 Panduan Deploy ke Vercel (vercel.com)

Projek ini sudah dilengkapi dengan konfigurasi **Vercel Serverless Functions** (`/api/`) dan file konfigurasi `vercel.json`. Semua request API (MangaDex, Komikcast, Jikan MyAnimeList, Google Drive PDF, Image Proxy) akan otomatis dialihkan melalui serverless proxy untuk **mencegah error CORS / 404**.

### Cara 1: Deploy lewat GitHub / Git Repository (Sangat Direkomendasikan)
1. Push / upload folder projek ini ke repository GitHub Anda.
2. Buka dashboard [Vercel](https://vercel.com/) dan klik **Add New...** > **Project**.
3. Pilih repository GitHub Anda. Vercel akan otomatis mendeteksi:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (atau `vite build`)
   - **Output Directory:** `dist`
4. (Opsional) Di bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`: (URL Supabase Anda)
   - `VITE_SUPABASE_ANON_KEY`: (Anon Key Supabase Anda)
   *(Catatan: Kredensial Supabase juga otomatis tersimpan di Cloud Firestore saat disimpan via panel Admin sehingga web tetap langsung tersinkronisasi).*
5. Klik **Deploy**. Vercel akan langsung meng-compile frontend dan serverless functions secara otomatis.

### Cara 2: Deploy lewat Vercel CLI
1. Install Vercel CLI: 
   ```bash
   npm install -g vercel
   ```
2. Jalankan perintah deploy:
   ```bash
   vercel
   ```
3. Untuk deploy ke production:
   ```bash
   vercel --prod
   ```
