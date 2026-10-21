import {
  LayoutDashboard,
  Package,
  FolderTree,
  Key,
  ShoppingBag,
  CreditCard,
  Tag,
  Users,
  RefreshCw,
  LifeBuoy,
  ShieldAlert,
  Settings,
  Sparkles,
  Coins,
  Activity,
  Truck,
  TrendingUp,
  Bell,
  Gift,
  Mail,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { PERMISSIONS, PermissionCode } from '@/lib/auth/permissions';

export interface AdminNavItem {
  name: string;
  href: string;
  icon: any;
  color: string;
  superAdminOnly?: boolean;
  requiredPermission?: PermissionCode | PermissionCode[];
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'UTAMA',
    items: [
      { name: 'Dashboard Overview', href: '/admin', icon: LayoutDashboard, color: 'text-blue-500' },
    ],
  },
  {
    title: 'PRODUK & STOK',
    items: [
      { name: 'Produk Digital', href: '/admin/products', icon: Package, color: 'text-cyan-500', requiredPermission: PERMISSIONS.PRODUCT_VIEW },
      { name: 'Kategori Produk', href: '/admin/categories', icon: FolderTree, color: 'text-indigo-500', requiredPermission: PERMISSIONS.PRODUCT_VIEW },
      { name: 'Stok Dedicated / Key', href: '/admin/inventory', icon: Key, color: 'text-emerald-500', requiredPermission: PERMISSIONS.INVENTORY_VIEW },
      { name: 'Akun Bersama (Shared)', href: '/admin/inventory/shared', icon: Users, color: 'text-cyan-400', requiredPermission: PERMISSIONS.INVENTORY_VIEW },
      { name: 'Grup Family (Plan)', href: '/admin/inventory/families', icon: Users, color: 'text-indigo-400', requiredPermission: PERMISSIONS.INVENTORY_VIEW },
      { name: 'Mail Center & OTP Provider', href: '/admin/mail-center', icon: Mail, color: 'text-cyan-400', requiredPermission: PERMISSIONS.INVENTORY_VIEW },
      { name: 'Operations Center', href: '/admin/operations/fulfillment', icon: Activity, color: 'text-sky-500', requiredPermission: [PERMISSIONS.FULFILLMENT_VIEW, PERMISSIONS.REPLACEMENT_VIEW] },
    ],
  },
  {
    title: 'PENJUALAN & KEUANGAN',
    items: [
      { name: 'Daftar Pesanan', href: '/admin/orders', icon: ShoppingBag, color: 'text-amber-500', requiredPermission: PERMISSIONS.ORDER_VIEW },
      { name: 'Pembayaran QRIS', href: '/admin/payments', icon: CreditCard, color: 'text-violet-500', requiredPermission: PERMISSIONS.PAYMENT_VIEW },
      { name: 'Analitik Profit & COGS', href: '/admin/reports/profit', icon: TrendingUp, color: 'text-emerald-500', requiredPermission: [PERMISSIONS.REPORTS_FINANCIAL, PERMISSIONS.REPORTS_VIEW] },
      { name: 'Kupon Promo', href: '/admin/coupons', icon: Tag, color: 'text-rose-500', requiredPermission: [PERMISSIONS.PRODUCT_VIEW, PERMISSIONS.ORDER_VIEW] },
    ],
  },
  {
    title: 'PELANGGAN & RETENSI',
    items: [
      { name: 'Data Pelanggan', href: '/admin/customers', icon: Users, color: 'text-teal-500', requiredPermission: PERMISSIONS.CUSTOMER_VIEW },
      { name: 'Langganan Aktif', href: '/admin/subscriptions', icon: RefreshCw, color: 'text-amber-500', requiredPermission: [PERMISSIONS.ORDER_VIEW, PERMISSIONS.RENEWAL_VIEW] },
      { name: 'Pusat Renewal', href: '/admin/renewals', icon: RefreshCw, color: 'text-blue-500', requiredPermission: PERMISSIONS.RENEWAL_VIEW },
      { name: 'Loyalty Coins', href: '/admin/loyalty', icon: Coins, color: 'text-amber-500', requiredPermission: PERMISSIONS.COIN_VIEW },
      { name: 'Loyalty Tiers', href: '/admin/loyalty/tiers', icon: Sparkles, color: 'text-amber-500', requiredPermission: [PERMISSIONS.COIN_VIEW, PERMISSIONS.SETTINGS_MANAGE] },
      { name: 'Program Referral', href: '/admin/referrals', icon: Gift, color: 'text-indigo-500', requiredPermission: [PERMISSIONS.CUSTOMER_VIEW, PERMISSIONS.REPORTS_VIEW] },
      { name: 'Waitlist Restok', href: '/admin/waitlist', icon: Bell, color: 'text-cyan-500', requiredPermission: [PERMISSIONS.INVENTORY_VIEW, PERMISSIONS.PRODUCT_VIEW] },
      { name: 'Growth & Conversion', href: '/admin/growth', icon: TrendingUp, color: 'text-cyan-500', requiredPermission: PERMISSIONS.REPORTS_VIEW },
    ],
  },
  {
    title: 'SUPPLIER & GARANSI',
    items: [
      { name: 'Manajemen Supplier', href: '/admin/suppliers', icon: Truck, color: 'text-sky-500', requiredPermission: PERMISSIONS.SUPPLIER_VIEW },
      { name: 'Klaim Garansi Supplier', href: '/admin/suppliers/claims', icon: ShieldAlert, color: 'text-cyan-500', requiredPermission: PERMISSIONS.SUPPLIER_CLAIM_VIEW },
      { name: 'Auto Replacements', href: '/admin/replacements', icon: RefreshCw, color: 'text-rose-500', requiredPermission: PERMISSIONS.REPLACEMENT_VIEW },
      { name: 'Tiket Support CS', href: '/admin/support', icon: LifeBuoy, color: 'text-rose-500', requiredPermission: PERMISSIONS.SUPPORT_VIEW },
    ],
  },
  {
    title: 'SISTEM & SECURITY',
    items: [
      { name: 'Admin Management', href: '/admin/system/admins', icon: Users, color: 'text-cyan-400', superAdminOnly: true },
      { name: 'Role & Permissions', href: '/admin/settings/permissions', icon: ShieldCheck, color: 'text-indigo-400', requiredPermission: PERMISSIONS.PERMISSION_MANAGE, superAdminOnly: false },
      { name: 'Feature Management', href: '/admin/settings/features', icon: Sliders, color: 'text-cyan-400', requiredPermission: PERMISSIONS.FEATURE_FLAGS_MANAGE, superAdminOnly: false },
      { name: 'Email System & Logs', href: '/admin/settings/email', icon: Mail, color: 'text-blue-500', requiredPermission: PERMISSIONS.EMAIL_SETTINGS_MANAGE, superAdminOnly: false },
      { name: 'Dev Email Inbox', href: '/admin/dev/email', icon: Mail, color: 'text-amber-500', superAdminOnly: true },
      { name: 'Audit Logs', href: '/admin/audit-logs', icon: ShieldAlert, color: 'text-amber-500', requiredPermission: PERMISSIONS.AUDIT_VIEW },
      { name: 'Pengaturan Toko', href: '/admin/settings', icon: Settings, color: 'text-slate-400', requiredPermission: [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.SETTINGS_MANAGE] },
    ],
  },
];
