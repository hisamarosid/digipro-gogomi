import { Role } from '@/../generated/prisma';

export const PERMISSIONS = {
  // 1. COMMERCE
  PRODUCT_VIEW: 'product:view',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_ARCHIVE: 'product:archive',

  ORDER_VIEW: 'order:view',
  ORDER_UPDATE: 'order:update',

  PAYMENT_VIEW: 'payment:view',
  PAYMENT_MANUAL_ACTION: 'payment:manual-action', // SENSITIVE

  // 2. INVENTORY
  INVENTORY_VIEW: 'inventory:view',
  INVENTORY_CREATE: 'inventory:create',
  INVENTORY_UPDATE: 'inventory:update',
  INVENTORY_VIEW_SENSITIVE: 'inventory:view-sensitive', // SENSITIVE: Reveals plain credentials

  // 3. OPERATIONS
  FULFILLMENT_VIEW: 'fulfillment:view',
  FULFILLMENT_RETRY: 'fulfillment:retry',
  FULFILLMENT_OVERRIDE: 'fulfillment:override', // SENSITIVE

  REPLACEMENT_VIEW: 'replacement:view',
  REPLACEMENT_PROCESS: 'replacement:process',
  REPLACEMENT_OVERRIDE: 'replacement:override', // SENSITIVE

  RENEWAL_VIEW: 'renewal:view',
  RENEWAL_PROCESS: 'renewal:process',

  // 4. CUSTOMERS
  CUSTOMER_VIEW: 'customer:view',
  CUSTOMER_UPDATE: 'customer:update',
  CUSTOMER_SUSPEND: 'customer:suspend', // SENSITIVE

  SUPPORT_VIEW: 'support:view',
  SUPPORT_REPLY: 'support:reply',

  // 5. SUPPLIERS
  SUPPLIER_VIEW: 'supplier:view',
  SUPPLIER_MANAGE: 'supplier:manage',

  SUPPLIER_CLAIM_VIEW: 'supplier-claim:view',
  SUPPLIER_CLAIM_CREATE: 'supplier-claim:create',
  SUPPLIER_CLAIM_UPDATE: 'supplier-claim:update',
  SUPPLIER_CLAIM_SUBMIT: 'supplier-claim:submit',
  SUPPLIER_CLAIM_RESOLVE: 'supplier-claim:resolve',
  SUPPLIER_CLAIM_VIEW_SENSITIVE: 'supplier-claim:view-sensitive', // SENSITIVE

  // 6. FINANCE & LOYALTY
  REPORTS_VIEW: 'reports:view',
  REPORTS_FINANCIAL: 'reports:financial', // SENSITIVE: Profit margins, COGS

  COIN_VIEW: 'coin:view',
  COIN_ADJUST: 'coin:adjust', // SENSITIVE: Manual point modification

  // 7. SYSTEM & ADMIN MANAGEMENT
  ADMIN_VIEW: 'admin:view',
  ADMIN_CREATE: 'admin:create', // SENSITIVE
  ADMIN_UPDATE: 'admin:update', // SENSITIVE
  ADMIN_DISABLE: 'admin:disable', // SENSITIVE

  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage', // SENSITIVE

  AUDIT_VIEW: 'audit:view',

  // 8. SECURITY & CRITICAL GOVERNANCE
  ROLE_MANAGE: 'role:manage', // SENSITIVE
  PERMISSION_MANAGE: 'permission:manage', // SENSITIVE

  PAYMENT_SETTINGS_MANAGE: 'payment-settings:manage', // SENSITIVE
  EMAIL_SETTINGS_MANAGE: 'email-settings:manage', // SENSITIVE
  FEATURE_FLAGS_MANAGE: 'feature-flags:manage', // SENSITIVE
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  code: PermissionCode;
  name: string;
  description: string;
  isSensitive: boolean;
}

