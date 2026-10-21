import React from 'react';
import Link from 'next/link';
import { PolicyHeader } from '@/components/storefront/PolicyHeader';
import {
  LifeBuoy,
  FileText,
  Lock,
  ShieldCheck,
  HelpCircle,
  MessageSquare,
  Send,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Key,
  Users,
  RefreshCw,
  Coins,
} from 'lucide-react';

export default function HelpHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <PolicyHeader
        title="Pusat Bantuan & Kebijakan Layanan (Helpdesk)"
        description="Temukan informasi lengkap mengenai syarat layanan, kebijakan garansi, privasi data, serta panduan bantuan penggunaan produk digital di Gogomi Store."
      />

      {/* QUICK POLICY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/terms"
          className="group rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-3 hover:border-blue-500/50 transition duration-200"
        >
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition">Syarat &amp; Ketentuan</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Ketentuan hak dan kewajiban penggunaan produk digital, aturan akun shared, serta lisensi software.
            </p>
          </div>
          <span className="inline-flex items-center text-xs font-bold text-blue-600 dark:text-cyan-400 gap-1 pt-2">
            Baca Selengkapnya &rarr;
          </span>
        </Link>

        <Link
          href="/privacy"
          className="group rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-3 hover:border-blue-500/50 transition duration-200"
        >
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition">Kebijakan Privasi</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Jaminan enkripsi data AES-256-GCM, perlindungan informasi pribadi, dan privasi transaksi Anda.
            </p>
          </div>
          <span className="inline-flex items-center text-xs font-bold text-blue-600 dark:text-cyan-400 gap-1 pt-2">
            Baca Selengkapnya &rarr;
          </span>
        </Link>

        <Link
          href="/refund-policy"
          className="group rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-3 hover:border-blue-500/50 transition duration-200"
        >
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base group-hover:text-amber-500 transition">Kebijakan Garansi &amp; Refund</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Syarat klaim garansi 100%, sistem replacement otomatis, dan mekanisme refund dana/koin.
            </p>
          </div>
          <span className="inline-flex items-center text-xs font-bold text-amber-500 gap-1 pt-2">
            Baca Selengkapnya &rarr;
          </span>
        </Link>
      </div>

      {/* POPULAR HELP TOPICS */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            <span>Panduan Bantuan Populer</span>
          </h2>
          <Link href="/faq" className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline">
            Lihat Semua FAQ &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-bold">
              <RefreshCw className="h-4 w-4" />
              <span>Bagaimana cara klaim garansi akun bermasalah?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Masuk ke menu <strong className="text-white">Akun Saya &rarr; Tiket Bantuan</strong> atau gunakan tombol garansi pada rincian pesanan. Tim CS akan merespon dan memberikan kredensial pengganti dalam 1x24 jam.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-bold">
              <Users className="h-4 w-4" />
              <span>Apa perbedaan Dedicated Account, Shared Account, dan Family Member?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              <strong className="text-white">Dedicated Account</strong> mendapatkan 1 akun privat utuh. <strong className="text-white">Shared Account</strong> menggunakan 1 akun privat yang dibagi slot profil aman. <strong className="text-white">Family Member</strong> menggunakan email pribadi Anda via undangan resmi.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-bold">
              <Key className="h-4 w-4" />
              <span>Bagaimana cara cek pesanan tanpa login akun (Guest)?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Gunakan link pesanan rahasia atau simpan <strong className="text-white">Guest Token</strong> yang dikirimkan saat checkout. Anda juga dapat menghubungi CS WhatsApp dengan menyertakan Nomor Pesanan.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-blue-600 dark:text-cyan-400 font-bold">
              <Coins className="h-4 w-4" />
              <span>Bagaimana cara mengumpulkan dan menukar Gogomi Coins?</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Setiap transaksi sukses akan memberikan cashback koin. Koin yang terkumpul dapat digunakan langsung untuk memotong pembayaran pesanan berikutnya hingga 100%!
            </p>
          </div>
        </div>
      </div>

      {/* LIVE CS SUPPORT CARDS */}
      <div className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/80 p-6 md:p-8 space-y-4 text-white">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
          <span>Butuh Bantuan Langsung dari Tim Customer Service?</span>
        </h2>
        <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
          Tim CS Gogomi Store siap membantu kendala transaksi, pertanyaan garansi, atau konsultasi produk setiap hari jam 08.00 - 23.00 WIB.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="https://wa.me/6281234567890?text=Halo%20Admin%20Gogomi%20Store%2C%20saya%20butuh%20bantuan"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md transition"
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp CS (+6281234567890)</span>
          </a>

          <a
            href="https://t.me/gogomistore"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-md transition"
          >
            <Send className="h-4 w-4" />
            <span>Telegram CS (@gogomistore)</span>
          </a>

          <Link
            href="/account/support"
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-100 transition"
          >
            <LifeBuoy className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
            <span>Buat Tiket Bantuan Garansi</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
