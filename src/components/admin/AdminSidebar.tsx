'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Star,
  LifeBuoy,
  FileText,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
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
  Lock,
} from 'lucide-react';
import { ADMIN_NAV_GROUPS, AdminNavItem } from '@/config/adminNav.config';

interface AdminSidebarProps {
  session: {
    name: string;
    role: string;
    permissions?: string[];
  };
}

export function AdminSidebar({ session }: AdminSidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = session.role === 'SUPER_ADMIN';
  const userPermissions = new Set(session.permissions || []);

  const isLinkActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    if (href === '/admin/inventory') {
      return pathname === '/admin/inventory';
    }
    return pathname.startsWith(href);
  };

  const hasItemAccess = (item: AdminNavItem) => {
    if (isSuperAdmin) return true;
    if (item.superAdminOnly) return false;
    if (!item.requiredPermission) return true;

    if (Array.isArray(item.requiredPermission)) {
      return item.requiredPermission.some((perm) => userPermissions.has(perm));
    }
    return userPermissions.has(item.requiredPermission);
  };

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/90 p-4 space-y-6 flex flex-col hidden md:flex shrink-0">
      
      {/* Brand Header */}
      <Link href="/admin" className="flex items-center gap-2.5 px-3 py-2 font-bold text-lg text-white">
        <img src="/gogomi-logo.png" alt="Gogomi Digital Store Admin" className="h-8 w-auto object-contain" />
        <span className="font-extrabold text-sm tracking-tight text-white">Gogomi<span className="text-blue-600 dark:text-cyan-400"> Store</span></span>
        <span className="text-blue-600 dark:text-cyan-400 font-bold text-[10px] uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded ml-auto">
          {session.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
        </span>
      </Link>

      {/* User Info Badge */}
      <div className="px-3.5 py-2.5 bg-slate-950/60 rounded-2xl border border-slate-800">
        <p className="text-xs font-bold text-white truncate">{session.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`inline-block rounded border text-[9px] font-bold px-1.5 py-0.5 uppercase ${
            isSuperAdmin
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
            {session.role}
          </span>
          {!isSuperAdmin && session.permissions && (
            <span className="text-[9px] text-slate-400 font-mono">
              ({session.permissions.length} Izin Aktif)
            </span>
          )}
        </div>
      </div>

      {/* Navigation Group Items */}
      <nav className="flex-1 space-y-5 overflow-y-auto text-xs font-medium text-slate-400 no-scrollbar pr-1">
        {ADMIN_NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(hasItemAccess);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                {group.title}
              </span>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-bold transition duration-150 ${
                      active
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : item.color}`} />
                    <span className="truncate">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

    </aside>
  );
}