export interface PermissionGroup {
  id: string;
  name: string;
  description: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'commerce',
    name: 'Commerce & Katalog',
    description: 'Manajemen produk, varian, kategori, pesanan, dan pembayaran umum',
    permissions: [
      { code: PERMISSIONS.PRODUCT_VIEW, name: 'Lihat Produk', description: 'Melihat katalog produk dan detail varian', isSensitive: false },
      { code: PERMISSIONS.PRODUCT_CREATE, name: 'Tambah Produk', description: 'Membuat produk dan varian baru', isSensitive: false },
      { code: PERMISSIONS.PRODUCT_UPDATE, name: 'Edit Produk', description: 'Mengubah harga, stok mode, dan deskripsi produk', isSensitive: false },
      { code: PERMISSIONS.PRODUCT_ARCHIVE, name: 'Arsipkan Produk', description: 'Menonaktifkan atau mengarsipkan produk', isSensitive: false },
      { code: PERMISSIONS.ORDER_VIEW, name: 'Lihat Pesanan', description: 'Melihat seluruh transaksi dan detail pesanan pelanggan', isSensitive: false },
      { code: PERMISSIONS.ORDER_UPDATE, name: 'Update Pesanan', description: 'Mengubah status pesanan dan catatan order', isSensitive: false },
      { code: PERMISSIONS.PAYMENT_VIEW, name: 'Lihat Pembayaran', description: 'Memantau log transaksi dan status pembayaran QRIS', isSensitive: false },
      { code: PERMISSIONS.PAYMENT_MANUAL_ACTION, name: 'Aksi Manual Pembayaran', description: 'Konfirmasi pembayaran manual atau refund uang', isSensitive: true },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventaris Digital',
    description: 'Manajemen stok kredensial, shared accounts, dan family groups',
    permissions: [
      { code: PERMISSIONS.INVENTORY_VIEW, name: 'Lihat Stok Inventaris', description: 'Melihat jumlah kuota stok dan daftar item tersamar', isSensitive: false },
      { code: PERMISSIONS.INVENTORY_CREATE, name: 'Tambah Stok', description: 'Menambahkan batch stok akun atau lisensi baru', isSensitive: false },
      { code: PERMISSIONS.INVENTORY_UPDATE, name: 'Update Stok', description: 'Mengubah masa aktif dan konfigurasi slot stok', isSensitive: false },
      { code: PERMISSIONS.INVENTORY_VIEW_SENSITIVE, name: 'Reveal Kredensial', description: 'Melihat username, password, dan token plaintext (Audit Log aktif)', isSensitive: true },
    ],
  },
  {
    id: 'operations',
    name: 'Operasional Toko',
    description: 'Fulfillment otomatis, garansi penggantian akun, dan renewal',
    permissions: [
      { code: PERMISSIONS.FULFILLMENT_VIEW, name: 'Lihat Antrean Fulfillment', description: 'Melihat status pengiriman kredensial ke pelanggan', isSensitive: false },
      { code: PERMISSIONS.FULFILLMENT_RETRY, name: 'Retry Fulfillment', description: 'Mengulang proses pengiriman yang gagal atau pending', isSensitive: false },
      { code: PERMISSIONS.FULFILLMENT_OVERRIDE, name: 'Override Fulfillment', description: 'Paksa alokasi slot khusus secara manual', isSensitive: true },
      { code: PERMISSIONS.REPLACEMENT_VIEW, name: 'Lihat Klaim Penggantian', description: 'Melihat permohonan garansi akun dari pelanggan', isSensitive: false },
      { code: PERMISSIONS.REPLACEMENT_PROCESS, name: 'Proses Garansi', description: 'Menerima atau menolak permohonan garansi akun', isSensitive: false },
      { code: PERMISSIONS.REPLACEMENT_OVERRIDE, name: 'Override Garansi', description: 'Paksa penggantian akun di luar kuota garansi standar', isSensitive: true },
      { code: PERMISSIONS.RENEWAL_VIEW, name: 'Lihat Renewal', description: 'Melihat akun yang mendekati jatuh tempo perpanjangan', isSensitive: false },
      { code: PERMISSIONS.RENEWAL_PROCESS, name: 'Proses Renewal', description: 'Memproses pesanan perpanjangan akun pelanggan', isSensitive: false },
    ],
  },
  {
    id: 'customers',
    name: 'Pelanggan & CS',
    description: 'Data pelanggan, tiket bantuan support, dan komunikasi',
    permissions: [
      { code: PERMISSIONS.CUSTOMER_VIEW, name: 'Lihat Data Pelanggan', description: 'Melihat profil pelanggan, riwayat belanja, dan kontak', isSensitive: false },
      { code: PERMISSIONS.CUSTOMER_UPDATE, name: 'Edit Profil Pelanggan', description: 'Mengubah nama, email, dan detail akun pelanggan', isSensitive: false },
      { code: PERMISSIONS.CUSTOMER_SUSPEND, name: 'Suspend Pelanggan', description: 'Memblokir atau menonaktifkan akun pelanggan', isSensitive: true },
      { code: PERMISSIONS.SUPPORT_VIEW, name: 'Lihat Tiket CS', description: 'Membaca tiket keluhan dan pertanyaan customer', isSensitive: false },
      { code: PERMISSIONS.SUPPORT_REPLY, name: 'Balas Tiket CS', description: 'Mengirimkan respon chat bantuan dan mengubah status tiket', isSensitive: false },
    ],
  },
  {
    id: 'suppliers',
    name: 'Supplier & Klaim Vendor',
    description: 'Manajemen vendor penyedia stok dan klaim garansi eksternal',
    permissions: [
      { code: PERMISSIONS.SUPPLIER_VIEW, name: 'Lihat Data Supplier', description: 'Melihat daftar vendor dan kontak WhatsApp/Email', isSensitive: false },
      { code: PERMISSIONS.SUPPLIER_MANAGE, name: 'Kelola Supplier', description: 'Menambah, mengedit, atau menonaktifkan data supplier', isSensitive: false },
      { code: PERMISSIONS.SUPPLIER_CLAIM_VIEW, name: 'Lihat Klaim Supplier', description: 'Melihat daftar klaim garansi yang diajukan ke supplier', isSensitive: false },
      { code: PERMISSIONS.SUPPLIER_CLAIM_CREATE, name: 'Buat Klaim Supplier', description: 'Mendaftarkan insiden akun rusak ke supplier', isSensitive: false },
      { code: PERMISSIONS.SUPPLIER_CLAIM_UPDATE, name: 'Update Klaim Supplier', description: 'Memperbarui status investigasi klaim vendor', isSensitive: false },
      { code: PERMISSIONS.SUPPLIER_CLAIM_SUBMIT, name: 'Submit Pesan ke Supplier', description: 'Mengirim draf pesan klaim WhatsApp/Email ke vendor', isSensitive: false },
      { code: PERMISSIONS.SUPPLIER_CLAIM_RESOLVE, name: 'Selesaikan Klaim Supplier', description: 'Menerima penggantian akun baru dari vendor', isSensitive: false },
      { code: PERMISSIONS.SUPPLIER_CLAIM_VIEW_SENSITIVE, name: 'Reveal Kredensial Klaim', description: 'Melihat kredensial supplier yang bermasalah secara penuh', isSensitive: true },
    ],
  },
  {
    id: 'finance',
    name: 'Keuangan & Loyalty',
    description: 'Analitik profit, COGS, dan saldo koin loyalitas',
    permissions: [
      { code: PERMISSIONS.REPORTS_VIEW, name: 'Lihat Laporan Penjualan', description: 'Melihat volume order dan tren penjualan harian', isSensitive: false },
      { code: PERMISSIONS.REPORTS_FINANCIAL, name: 'Laporan Finansial & Profit', description: 'Melihat margin kotor, estimasi laba bersih, dan COGS', isSensitive: true },
      { code: PERMISSIONS.COIN_VIEW, name: 'Lihat Riwayat Koin', description: 'Melihat mutasi poin/koin loyalitas seluruh user', isSensitive: false },
      { code: PERMISSIONS.COIN_ADJUST, name: 'Adjust Saldo Koin', description: 'Menambah atau memotong saldo koin secara manual', isSensitive: true },
    ],
  },
  {
    id: 'system',
    name: 'Sistem & Administrator',
    description: 'Manajemen akun admin, pengaturan dasar, dan log audit',
    permissions: [
      { code: PERMISSIONS.ADMIN_VIEW, name: 'Lihat Daftar Admin', description: 'Melihat siapa saja staf dan administrator toko', isSensitive: false },
      { code: PERMISSIONS.ADMIN_CREATE, name: 'Tambah Admin Baru', description: 'Membuat akun administrator staf baru', isSensitive: true },
      { code: PERMISSIONS.ADMIN_UPDATE, name: 'Edit Akun Admin', description: 'Mengubah profil dan info administrator', isSensitive: true },
      { code: PERMISSIONS.ADMIN_DISABLE, name: 'Nonaktifkan Admin', description: 'Memblokir akses administrator staf', isSensitive: true },
      { code: PERMISSIONS.SETTINGS_VIEW, name: 'Lihat Pengaturan Toko', description: 'Melihat nama toko, WhatsApp kontak, dan info umum', isSensitive: false },
      { code: PERMISSIONS.SETTINGS_MANAGE, name: 'Kelola Pengaturan Toko', description: 'Mengubah nama toko, logo, dan pengaturan dasar', isSensitive: true },
      { code: PERMISSIONS.AUDIT_VIEW, name: 'Lihat Audit Logs', description: 'Melihat riwayat aktivitas dan operasi staf admin', isSensitive: false },
    ],
  },
  {
    id: 'security',
    name: 'Keamanan & Tata Kelola',
    description: 'Hak akses tingkat tinggi, rahasia gateway, dan feature flags',
    permissions: [
      { code: PERMISSIONS.ROLE_MANAGE, name: 'Kelola Role Pengguna', description: 'Mengubah tingkatan role admin atau user', isSensitive: true },
      { code: PERMISSIONS.PERMISSION_MANAGE, name: 'Kelola Izin (Permissions)', description: 'Mengatur matriks izin eksplisit tiap admin staf', isSensitive: true },
      { code: PERMISSIONS.PAYMENT_SETTINGS_MANAGE, name: 'Kelola Gateway QRIS', description: 'Mengubah merchant key, secret, dan webhook AutoGoPay', isSensitive: true },
      { code: PERMISSIONS.EMAIL_SETTINGS_MANAGE, name: 'Kelola Provider Email', description: 'Mengubah kredensial SMTP, Resend, dan Mailgun', isSensitive: true },
      { code: PERMISSIONS.FEATURE_FLAGS_MANAGE, name: 'Kelola Feature Flags', description: 'Mengaktifkan atau mematikan modul sistem secara live', isSensitive: true },
    ],
  },
];

