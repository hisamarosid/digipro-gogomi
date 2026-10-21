import React from 'react';
import { PolicyHeader } from '@/components/storefront/PolicyHeader';
import { Lock, ShieldCheck, Database, Key, EyeOff, Server } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <PolicyHeader
        title="Kebijakan Privasi (Privacy Policy)"
        description="Gogomi Store berkomitmen penuh untuk melindungi privasi, data pribadi, dan keamanan transaksi setiap pelanggan kami. Ketahui bagaimana data Anda dikumpulkan, disimpan, dan dilindungi."
      />

      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-8 text-xs text-slate-300 leading-relaxed">
        
        {/* SECTION 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <Database className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>1. Informasi Data yang Dikumpulkan</span>
          </div>
          <p>
            Saat Anda melakukan registrasi atau transaksi di Gogomi Store, kami mengumpulkan informasi terbatas berikut:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li><strong className="text-white">Identitas Pengguna:</strong> Nama Lengkap, Alamat Email, dan Nomor WhatsApp.</li>
            <li><strong className="text-white">Data Pengiriman (Family Member):</strong> Email tujuan aktivasi undangan produk Family.</li>
            <li><strong className="text-white">Data Transaksi:</strong> ID Pesanan, Metode Pembayaran QRIS, dan Riwayat Koin.</li>
            <li><strong className="text-white">Data Log Teknis:</strong> Alamat IP, User-Agent browser, dan cookie sesi terenkripsi.</li>
          </ul>
        </section>

        {/* SECTION 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <Key className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>2. Enkripsi Kredensial AES-256-GCM</span>
          </div>
          <p>
            2.1. Seluruh kredensial akun master, password lisensi, dan data sensitif yang disimpan di database Gogomi Store dienkripsi menggunakan standar kriptografi tertinggi: <strong className="text-blue-600 dark:text-cyan-400 font-mono">AES-256-GCM (Authenticated Encryption)</strong>.
          </p>
          <p>
            2.2. Password akun pelanggan di-hash menggunakan algoritma aman <strong className="text-blue-600 dark:text-cyan-400 font-mono">BCrypt</strong> dengan *salt* acak sehingga tidak pernah tersimpan dalam bentuk teks biasa.
          </p>
        </section>

        {/* SECTION 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <EyeOff className="h-4 w-4 text-indigo-500 dark:text-purple-400" />
            <span>3. Komitmen Privasi &amp; Pihak Ketiga</span>
          </div>
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-cyan-200 space-y-2">
            <p className="font-bold text-xs text-blue-600 dark:text-cyan-400">
              Jaminan 100% Bebas Penjualan Data:
            </p>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Gogomi Store <strong className="text-white">TIDAK PERNAH</strong> menjual, menyewakan, atau membagikan informasi pribadi atau riwayat transaksi Anda kepada broker data atau pihak iklan manapun. Informasi Anda hanya digunakan secara eksklusif untuk proses pengiriman produk dan layanan bantuan CS.
            </p>
          </div>
        </section>

        {/* SECTION 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <Server className="h-4 w-4 text-emerald-500" />
            <span>4. Cookie &amp; Keamanan Akses Guest</span>
          </div>
          <p>
            4.1. Kami menggunakan cookie <strong className="text-white">HttpOnly &amp; SameSite</strong> untuk mengamankan sesi login dan token keranjang belanja.
          </p>
          <p>
            4.2. Pembeli tanpa akun (Guest Checkout) akan diberikan <strong className="text-blue-600 dark:text-cyan-400 font-mono">Guest Token</strong> unik yang dapat digunakan untuk mengakses halaman pesanan secara mandiri tanpa membocorkan data ke publik.
          </p>
        </section>

        {/* SECTION 5 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>5. Hak Pembaruan &amp; Penghapusan Data</span>
          </div>
          <p>
            Pelanggan memiliki hak penuh untuk memperbarui profil atau meminta penghapusan akun beserta riwayat data pribadi melalui pengajuan Tiket Bantuan CS.
          </p>
        </section>
      </div>
    </div>
  );
}
