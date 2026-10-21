import { SafeNotificationMetadata } from './notification-types';

/**
 * Replaces placeholders like {{orderNumber}} with safe plaintext metadata values
 */
export function formatNotificationTemplate(
  templateStr: string,
  metadata?: SafeNotificationMetadata
): string {
  if (!templateStr) return '';
  if (!metadata) return templateStr;

  let formatted = templateStr;
  for (const [key, val] of Object.entries(metadata)) {
    if (val !== undefined && val !== null) {
      // Ensure no credentials or sensitive data can ever be rendered
      if (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('credential') ||
        key.toLowerCase().includes('pin') ||
        key.toLowerCase().includes('license') ||
        key.toLowerCase().includes('secret')
      ) {
        continue;
      }

      const strVal = typeof val === 'number' ? val.toLocaleString('id-ID') : String(val);
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      formatted = formatted.replace(regex, strVal);
    }
  }
  return formatted;
}

export const CustomerTemplates = {
  ACCOUNT_CREATED: {
    title: 'Selamat Datang di Gogomi Store!',
    message: 'Akun Anda berhasil dibuat. Jelajahi produk digital unggulan kami sekarang!',
    actionUrl: '/account',
  },
  EMAIL_VERIFIED: {
    title: 'Email Berhasil Diverifikasi',
    message: 'Akun Anda sekarang telah terverifikasi penuh.',
    actionUrl: '/account',
  },
  PASSWORD_CHANGED: {
    title: 'Password Berhasil Diubah',
    message: 'Password akun Anda baru saja diperbarui. Jika bukan Anda, hubungi tim CS segera.',
    actionUrl: '/account',
  },
  NEW_LOGIN_DETECTED: {
    title: 'Login Baru Terdeteksi',
    message: 'Ada aktivitas login baru ke akun Anda pada {{time}}.',
    actionUrl: '/account',
  },
  ORDER_CREATED: {
    title: 'Pesanan Berhasil Dibuat',
    message: 'Order #{{orderNumber}} berhasil dibuat. Selesaikan pembayaran sebelum batas waktu berakhir.',
    actionUrl: '/payment/{{orderNumber}}',
  },
  ORDER_PROCESSING: {
    title: 'Pesanan Sedang Diproses',
    message: 'Order #{{orderNumber}} sedang dalam proses penyiapan produk digital.',
    actionUrl: '/account/orders',
  },
  ORDER_WAITING_STOCK: {
    title: 'Pesanan Menunggu Ketersediaan Stok',
    message: 'Pembayaran Order #{{orderNumber}} aman. Tim kami sedang menyiapkan stok akses valid.',
    actionUrl: '/account/orders',
  },
  ORDER_COMPLETED: {
    title: 'Pesanan Selesai 🎉',
    message: 'Semua produk dari Order #{{orderNumber}} telah tersedia dan dapat digunakan.',
    actionUrl: '/account/products',
  },
  PAYMENT_SUCCESS: {
    title: 'Pembayaran Berhasil',
    message: 'Pembayaran untuk Order #{{orderNumber}} berhasil diterima. Terima kasih!',
    actionUrl: '/account/orders',
  },
  PAYMENT_EXPIRED: {
    title: 'Pembayaran Kedaluwarsa',
    message: 'Batas waktu pembayaran untuk Order #{{orderNumber}} telah berakhir.',
    actionUrl: '/account/orders',
  },
  PRODUCT_DELIVERED: {
    title: 'Produk Anda Sudah Tersedia',
    message: 'Akses untuk {{productName}} ({{variantName}}) sudah dapat digunakan di akun Anda.',
    actionUrl: '/account/products',
  },
  PRODUCT_ACCESS_UPDATED: {
    title: 'Akses Produk Sedang Diperbarui',
    message: 'Informasi akses untuk {{productName}} sedang diperbarui oleh sistem.',
    actionUrl: '/account/products',
  },
  SUBSCRIPTION_EXPIRING: {
    title: 'Masa Aktif Berakhir Dalam {{daysRemaining}} Hari',
    message: 'Langganan {{productName}} Anda akan berakhir. Perpanjang sekarang agar akses tetap aktif.',
    actionUrl: '/account/renewals',
  },
  RENEWAL_COMPLETED: {
    title: 'Perpanjangan Langganan Berhasil',
    message: 'Masa aktif {{productName}} Anda telah berhasil diperpanjang.',
    actionUrl: '/account/subscriptions',
  },
  REPLACEMENT_REQUESTED: {
    title: 'Permintaan Garansi Replacement Diterima',
    message: 'Permintaan replacement untuk {{productName}} sedang diproses oleh sistem.',
    actionUrl: '/account/products',
  },
  REPLACEMENT_COMPLETED: {
    title: 'Replacement Garansi Berhasil',
    message: 'Akses pengganti untuk {{productName}} sudah tersedia di akun Anda.',
    actionUrl: '/account/products',
  },
  COIN_AVAILABLE: {
    title: 'Store Coins Sudah Bisa Digunakan',
    message: 'Sebanyak {{coinAmount}} Store Coins sekarang dapat digunakan untuk potongan belanja.',
    actionUrl: '/account/coins',
  },
  COIN_RETURNED: {
    title: 'Store Coins Dikembalikan',
    message: 'Sebanyak {{coinAmount}} Store Coins telah dikembalikan ke saldo Anda.',
    actionUrl: '/account/coins',
  },
  LOYALTY_TIER_UPGRADED: {
    title: '🏆 Selamat! Anda Naik ke Tier {{tierName}}!',
    message: 'Nikmati multiplier koin belanja lebih tinggi dan keuntungan VIP eksklusif.',
    actionUrl: '/account/loyalty',
  },
  WAITLIST_PRODUCT_AVAILABLE: {
    title: 'Produk Impian Anda Restock! 📦',
    message: 'Stok {{productName}} ({{variantName}}) kembali tersedia. Beli sebelum kehabisan!',
    actionUrl: '/products',
  },
  PRICE_DROP: {
    title: '📉 Harga Produk {{productName}} Turun!',
    message: '{{productName}} ({{variantName}}) turun harga menjadi Rp{{newPrice}}!',
    actionUrl: '/products',
  },
  REFERRAL_REWARDED: {
    title: 'Reward Referral Diterima 🎉',
    message: 'Bonus {{coinAmount}} Store Coins dari program referral telah ditambahkan.',
    actionUrl: '/account/referrals',
  },
  SUPPORT_REPLY: {
    title: 'Balasan Baru dari Support CS',
    message: 'Tim CS Gogomi Store membalas Ticket #{{ticketNumber}}.',
    actionUrl: '/account/support',
  },
};