/**
 * Default operational permissions for regular ADMIN role.
 * Sensitive permissions are omitted and must be granted explicitly.
 */
export const DEFAULT_ADMIN_PERMISSIONS: ReadonlySet<PermissionCode> = new Set([
  PERMISSIONS.PRODUCT_VIEW,
  PERMISSIONS.PRODUCT_CREATE,
  PERMISSIONS.PRODUCT_UPDATE,
  PERMISSIONS.PRODUCT_ARCHIVE,

  PERMISSIONS.ORDER_VIEW,
  PERMISSIONS.ORDER_UPDATE,

  PERMISSIONS.PAYMENT_VIEW,

  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_CREATE,
  PERMISSIONS.INVENTORY_UPDATE,

  PERMISSIONS.FULFILLMENT_VIEW,
  PERMISSIONS.FULFILLMENT_RETRY,

  PERMISSIONS.REPLACEMENT_VIEW,
  PERMISSIONS.REPLACEMENT_PROCESS,

  PERMISSIONS.RENEWAL_VIEW,
  PERMISSIONS.RENEWAL_PROCESS,

  PERMISSIONS.CUSTOMER_VIEW,
  PERMISSIONS.CUSTOMER_UPDATE,

  PERMISSIONS.SUPPORT_VIEW,
  PERMISSIONS.SUPPORT_REPLY,

  PERMISSIONS.SUPPLIER_VIEW,
  PERMISSIONS.SUPPLIER_MANAGE,

  PERMISSIONS.SUPPLIER_CLAIM_VIEW,
  PERMISSIONS.SUPPLIER_CLAIM_CREATE,
  PERMISSIONS.SUPPLIER_CLAIM_UPDATE,
  PERMISSIONS.SUPPLIER_CLAIM_SUBMIT,
  PERMISSIONS.SUPPLIER_CLAIM_RESOLVE,

  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.COIN_VIEW,

  PERMISSIONS.ADMIN_VIEW,
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.AUDIT_VIEW,
]);

/**
 * Permissions that are strictly restricted to SUPER_ADMIN or require explicit grant.
 */
export const SENSITIVE_PERMISSIONS: ReadonlySet<PermissionCode> = new Set(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.filter((p) => p.isSensitive).map((p) => p.code))
);

export const ALL_PERMISSIONS: PermissionCode[] = Object.values(PERMISSIONS);
