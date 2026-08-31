import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, Database, Server, RefreshCw, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const PrivacyPolicyView: React.FC = () => {
  const { systemSettings } = useApp();
  const siteName = systemSettings?.siteName || 'AntiTimpa';
  const contactEmail = 'jefaruan627@gmail.com';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#07070a] text-slate-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1f1f2e]">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-[#ff5b14] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Kembali ke Beranda</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Kebijakan Aktif Terverifikasi
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff5b14]/10 border border-[#ff5b14]/30 text-[#ff5b14] text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            Dokumen Legal Resmi
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Kebijakan Privasi ({siteName})
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Terakhir Diperbarui: 31 Agustus 2026 • Berlaku Efektif untuk Seluruh Pengguna Platform {siteName}
          </p>
        </div>

        {/* Executive Summary Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#12121c] border border-[#232335] text-xs leading-relaxed text-slate-300 space-y-2.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Komitmen Perlindungan Privasi Pengguna
          </h2>
          <p>
            Privasi dan keamanan data Anda merupakan prioritas fundamental bagi <strong>{siteName}</strong>. Dokumen Kebijakan Privasi ini menjelaskan secara transparan bagaimana kami mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pribadi Anda saat mengakses dan menggunakan layanan web reader kami, termasuk integrasi login pihak ketiga seperti Google OAuth.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">

          {/* Section 1 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-[#ff5b14]" />
              1. Informasi yang Kami Kumpulkan
            </h3>
            <p>
              Kami hanya mengumpulkan informasi yang benar-benar esensial untuk mengoperasikan platform pembaca komik dan sinkronisasi akun Anda:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Data Autentikasi Google OAuth &amp; Akun:</strong> Saat Anda memilih masuk menggunakan akun Google, kami menerima informasi profil publik dasar yang Anda izinkan melalui Google API, yaitu: nama tampilan (display name), alamat email resmi, dan URL foto profil publik (avatar). Kami <strong>tidak pernah</strong> memiliki akses ke kata sandi Google Anda.
              </li>
              <li>
                <strong className="text-slate-200">Data Progres Baca &amp; Preferensi (Lokal &amp; Database):</strong> Riwayat chapter terakhir yang dibaca, daftar komik favorit (bookmark), dan preferensi antarmuka (mode vertikal/webtoon, tema tampilan).
              </li>
              <li>
                <strong className="text-slate-200">Data Teknis &amp; Log Keamanan:</strong> Informasi perangkat dasar seperti tipe browser (User-Agent), alamat IP terenkripsi untuk mitigasi serangan brute-force, dan stempel waktu akses (*timestamp*).
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              2. Tujuan dan Penggunaan Informasi
            </h3>
            <p>
              Informasi yang dikumpulkan digunakan semata-mata untuk tujuan fungsional dan teknis berikut:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Memverifikasi identitas pengguna dan menyediakan akses ke fitur akun (bookmark, sinkronisasi progres chapter di berbagai perangkat).</li>
              <li>Memastikan integritas platform, mencegah penyalahgunaan sistem scraping masif, serta melindungi server dari serangan DDoS.</li>
              <li>Menyesuaikan kenyamanan membaca berdasarkan preferensi tata letak yang dipilih pengguna.</li>
            </ul>
            <div className="mt-3 p-3.5 rounded-xl bg-[#141420] border border-[#262638] text-xs text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Jaminan Tanpa Monetisasi Data:</strong> Kami <u>tidak pernah</u> menjual, menyewakan, memperdagangkan, atau membagikan data pribadi atau alamat email Anda kepada pihak ketiga pengiklan mana pun.
              </span>
            </div>
          </section>

          {/* Section 3 - Google API Services User Data Policy */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              3. Kepatuhan Kebijakan Data Pengguna Google API
            </h3>
            <p>
              Penggunaan dan transfer informasi yang diterima dari Akun Google oleh {siteName} ke aplikasi atau sistem lain sepenuhnya mematuhi{' '}
              <a 
                href="https://developers.google.com/terms/api-services-user-data-policy" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[#ff5b14] hover:underline font-semibold"
              >
                Google API Services User Data Policy
              </a>
              , termasuk ketentuan Pembatasan Penggunaan (<em>Limited Use requirements</em>).
            </p>
            <p className="text-slate-400">
              Data otentikasi Google hanya digunakan untuk proses identifikasi sesi login di platform {siteName} dan tidak digunakan untuk tujuan pelatihan model kecerdasan buatan ataupun profiling iklan.
            </p>
          </section>

          {/* Section 4 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              4. Penyimpanan, Cookie, dan Keamanan Data
            </h3>
            <p>
              Kami menerapkan standar keamanan teknis berlapis untuk melindungi data Anda:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Enkripsi Data:</strong> Seluruh komunikasi antar peramban pengguna dan server dienkripsi menggunakan protokol HTTPS/TLS 1.3 standar industri.
              </li>
              <li>
                <strong className="text-slate-200">Cookie &amp; LocalStorage:</strong> LocalStorage browser digunakan untuk menyimpan token sesi terenkripsi dan cache offline chapter, sehingga Anda tidak perlu login berulang kali.
              </li>
              <li>
                <strong className="text-slate-200">Isolasi Kredensial:</strong> Akses database dibatasi melalui Role-Based Access Control (RBAC) dan Row Level Security (RLS) pada lapisan Supabase &amp; PostgreSQL.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              5. Hak Pengguna &amp; Penghapusan Data (Data Deletion)
            </h3>
            <p>
              Sebagai pengguna, Anda memiliki kontrol penuh atas data Anda:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Anda dapat menghapus riwayat baca dan bookmark kapan saja secara langsung melalui menu antarmuka aplikasi.</li>
              <li>
                Anda berhak meminta penghapusan akun beserta seluruh data profil secara permanen dari basis data kami dengan mengirimkan permohonan ke email resmi kami di <strong>{contactEmail}</strong>. Permohonan akan diproses dalam 1x24 jam kerja.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400" />
              6. Hubungi Kami
            </h3>
            <p>
              Apabila Anda memiliki pertanyaan, klarifikasi, atau masukan mengenai Kebijakan Privasi ini, silakan hubungi saluran resmi kami:
            </p>
            <div className="p-4 rounded-xl bg-[#141420] border border-[#252538] space-y-1.5 text-xs">
              <p><strong className="text-white">Platform:</strong> {siteName} Official</p>
              <p><strong className="text-white">Email Dukungan &amp; Legal:</strong> <a href={`mailto:${contactEmail}`} className="text-[#ff5b14] hover:underline font-medium">{contactEmail}</a></p>
              <p><strong className="text-white">WhatsApp Admin:</strong> {systemSettings?.adminPhone || '089514441988'}</p>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-[#1f1f2e] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {siteName}. Hak Cipta Dilindungi Undang-Undang.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-white transition-colors">
              Syarat &amp; Ketentuan Layanan (Terms of Service)
            </Link>
            <Link to="/" className="text-[#ff5b14] hover:underline font-semibold">
              Kembali ke Beranda
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
