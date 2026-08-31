import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldAlert, BookOpen, AlertTriangle, Scale, Mail, ArrowLeft, CheckCircle2, UserCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TermsOfServiceView: React.FC = () => {
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Scale className="w-3.5 h-3.5" />
              Syarat &amp; Ketentuan Resmi
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#ff5b14]/10 border border-[#ff5b14]/30 text-[#ff5b14] text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            Ketentuan Penggunaan Layanan
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Syarat &amp; Ketentuan Layanan (Terms of Service)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Terakhir Diperbarui: 31 Agustus 2026 • Dokumen Kontrak Penggunaan Platform {siteName}
          </p>
        </div>

        {/* Executive Summary Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#12121c] border border-[#232335] text-xs leading-relaxed text-slate-300 space-y-2.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Penerimaan Syarat &amp; Ketentuan
          </h2>
          <p>
            Dengan mengakses, menjelajahi, mendaftar, atau menggunakan layanan platform web <strong>{siteName}</strong>, Anda menyatakan telah membaca, memahami, dan menyetujui untuk terikat secara hukum oleh Syarat dan Ketentuan Layanan ini. Jika Anda tidak menyetujui ketentuan ini, mohon untuk tidak melanjutkan penggunaan situs kami.
          </p>
        </div>

        {/* Policy Sections */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">

          {/* Section 1 - Official Preview Disclaimer */}
          <section className="p-5 sm:p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              1. Pernyataan Pratinjau &amp; Hak Cipta (Preview &amp; Fair Use Notice)
            </h3>
            <div className="p-4 rounded-xl bg-[#161622] border border-amber-500/30 text-amber-200 text-xs italic leading-relaxed">
              "all the comics in the website are only previews of the original comics, there may be many language errors, character names, and story lines. for the original version, please buy the comic if it's available in your city"
            </div>
            <p className="text-slate-300">
              Seluruh judul komik, karakter, ilustrasi, alur cerita, dan merek dagang yang ditampilkan pada katalog {siteName} adalah properti dan hak cipta eksklusif dari masing-masing kreator, komikus, ilustrator, dan penerbit aslinya.
            </p>
            <p className="text-slate-400">
              Platform {siteName} bertindak sebagai antarmuka pengindeksan visual dan katalog pratinjau. Kami sangat mendorong dan mengimbau seluruh pembaca untuk selalu membeli komik fisik berlisensi resmi atau berlangganan platform resmi penerbit guna mendukung industri dan kreator komik.
            </p>
          </section>

          {/* Section 2 - User Account & Registration */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              2. Akun Pengguna &amp; Autentikasi Google
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Keamanan Kredensial:</strong> Saat Anda membuat akun atau masuk via Google OAuth, Anda bertanggung jawab penuh untuk menjaga keamanan akses perangkat Anda.
              </li>
              <li>
                <strong className="text-slate-200">Akurasi Informasi:</strong> Anda setuju untuk memberikan data yang sah dan tidak menyalahgunakan identitas pihak lain saat berinteraksi di platform.
              </li>
              <li>
                <strong className="text-slate-200">Batasan Satu Akun:</strong> Akun bersifat personal dan tidak diperkenankan untuk disewakan atau diperjualbelikan kepada pihak ketiga.
              </li>
            </ul>
          </section>

          {/* Section 3 - Acceptable Use Policy */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-400" />
              3. Ketentuan Penggunaan yang Diperbolehkan &amp; Larangan
            </h3>
            <p>Dalam menggunakan platform {siteName}, pengguna dilarang keras untuk:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>Melakukan serangan penolakan layanan (DDoS), eksploitasi celah keamanan, atau mencoba membobol sistem basis data.</li>
              <li>Menggunakan bot otomatisasi atau scraper agresif yang mengganggu kinerja infrastruktur server.</li>
              <li>Mengunggah komentar yang mengandung ujaran kebencian, penipuan, tautan malware, atau materi yang melanggar hukum yang berlaku di Republik Indonesia.</li>
              <li>Mencoba merekayasa balik (*reverse-engineer*) kode sumber atau memanipulasi token autentikasi.</li>
            </ul>
          </section>

          {/* Section 4 - DMCA Takedown Procedure */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-purple-400" />
              4. Prosedur Pemberitahuan &amp; Penarikan Konten (DMCA / Takedown Notice)
            </h3>
            <p>
              Kami sangat menghormati hak kekayaan intelektual orang lain dan siap menindaklanjuti pemberitahuan klaim hak cipta yang sah:
            </p>
            <p className="text-slate-400">
              Jika Anda adalah pemegang hak cipta sah atau agen resminya dan meyakini bahwa terdapat konten di katalog kami yang perlu ditinjau atau diturunkan, silakan hubungi tim legal kami melalui email <strong>{contactEmail}</strong> dengan menyertakan:
            </p>
            <ol className="list-decimal pl-5 space-y-1.5 text-slate-400">
              <li>Identitas resmi dan bukti kepemilikan hak cipta atas karya terkait.</li>
              <li>URL spesifik di situs kami yang memuat konten yang dipersengketakan.</li>
              <li>Pernyataan itikad baik bahwa penggunaan materi tersebut tidak diizinkan oleh pemegang hak cipta.</li>
            </ol>
            <div className="p-3 rounded-xl bg-[#141420] border border-[#252538] text-xs text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Tim kami akan meninjau dan menghapus tautan atau konten yang dilaporkan dalam waktu <strong>1x24 jam kerja</strong>.</span>
            </div>
          </section>

          {/* Section 5 - Disclaimer of Warranties */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              5. Batasan Tanggung Jawab (Limitation of Liability)
            </h3>
            <p className="text-slate-400">
              Layanan {siteName} disediakan berdasarkan prinsip "apa adanya" (<em>as is</em>) dan "sebagaimana tersedia" (<em>as available</em>) tanpa jaminan apa pun, baik tersurat maupun tersirat. Kami tidak bertanggung jawab atas gangguan koneksi internet pengguna, pemeliharaan server berkala, atau ketidaktersediaan sementara layanan pihak ketiga.
            </p>
          </section>

          {/* Section 6 - Modification & Contact */}
          <section className="p-5 sm:p-6 rounded-2xl bg-[#0f0f17] border border-[#1e1e2d] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              6. Perubahan Ketentuan &amp; Kontak Resmi
            </h3>
            <p className="text-slate-400">
              Kami berhak memperbarui Syarat &amp; Ketentuan Layanan ini sewaktu-waktu. Setiap pembaruan material akan diumumkan melalui stempel tanggal di bagian atas halaman ini. Penggunaan berkelanjutan atas platform setelah pembaruan menandakan persetujuan Anda terhadap ketentuan yang diperbarui.
            </p>
            <div className="p-4 rounded-xl bg-[#141420] border border-[#252538] space-y-1.5 text-xs">
              <p><strong className="text-white">Email Resmi:</strong> <a href={`mailto:${contactEmail}`} className="text-[#ff5b14] hover:underline font-medium">{contactEmail}</a></p>
              <p><strong className="text-white">Dukungan Admin:</strong> {systemSettings?.adminPhone || '089514441988'}</p>
            </div>
          </section>

        </div>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-[#1f1f2e] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} {siteName}. Hak Cipta Dilindungi Undang-Undang.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Kebijakan Privasi (Privacy Policy)
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
