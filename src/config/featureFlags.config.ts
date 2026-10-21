export type FeatureKey =
  // CORE / IMPORTANT
  | 'STORE_COINS'
  | 'WEB_NOTIFICATIONS'
  | 'EMAIL_NOTIFICATIONS'
  | 'REPLACEMENT'
  | 'RENEWAL'
  | 'SUPPLIER_WARRANTY'
  // OPTIONAL
  | 'WISHLIST'
  | 'WAITLIST'
  | 'REFERRAL'
  | 'LOYALTY_TIER'
  | 'PRICE_ALERT'
  | 'RECENTLY_VIEWED'
  | 'RECOMMENDATIONS'
  | 'MILESTONE';

export interface FeatureFlagMeta {
  key: FeatureKey;
  label: string;
  category: 'CORE' | 'OPTIONAL';
  description: string;
  defaultState: boolean;
  activeWarningMessage?: string;
}

export const FEATURE_FLAGS_CONFIG: Record<FeatureKey, FeatureFlagMeta> = {
  STORE_COINS: {
    key: 'STORE_COINS',
    label: 'Store Coin System',
    category: 'CORE',
    description: 'Sistem koin belanja & cashback loyalty untuk potongan harga checkout.',
    defaultState: true,
  },
  WEB_NOTIFICATIONS: {
    key: 'WEB_NOTIFICATIONS',
    label: 'Web Notification Bell',
    category: 'CORE',
    description: 'Notifikasi in-app bell pada header customer dan admin.',
    defaultState: true,
  },
  EMAIL_NOTIFICATIONS: {
    key: 'EMAIL_NOTIFICATIONS',
    label: 'Email Notifications',
    category: 'CORE',
    description: 'Pengiriman email otomatis untuk kwitansi, reset password, & garansi.',
    defaultState: true,
  },
  REPLACEMENT: {
    key: 'REPLACEMENT',
    label: 'Garansi Replacement',
    category: 'CORE',
    description: 'Sistem pengajuan klaim garansi replacement akun/kredensial bermasalah.',
    defaultState: true,
  },
  RENEWAL: {
    key: 'RENEWAL',
    label: 'Pusat Renewal & Perpanjangan',
    category: 'CORE',
    description: 'Menu pengingat & perpanjangan masa aktif produk langganan.',
    defaultState: true,
  },
  SUPPLIER_WARRANTY: {
    key: 'SUPPLIER_WARRANTY',
    label: 'Supplier Warranty Claim',
    category: 'CORE',
    description: 'Klaim garansi pihak ketiga dan rekonsiliasi ke supplier.',
    defaultState: true,
  },
  WISHLIST: {
    key: 'WISHLIST',
    label: 'Wishlist & Produk Favorit',
    category: 'OPTIONAL',
    description: 'Fitur menyimpan produk favorit oleh pelanggan.',
    defaultState: true,
  },
  WAITLIST: {
    key: 'WAITLIST',
    label: 'Waitlist Stok Produk',
    category: 'OPTIONAL',
    description: 'Pendaftaran antrean pemberitahuan restock saat produk habis.',
    defaultState: false,
    activeWarningMessage: 'Ada pendaftaran antrean waitlist pelanggan. Mematikan fitur ini tidak akan menghapus data tersebut.',
  },
  REFERRAL: {
    key: 'REFERRAL',
    label: 'Program Referral',
    category: 'OPTIONAL',
    description: 'Program komisi & koin bonus dari ajakan pengguna baru.',
    defaultState: false,
    activeWarningMessage: 'Program referral sedang memiliki reward pending/klaim. Mematikan fitur ini tidak akan menghapus data referral.',
  },
  LOYALTY_TIER: {
    key: 'LOYALTY_TIER',
    label: 'Loyalty Tier & VIP Levels',
    category: 'OPTIONAL',
    description: 'Level keanggotaan Bronze, Gold, VIP, & Platinum.',
    defaultState: false,
  },
  PRICE_ALERT: {
    key: 'PRICE_ALERT',
    label: 'Price Drop Alert',
    category: 'OPTIONAL',
    description: 'Notifikasi otomatis saat harga produk digital mengalami penurunan.',
    defaultState: false,
  },
  RECENTLY_VIEWED: {
    key: 'RECENTLY_VIEWED',
    label: 'Recently Viewed Products',
    category: 'OPTIONAL',
    description: 'Riwayat produk terakhir yang dilihat pelanggan.',
    defaultState: false,
  },
  RECOMMENDATIONS: {
    key: 'RECOMMENDATIONS',
    label: 'Rekomendasi Produk Smart',
    category: 'OPTIONAL',
    description: 'Rekomendasi produk berdasarkan riwayat belanja.',
    defaultState: false,
  },
  MILESTONE: {
    key: 'MILESTONE',
    label: 'Milestone & Achievements',
    category: 'OPTIONAL',
    description: 'Pencapaian transaksi & lencana pelanggan.',
    defaultState: false,
  },
};
