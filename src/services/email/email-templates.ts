import { SafeEmailTemplateData, EmailRenderResult } from './email-types';
import { EmailRenderer } from './email-renderer';

export class EmailTemplates {
  public static renderTemplate(
    templateKey: string,
    data: SafeEmailTemplateData
  ): EmailRenderResult {
    switch (templateKey) {
      case 'WELCOME':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Selamat Datang di Gogomi Store, {{customerName}}!',
          title: 'Selamat Datang di Gogomi Store 🎉',
          bodyContent:
            'Halo {{customerName}}, terima kasih telah mendaftar di Gogomi Store. Nikmati kemudahan membeli lisensi software, garansi replacement otomatis, dan koin cashback belanja.',
          ctaText: 'JELAJAHI PRODUK',
          ctaUrl: '/products',
          data,
        });

      case 'VERIFY_EMAIL':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Verifikasi Email Akun Gogomi Store Anda',
          title: 'Verifikasi Alamat Email',
          bodyContent:
            'Halo {{customerName}}, silakan tekan tombol di bawah untuk memverifikasi alamat email akun Anda. Link verifikasi ini berlaku selama 24 jam.',
          ctaText: 'VERIFIKASI EMAIL SEKARANG',
          ctaUrl: '{{verificationUrl}}',
          footerNote: 'Jika Anda tidak membuat akun di Gogomi Store, silakan abaikan email ini.',
          data,
        });

      case 'PASSWORD_RESET':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Reset Password Akun Gogomi Store',
          title: 'Permintaan Reset Password',
          bodyContent:
            'Kami menerima permintaan untuk mereset password akun Gogomi Store Anda. Silakan tekan tombol di bawah ini untuk membuat password baru.',
          ctaText: 'RESET PASSWORD SAYA',
          ctaUrl: '{{resetUrl}}',
          footerNote: 'Link ini hanya dapat digunakan 1 kali dan berlaku 60 menit. Jika bukan Anda yang meminta reset, segera amankan akun Anda.',
          data,
        });

      case 'PASSWORD_CHANGED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Password Akun Anda Berhasil Diubah',
          title: 'Password Berhasil Diperbarui',
          bodyContent:
            'Password untuk akun Gogomi Store Anda telah berhasil diubah. Jika perubahan ini tidak Anda lakukan, segera hubungi Customer Service kami.',
          ctaText: 'MASUK KE AKUN',
          ctaUrl: '/login',
          data,
        });

      case 'NEW_LOGIN':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Security Alert: Login Baru Terdeteksi',
          title: 'Login Baru Terdeteksi',
          bodyContent:
            'Aktivitas login baru terdeteksi pada akun Anda pada {{time}}. Jika ini adalah Anda, tidak ada tindakan yang diperlukan.',
          infoRows: [
            { label: 'Waktu Login', value: '{{time}}' },
            { label: 'Perangkat', value: '{{device}}' },
          ],
          ctaText: 'PERIKSA KEAMANAN AKUN',
          ctaUrl: '/account',
          data,
        });

      case 'ORDER_CREATED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Pesanan #{{orderNumber}} Berhasil Dibuat',
          title: 'Konfirmasi Pesanan Baru',
          bodyContent:
            'Halo {{customerName}}, pesanan #{{orderNumber}} telah berhasil dibuat. Silakan selesaikan pembayaran QRIS Anda sebelum masa berlaku pembayaran berakhir.',
          infoRows: [
            { label: 'Nomor Order', value: '#{{orderNumber}}' },
            { label: 'Produk', value: '{{productName}}' },
            { label: 'Varian', value: '{{variantName}}' },
            { label: 'Total Pembayaran', value: '{{amount}}' },
          ],
          ctaText: 'BAYAR SEKARANG',
          ctaUrl: '/payment/{{orderNumber}}',
          data,
        });

      case 'PAYMENT_SUCCESS':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Pembayaran Berhasil — Order #{{orderNumber}}',
          title: 'Pembayaran Diterima 🎉',
          bodyContent:
            'Terima kasih! Pembayaran sebesar {{amount}} untuk Order #{{orderNumber}} telah kami terima. Produk digital Anda sedang diproses oleh sistem otomatis.',
          infoRows: [
            { label: 'Nomor Order', value: '#{{orderNumber}}' },
            { label: 'Jumlah Dibayar', value: '{{amount}}' },
            { label: 'Metode Pembayaran', value: '{{paymentMethod}}' },
          ],
          ctaText: 'LIHAT PESANAN SAYA',
          // Guests get their private order link here; members fall back to their dashboard.
          ctaUrl: data.actionUrl ? '{{actionUrl}}' : '/account/orders',
          footerNote: data.actionUrl && String(data.actionUrl).includes('t=')
            ? 'Link ini bersifat pribadi dan berisi akses ke pesanan Anda. Jangan dibagikan kepada siapa pun.'
            : undefined,
          data,
        });

      case 'PAYMENT_EXPIRED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Pembayaran Order #{{orderNumber}} Kedaluwarsa',
          title: 'Pembayaran Kedaluwarsa',
          bodyContent:
            'Batas waktu pembayaran untuk Order #{{orderNumber}} telah berakhir. Anda dapat membuat pesanan baru kapan saja melalui katalog produk.',
          ctaText: 'BUAT PESANAN BARU',
          ctaUrl: '/products',
          data,
        });

      case 'ORDER_WAITING_STOCK':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Pesanan #{{orderNumber}} Sedang Dipersiapkan',
          title: 'Pesanan Menunggu Penyiapan Stok',
          bodyContent:
            'Pembayaran Anda sebesar {{amount}} aman. Tim operasional Gogomi Store sedang menyiapkan stok lisensi valid untuk {{productName}}.',
          infoRows: [
            { label: 'Nomor Order', value: '#{{orderNumber}}' },
            { label: 'Produk', value: '{{productName}}' },
            { label: 'Status', value: 'MENUNGGU ALOKASI STOK' },
          ],
          ctaText: 'LIHAT STATUS',
          ctaUrl: '/account/orders',
          data,
        });

      case 'PRODUCT_DELIVERED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Produk Anda Sudah Tersedia — Order #{{orderNumber}}',
          title: 'Akses Produk Digital Siap Digunakan! 📦',
          bodyContent:
            'Kabar gembira! Produk digital {{productName}} ({{variantName}}) untuk Order #{{orderNumber}} sudah siap digunakan.',
          infoRows: [
            { label: 'Nomor Order', value: '#{{orderNumber}}' },
            { label: 'Produk', value: '{{productName}}' },
            { label: 'Varian', value: '{{variantName}}' },
            { label: 'Status Akses', value: 'AKTIF' },
          ],
          ctaText: 'LIHAT PRODUK SAYA',
          ctaUrl: data.actionUrl && String(data.actionUrl).includes('t=') ? '{{actionUrl}}' : '/account/products',
          footerNote: data.actionUrl && String(data.actionUrl).includes('t=')
            ? 'Demi keamanan, kredensial tidak dikirimkan lewat email. Buka produk lewat tombol di atas. Link ini bersifat pribadi, jangan dibagikan kepada siapa pun.'
            : 'Demi keamanan, informasi kredensial lisensi tidak dikirimkan lewat email. Masuk ke dashboard akun Anda untuk melihat kredensial.',
          data,
        });

      case 'SUBSCRIPTION_EXPIRING':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Masa Aktif {{productName}} Berakhir Dalam {{daysRemaining}} Hari',
          title: 'Pemberitahuan Masa Aktif Langganan',
          bodyContent:
            'Masa aktif langganan digital {{productName}} Anda akan berakhir dalam {{daysRemaining}} hari. Lakukan perpanjangan sekarang agar akses Anda tidak terputus.',
          infoRows: [
            { label: 'Produk', value: '{{productName}}' },
            { label: 'Sisa Masa Aktif', value: '{{daysRemaining}} Hari' },
          ],
          ctaText: 'PERPANJANG SEKARANG',
          ctaUrl: '/account/renewals',
          data,
        });

      case 'SUBSCRIPTION_EXPIRED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Masa Aktif {{productName}} Telah Berakhir',
          title: 'Langganan Telah Berakhir',
          bodyContent:
            'Masa berlaku langganan {{productName}} Anda telah berakhir. Anda dapat melakukan perpanjangan melalui Pusat Renewal akun Anda.',
          ctaText: 'PERPANJANG LANGGANAN',
          ctaUrl: '/account/renewals',
          data,
        });

      case 'RENEWAL_COMPLETED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Perpanjangan {{productName}} Berhasil 🎉',
          title: 'Perpanjangan Masa Aktif Berhasil',
          bodyContent:
            'Perpanjangan untuk {{productName}} telah berhasil diproses. Masa aktif produk Anda kini resmi diperpanjang.',
          ctaText: 'LIHAT SUBSCRIPTION SAYA',
          ctaUrl: '/account/subscriptions',
          data,
        });

      case 'REPLACEMENT_WAITING_STOCK':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Permintaan Replacement {{productName}} Sedang Diproses',
          title: 'Replacement Garansi Dalam Proses',
          bodyContent:
            'Permintaan garansi replacement untuk {{productName}} sudah kami catat dan sedang menunggu alokasi stok baru yang valid.',
          ctaText: 'LIHAT STATUS REPLACEMENT',
          ctaUrl: '/account/products',
          data,
        });

      case 'REPLACEMENT_COMPLETED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Replacement Berhasil — Akses Baru Tersedia 📦',
          title: 'Garansi Replacement Selesai',
          bodyContent:
            'Akses replacement pengganti untuk {{productName}} sudah tersedia di akun Anda. Silakan masuk ke dashboard untuk melihat kredensial baru.',
          ctaText: 'LIHAT AKSES BARU',
          ctaUrl: '/account/products',
          footerNote: 'Informasi kredensial pengganti dapat dilihat setelah Anda login di dashboard akun.',
          data,
        });

      case 'REPLACEMENT_REJECTED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Informasi Permintaan Replacement {{productName}}',
          title: 'Permintaan Replacement Belum Dapat Disetujui',
          bodyContent:
            'Permintaan replacement untuk {{productName}} belum dapat disetujui saat ini. Silakan periksa detailnya di dashboard akun Anda.',
          ctaText: 'LIHAT DETAIL REPLACEMENT',
          ctaUrl: '/account/products',
          data,
        });

      case 'COIN_AVAILABLE':
        return EmailRenderer.renderBaseTemplate({
          subject: '{{coinAmount}} Store Coins Sudah Bisa Digunakan',
          title: 'Store Coins Siap Digunakan! 🪙',
          bodyContent:
            'Sebanyak {{coinAmount}} Store Coins reward belanja Anda sekarang sudah aktif dan dapat digunakan sebagai potongan pada pembelian berikutnya.',
          ctaText: 'CEK COIN SAYA',
          ctaUrl: '/account/coins',
          data,
        });

      case 'COIN_EXPIRING':
        return EmailRenderer.renderBaseTemplate({
          subject: '{{coinAmount}} Store Coins Akan Kedaluwarsa Dalam {{daysRemaining}} Hari',
          title: 'Pengingat Masa Berlaku Store Coins',
          bodyContent:
            'Sebanyak {{coinAmount}} Store Coins milik Anda akan kedaluwarsa dalam {{daysRemaining}} hari. Gunakan koin Anda sebelum masa berlaku habis.',
          ctaText: 'GUNAKAN COIN SEKARANG',
          ctaUrl: '/account/coins',
          data,
        });

      case 'COIN_RETURNED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Store Coins Anda Telah Dikembalikan',
          title: 'Pengembalian Store Coins',
          bodyContent:
            'Sebanyak {{coinAmount}} Store Coins telah dikembalikan ke saldo koin akun Anda.',
          ctaText: 'LIHAT SALDO COIN',
          ctaUrl: '/account/coins',
          data,
        });

      case 'LOYALTY_TIER_UPGRADED':
        return EmailRenderer.renderBaseTemplate({
          subject: '🏆 Selamat! Anda Sekarang Member {{tierName}}!',
          title: 'Kenaikan Level Keanggotaan VIP',
          bodyContent:
            'Selamat! Total transaksi Anda telah mencapai syarat level {{tierName}}. Anda berhak menikmati multiplier koin dan diskon perpanjangan eksklusif.',
          ctaText: 'LIHAT KEUNTUNGAN TIER',
          ctaUrl: '/account/loyalty',
          data,
        });

      case 'WAITLIST_RESTOCK':
        return EmailRenderer.renderBaseTemplate({
          subject: '{{productName}} Sudah Tersedia Kembali! 📦',
          title: 'Produk Impian Anda Restock!',
          bodyContent:
            'Kabar gembira! Stok untuk {{productName}} ({{variantName}}) kembali tersedia di Gogomi Store. Ketersediaan stok terbatas.',
          ctaText: 'BELI SEKARANG',
          ctaUrl: '/products',
          footerNote: 'Email ini dikirim karena Anda terdaftar pada waitlist restock produk ini.',
          data,
        });

      case 'PRICE_DROP':
        return EmailRenderer.renderBaseTemplate({
          subject: '📉 Harga {{productName}} Turun Menjadi Rp{{newPrice}}!',
          title: 'Notifikasi Penurunan Harga',
          bodyContent:
            'Produk {{productName}} ({{variantName}}) yang Anda pantau baru saja mengalami penurunan harga dari Rp{{previousPrice}} menjadi Rp{{newPrice}}!',
          ctaText: 'BELI SEKARANG',
          ctaUrl: '/products',
          data,
        });

      case 'REFERRAL_REWARDED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Reward Referral {{coinAmount}} Store Coins Diterima 🎉',
          title: 'Reward Referral Ditambahkan',
          bodyContent:
            'Selamat! Teman yang Anda undang telah berhasil melakukan transaksi pertama. Bonus {{coinAmount}} Store Coins telah dikreditkan.',
          ctaText: 'LIHAT PROGRAM REFERRAL',
          ctaUrl: '/account/referrals',
          data,
        });

      case 'SUPPORT_TICKET_CREATED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Ticket Support #{{ticketNumber}} Berhasil Dibuat',
          title: 'Ticket Support Diterima',
          bodyContent:
            'Ticket bantuan #{{ticketNumber}} telah kami terima. Tim CS Gogomi Store akan segera membalas kendala Anda.',
          ctaText: 'LIHAT TICKET SUPPORT',
          ctaUrl: '/account/support',
          data,
        });

      case 'SUPPORT_REPLY':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Balasan Baru untuk Ticket Support #{{ticketNumber}}',
          title: 'Ada Balasan dari Tim CS',
          bodyContent:
            'Tim Support CS Gogomi Store telah membalas Ticket bantuan #{{ticketNumber}}.',
          ctaText: 'LIHAT BALASAN SUPPORT',
          ctaUrl: '/account/support',
          data,
        });

      case 'SUPPORT_RESOLVED':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Ticket Support #{{ticketNumber}} Telah Diselesaikan',
          title: 'Ticket Support Selesai',
          bodyContent:
            'Ticket #{{ticketNumber}} telah ditandai selesai. Terima kasih telah menghubungi layanan bantuan Gogomi Store.',
          ctaText: 'LIHAT TICKET SUPPORT',
          ctaUrl: '/account/support',
          data,
        });

      case 'ADMIN_CRITICAL_ALERT':
        return EmailRenderer.renderBaseTemplate({
          subject: 'CRITICAL ALERT: {{reason}}',
          title: 'Operational Alert System',
          bodyContent:
            'Terdeteksi masalah operasional tingkat CRITICAL: {{reason}}. Segera periksa Control Panel Admin.',
          ctaText: 'BUKA ADMIN CONTROL PANEL',
          ctaUrl: '/admin/notifications',
          data,
        });

      case 'ORDER_ACCESS_LINK':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Link Pesanan #{{orderNumber}} — Gogomi Store',
          title: 'Link Pribadi Pesanan Anda',
          bodyContent:
            'Anda meminta link untuk membuka pesanan #{{orderNumber}}. Klik tombol di bawah untuk melihat status dan produk digital Anda. Jika bukan Anda yang meminta, abaikan email ini.',
          infoRows: [{ label: 'Nomor Order', value: '#{{orderNumber}}' }],
          ctaText: 'BUKA PESANAN SAYA',
          ctaUrl: '{{actionUrl}}',
          footerNote: 'Link ini bersifat pribadi. Jangan dibagikan kepada siapa pun.',
          data,
        });

      case 'CLAIM_ACCOUNT':
        return EmailRenderer.renderBaseTemplate({
          subject: 'Simpan Pesanan Anda ke Akun Gogomi Store',
          title: 'Aktifkan Akun Anda',
          bodyContent:
            'Halo {{customerName}}, klik tombol di bawah untuk membuat password dan menyimpan pesanan Anda ke akun Gogomi Store. Email ini otomatis terverifikasi, tidak perlu konfirmasi lagi. Link berlaku 24 jam.',
          ctaText: 'BUAT PASSWORD & AKTIFKAN AKUN',
          ctaUrl: '{{actionUrl}}',
          footerNote: 'Jika Anda tidak merasa membeli di Gogomi Store, abaikan email ini.',
          data,
        });

      default:
        return EmailRenderer.renderBaseTemplate({
          subject: 'Pemberitahuan dari Gogomi Store',
          title: 'Pemberitahuan Akun',
          bodyContent: 'Anda menerima pesan pemberitahuan baru dari Gogomi Store.',
          ctaText: 'BUKA DASHBOARD',
          ctaUrl: '/account',
          data,
        });
    }
  }
}
