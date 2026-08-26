import React from 'react';
import { ShieldCheck, FileText, X, AlertTriangle, BookOpen, Lock } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'disclaimer';
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, type }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-[#12121a] border border-[#242436] rounded-2xl p-6 text-slate-200 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1f1f2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#ff5b14]/10 border border-[#ff5b14]/30 flex items-center justify-center text-[#ff5b14]">
              {type === 'privacy' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {type === 'privacy' ? 'Kebijakan Privasi (Privacy Policy)' : 'Pernyataan Penyangkalan (Legal Disclaimer)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Dokumen resmi panduan perlindungan hak cipta &amp; privasi AntiTimpa
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {type === 'privacy' ? (
          <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 bg-[#181824] rounded-xl border border-[#262638] space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                1. Pengumpulan &amp; Penggunaan Data Pengguna
              </h4>
              <p className="text-[11px] text-slate-400">
                Platform AntiTimpa hanya menyimpan data otentikasi akun (username, token sesi terenkripsi, progres membaca lokal, dan riwayat preferensi komik) guna memberikan pengalaman membaca yang mulus dan aman. Kami tidak menjual atau membagikan data pengguna kepada pihak ketiga mana pun.
              </p>
            </div>

            <div className="p-3 bg-[#181824] rounded-xl border border-[#262638] space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#ff5b14]" />
                2. Keamanan Akun &amp; Perlindungan Kredensial
              </h4>
              <p className="text-[11px] text-slate-400">
                Sistem menerapkan kebijakan mitigasi brute-force, transmisi data terenkripsi HTTPS/TLS standar industri, serta pembatasan sesi lokal guna mencegah akses tidak sah terhadap akun Anda.
              </p>
            </div>

            <div className="p-3 bg-[#181824] rounded-xl border border-[#262638] space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                3. Cookie &amp; Penyimpanan Lokal
              </h4>
              <p className="text-[11px] text-slate-400">
                Penyimpanan lokal (LocalStorage) digunakan khusus untuk menyimpan cache progres baca chapter, preferensi tema, dan token sesi login Anda demi kenyamanan saat kembali mengunjungi situs.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
            <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-200 space-y-1.5">
              <h4 className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Pernyataan Pratinjau Hak Cipta (Preview &amp; Fair Use Notice)
              </h4>
              <p className="text-[11px] leading-relaxed italic text-amber-200/90">
                "all the comics in the website are only previews of the original comics, there may be many language errors, character names, and story lines. for the original version, please buy the comic if it's available in your city"
              </p>
            </div>

            <div className="p-3 bg-[#181824] rounded-xl border border-[#262638] space-y-1">
              <h4 className="font-bold text-white">1. Batasan Tanggung Jawab Konten</h4>
              <p className="text-[11px] text-slate-400">
                Seluruh gambar, karakter, judul seri, dan materi grafis komik (Manga, Manhwa, Manhua) yang diindeks dalam website ini merupakan hak cipta dan merek dagang eksklusif dari masing-masing kreator, komikus, dan penerbit aslinya. Website ini bertindak sebagai antarmuka katalog pratinjau yang merujuk pada feed dan tautan pihak ketiga.
              </p>
            </div>

            <div className="p-3 bg-[#181824] rounded-xl border border-[#262638] space-y-1">
              <h4 className="font-bold text-white">2. Kebijakan Dukungan Karya Orisinal</h4>
              <p className="text-[11px] text-slate-400">
                Kami sangat mengimbau para pembaca untuk senantiasa mendukung komikus dan industri komik dengan membeli komik cetak fisik resmi atau berlangganan platform orisinal berlisensi jika tersedia di wilayah Anda.
              </p>
            </div>

            <div className="p-3 bg-[#181824] rounded-xl border border-[#262638] space-y-1">
              <h4 className="font-bold text-white">3. Prosedur Pemberitahuan &amp; Penarikan Konten (DMCA / Takedown Notice)</h4>
              <p className="text-[11px] text-slate-400">
                Jika Anda adalah pemilik sah hak cipta atau perwakilan resminya dan ingin mengajukan penarikan konten, silakan kirimkan pemberitahuan resmi (Notice &amp; Takedown) dengan menyertakan bukti kepemilikan dan tautan terkait. Tim kami berkomitmen meninjau dan menghapus tautan atau konten yang dipersengketakan dalam waktu 1x24 jam kerja.
              </p>
            </div>
          </div>
        )}

        {/* Footer Action */}
        <div className="pt-2 flex justify-end border-t border-[#1f1f2e]">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#ff5b14] hover:bg-[#e04e0e] text-white font-bold text-xs rounded-xl shadow cursor-pointer transition-all active:scale-95"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
