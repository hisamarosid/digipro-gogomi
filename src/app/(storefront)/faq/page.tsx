import React from 'react';
import { PolicyHeader } from '@/components/storefront/PolicyHeader';
import { HelpCircle } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      q: 'Berapa lama proses pengiriman produk setelah pembayaran?',
      a: 'Pengiriman dilakukan secara instan dan otomatis setelah pembayaran QRIS Anda terkonfirmasi settlement oleh sistem.',
    },
    {
      q: 'Aplikasi pembayaran apa saja yang didukung oleh QRIS AutoGoPay?',
      a: 'Anda dapat menggunakan seluruh aplikasi m-Banking (BCA Mobile, Livin Mandiri, BRImo, BNI Mobile) serta E-Wallet (GoPay, OVO, DANA, ShopeePay, LinkAja).',
    },
    {
      q: 'Bagaimana jika stok habis saat saya sudah membayar?',
      a: 'Sistem kami memiliki perlindungan anti-double-stock. Jika terjadi kehabisan stok setelah pembayaran, status pesanan akan masuk ke NEEDS_FULFILLMENT dan admin akan segera memproses penggantian stok.',
    },
    {
      q: 'Apakah saya bisa melakukan checkout sebagai Guest (tanpa akun)?',
      a: 'Ya, Anda dapat checkout sebagai Guest. Kredensial produk akan otomatis dikirimkan ke email yang Anda masukkan saat checkout.',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <PolicyHeader
        title="Pertanyaan Umum (FAQ)"
        description="Temukan jawaban cepat untuk pertanyaan yang paling sering diajukan mengenai metode pembayaran QRIS, pengiriman otomatis instan, serta garansi produk."
      />

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="rounded-3xl glass-panel border border-slate-800 bg-slate-900/60 p-5 space-y-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-blue-600 dark:text-cyan-400 shrink-0" />
              <span>{faq.q}</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed pl-6">{faq.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
