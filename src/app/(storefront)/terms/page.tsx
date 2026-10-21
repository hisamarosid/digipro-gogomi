import React from 'react';
import { PolicyHeader } from '@/components/storefront/PolicyHeader';
import { FileText, ShieldAlert, CheckCircle2, AlertTriangle, Scale, Lock, RefreshCw } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <PolicyHeader
        title="Syarat & Ketentuan Layanan (Terms of Service)"
        description="Harap membaca Syarat & Ketentuan ini secara saksama sebelum melakukan pembelian di Gogomi Store. Dengan bertransaksi, Anda dianggap menyetujui seluruh aturan layanan di bawah ini."
      />

      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-8 text-xs text-slate-300 leading-relaxed">
        
        {/* SECTION 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <FileText className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>1. Ketentuan Umum &amp; Legalitas Produk</span>
          </div>
          <p>
            1.1. Gogomi Store menyediakan lisensi software legal, akun produktivitas premium, serta aset digital resmi.
          </p>
          <p>
            1.2. Seluruh kredensial dan lisensi dikirimkan secara otomatis atau manual sesuai dengan masa garansi dan varian produk yang Anda pilih saat checkout.
          </p>
          <p>
            1.3. Pembeli bertanggung jawab penuh atas kerahasiaan kredensial yang telah dikirimkan oleh sistem Gogomi Store.
          </p>
        </section>

        {/* SECTION 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>2. Aturan Penggunaan Berdasarkan Delivery Model</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-white block font-bold text-xs">Dedicated Account (1 Account = 1 Customer)</strong>
              <p className="text-[11px] text-slate-400">
                Pembeli mendapatkan akses akun privat penuh. Pembeli diperbolehkan mengganti password dan profil selama sesuai instruksi.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-blue-600 dark:text-cyan-400 block font-bold text-xs">Shared Account (1 Account = N Customers)</strong>
              <p className="text-[11px] text-slate-400">
                Pembeli mendapatkan 1 slot profil khusus. <strong className="text-rose-500 font-bold">DILARANG KERAS</strong> mengganti password master akun, mengubah PIN slot milik pengguna lain, atau mengundang pihak ketiga.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-indigo-500 dark:text-purple-400 block font-bold text-xs">Family Member (1 Family = N Members)</strong>
              <p className="text-[11px] text-slate-400">
                Pembeli dikirimkan undangan resmi via email pribadi. Pembeli wajib memasukkan email yang valid saat checkout.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <strong className="text-emerald-500 block font-bold text-xs">License Key &amp; Digital Asset</strong>
              <p className="text-[11px] text-slate-400">
                Kode serial/lisensi resmi dikirimkan langsung dan wajib diaktivasi dalam batas waktu garansi yang ditentukan.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <Lock className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>3. Pembayaran &amp; Pengiriman Otomatis</span>
          </div>
          <p>
            3.1. Pembayaran diproses secara instan melalui gateway QRIS AutoGoPay.
          </p>
          <p>
            3.2. Setelah status pembayaran terkonfirmasi <strong className="text-emerald-500 font-bold">PAID / SETTLEMENT</strong>, sistem fulfillment akan otomatis mengalokasikan stok dan menampilkan kredensial pada halaman rincian pesanan.
          </p>
          <p>
            3.3. Jika terjadi penundaan stok (*Needs Fulfillment*), pesanan akan diproses otomatis oleh antrean FIFO sistem atau oleh tim admin maksimal 1x24 jam.
          </p>
        </section>

        {/* SECTION 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <ShieldAlert className="h-4 w-4 text-rose-500" />
            <span>4. Larangan &amp; Sanksi Pelanggaran</span>
          </div>
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2">
            <p className="font-bold flex items-center gap-1.5 text-xs text-rose-500">
              <AlertTriangle className="h-4 w-4" />
              <span>Tindakan Terlarang pada Akun Shared &amp; Family:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>Mengubah email, password, atau metode pembayaran akun master.</li>
              <li>Menggunakan slot profil milik pengguna lain pada produk Shared Account.</li>
              <li>Menjual kembali (*resell*) akun tanpa persetujuan tertulis dari Gogomi Store.</li>
              <li>Melakukan spamming, aktivitas ilegal, atau penggunaan melebihi batas batas kapasitas slot.</li>
            </ul>
            <p className="text-[11px] text-rose-500 font-bold pt-1">
              Pelanggaran atas ketentuan di atas akan mengakibatkan HANGUSNYA GARANSI secara permanen tanpa pengembalian dana (*non-refundable*).
            </p>
          </div>
        </section>

        {/* SECTION 5 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <Scale className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>5. Penyelesaian Sengketa</span>
          </div>
          <p>
            Jika terjadi kendala teknis atau ketidaksesuaian pesanan, Pembeli wajib menghubungi Customer Support via Tiket Bantuan sebelum mengajukan sengketa pihak ketiga. Gogomi Store berkomitmen menyelesaikan setiap klaim dalam waktu 1x24 jam.
          </p>
        </section>
      </div>
    </div>
  );
}
