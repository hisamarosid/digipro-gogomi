import React from 'react';
import { PolicyHeader } from '@/components/storefront/PolicyHeader';
import { ShieldCheck, RefreshCw, Coins, LifeBuoy, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <PolicyHeader
        title="Kebijakan Garansi & Refund (Warranty Policy)"
        description="Gogomi Store memberikan perlindungan garansi penuh 100% untuk setiap produk digital yang dibeli. Pelajari syarat klaim, mekanisme penggantian akun, dan kebijakan refund dana."
      />

      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 md:p-8 space-y-8 text-xs text-slate-300 leading-relaxed">
        
        {/* SECTION 1 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            <span>1. Ketentuan Garansi Produk Digital 100%</span>
          </div>
          <p>
            1.1. Masa garansi berlaku <strong className="text-white">penuh sesuai durasi varian</strong> yang dibeli (misalnya: 30 Hari, 90 Hari, 1 Tahun) terhitung sejak status pesanan dinyatakan <strong className="text-emerald-500 font-bold">COMPLETED</strong>.
          </p>
          <p>
            1.2. Garansi mencakup kendala berikut:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>Kredensial atau password akun tidak dapat digunakan untuk login (*invalid login*).</li>
            <li>Status langganan akun premium terhenti sebelum durasi garansi berakhir.</li>
            <li>Undangan Family Member dibatalkan atau dikeluarkan dari grup family.</li>
            <li>Lisensi software gagal diaktivasi saat pengiriman pertama kali.</li>
          </ul>
        </section>

        {/* SECTION 2 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <RefreshCw className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>2. Mekanisme Replacement (Penggantian Akun/Slot Baru)</span>
          </div>
          <p>
            2.1. Jika klaim garansi disetujui, sistem Gogomi Store akan mengalokasikan <strong className="text-blue-600 dark:text-cyan-400 font-bold">akun, slot, atau lisensi pengganti baru</strong> tanpa biaya tambahan.
          </p>
          <p>
            2.2. Apabila produk pengganti sedang habis (*Out of Stock*), klaim Anda akan secara otomatis masuk ke dalam <strong className="text-amber-500 font-bold">Antrean Restok Prioritas</strong> dan diproses segera setelah stok baru tersedia.
          </p>
          <p>
            2.3. Durasi garansi untuk akun pengganti akan melanjutkan sisa hari dari masa garansi pesanan awal.
          </p>
        </section>

        {/* SECTION 3 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <Coins className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>3. Kebijakan Refund (Gogomi Coins / Pengembalian Cash)</span>
          </div>
          <p>
            3.1. Refund berupa pengembalian dana tunai (*cash*) atau <strong className="text-blue-600 dark:text-cyan-400 font-bold">Gogomi Coins</strong> dapat diajukan apabila:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>Stok pengganti tidak tersedia dalam waktu 3x24 jam sejak pengajuan garansi.</li>
            <li>Terjadi kesalahan sistem pengiriman yang tidak dapat diperbaiki.</li>
          </ul>
          <p>
            3.2. Nilai refund akan dihitung secara proporsional berdasarkan sisa hari pemakaian garansi (*Prorated Refund*) atau 100% jika produk belum pernah digunakan sama sekali.
          </p>
          <p>
            3.3. Refund via <strong className="text-blue-600 dark:text-cyan-400 font-bold">Gogomi Coins</strong> diproses instan tanpa potongan biaya. Refund via pengembalian uang (Transfer/QRIS) diproses dalam 1-2 hari kerja.
          </p>
        </section>

        {/* SECTION 4 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <span>4. Pengecualian Garansi (Non-Coverage)</span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-2">
            <p className="font-bold text-xs text-amber-500">Garansi TIDAK BERLAKU apabila:</p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300">
              <li>Pembeli melanggar aturan penggunaan akun Shared (misal: mengubah password master).</li>
              <li>Akun terkena sanksi/banned akibat aktivitas terlarang yang dilakukan oleh pembeli.</li>
              <li>Masa garansi pesanan telah habis melebihi batas durasi varian.</li>
              <li>Pembeli tidak dapat melampirkan bukti screenshot atau nomor pesanan yang valid.</li>
            </ul>
          </div>
        </section>

        {/* SECTION 5 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-2">
            <LifeBuoy className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>5. Cara Mengajukan Klaim Garansi</span>
          </div>
          <p>
            Untuk mengajukan klaim garansi dengan mudah, ikuti langkah berikut:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2 font-medium">
            <li>Masuk ke menu <Link href="/account/orders" className="text-blue-600 dark:text-cyan-400 font-bold hover:underline">Akun Saya &rarr; Riwayat Pesanan</Link>.</li>
            <li>Pilih pesanan yang mengalami kendala, lalu klik tombol <strong className="text-white">Ajukan Garansi / Replacement</strong>.</li>
            <li>Atau buat tiket bantuan langsung di menu <Link href="/account/support" className="text-blue-600 dark:text-cyan-400 font-bold hover:underline">Tiket Bantuan CS</Link> dengan melampirkan screenshot kendala.</li>
            <li>Tim CS akan merespon dan menyelesaikan kendala Anda maksimal 1x24 jam.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
