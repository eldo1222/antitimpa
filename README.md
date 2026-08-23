<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

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

## 🚀 Panduan Deploy ke Netlify (Serverless Proxy Otomatis)

Projek ini sudah dilengkapi dengan konfigurasi **Netlify Functions** (`netlify/functions/`) dan file konfigurasi `netlify.toml` + `public/_redirects`. Semua request API (MangaDex, Komikcast, Jikan MyAnimeList, Google Drive PDF) akan otomatis dialihkan melalui serverless proxy untuk **mencegah error CORS / 404**.

### Cara 1: Deploy lewat GitHub / Git Repository (Sangat Direkomendasikan)
1. Push / upload folder projek ini ke repository GitHub Anda.
2. Buka dashboard [Netlify](https://app.netlify.com/) dan pilih **Add new site** > **Import an existing project**.
3. Pilih repository GitHub Anda. Netlify akan otomatis mendeteksi:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. Klik **Deploy Site**. Netlify akan langsung meng-compile frontend dan serverless functions secara otomatis.

### Cara 2: Deploy lewat Netlify CLI
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Jalankan build: `npm run build`
3. Deploy: `netlify deploy --prod`

### Cara 3: Manual Drag & Drop
Jika menggunakan drag and drop di Netlify:
- Pastikan Anda meng-upload hasil build folder `dist` yang sudah berisi file `_redirects`.
- Disarankan menggunakan **Cara 1 (Git Repository)** agar serverless functions di folder `netlify/functions/` langsung aktif 100%.