export const AdminTemplates = {
  PAYMENT_AMOUNT_MISMATCH: {
    title: 'CRITICAL: Payment Amount Mismatch',
    message: 'Nominal pembayaran gateway tidak sesuai dengan amount Order #{{orderNumber}}.',
    actionUrl: '/admin/orders',
  },
  FULFILLMENT_WAITING_STOCK: {
    title: 'Pesanan Berbayar Menunggu Stok',
    message: 'Order #{{orderNumber}} ({{variantName}}) berstatus PAID tetapi belum memiliki stok eligible.',
    actionUrl: '/admin/operations/fulfillment',
  },
  FULFILLMENT_CRITICAL_DELAY: {
    title: 'CRITICAL: Fulfillment Terlambat',
    message: 'Order #{{orderNumber}} telah berstatus PAID lebih dari 30 menit namun belum selesai.',
    actionUrl: '/admin/operations/fulfillment',
  },
  INVENTORY_LOW: {
    title: 'Stok Digital Hampir Habis',
    message: 'Produk {{variantName}} hanya tersisa {{affectedCount}} stok eligible.',
    actionUrl: '/admin/inventory',
  },
  INVENTORY_OUT: {
    title: 'CRITICAL: Stok Digital Habis Total',
    message: 'Produk {{variantName}} tidak memiliki stok eligible tersisa.',
    actionUrl: '/admin/inventory',
  },
  SHARED_MASTER_INVALID: {
    title: 'CRITICAL: Shared Account Master Invalid',
    message: 'Akun Shared {{productName}} ditandai INVALID dan memengaruhi {{affectedCount}} customer aktif.',
    actionUrl: '/admin/subscriptions',
  },
  SUPPLIER_REPLACEMENT_RATE_WARNING: {
    title: 'WARNING: Replacement Rate Supplier Tinggi',
    message: 'Supplier {{name}} mengalami lonjakan tingkat klaim garansi.',
    actionUrl: '/admin/suppliers',
  },
};
