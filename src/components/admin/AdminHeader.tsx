'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  ExternalLink,
  Search,
  Shield,
  User,
  ChevronRight,
} from 'lucide-react';
import { AdminGlobalSearchModal } from '@/components/admin/AdminGlobalSearchModal';
import { ADMIN_NAV_GROUPS, AdminNavItem } from '@/config/adminNav.config';

interface AdminHeaderProps {
  session: {
    name: string;
    role: string;
    permissions?: string[];
  };
}

export function AdminHeader({ session }: AdminHeaderProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const closeMenu = () => setMobileNavOpen(false);

  const isSuperAdmin = session.role === 'SUPER_ADMIN';
  const userPermissions = new Set(session.permissions || []);

  // Close mobile drawer when pathname changes
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

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
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        
        {/* Left: Mobile Hamburger & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-slate-200 hover:text-white transition"
            aria-label="Toggle Admin Navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5 text-rose-400" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-2 font-bold text-sm text-white">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs md:hidden">
              GS
            </div>
            <span className="font-extrabold text-white text-xs sm:text-sm">
              Admin <span className="text-blue-400 font-normal hidden sm:inline">Control Panel</span>
            </span>
          </Link>
        </div>

        {/* Center: Global Search Bar Trigger */}
        <div className="hidden md:flex items-center justify-center flex-1 max-w-md mx-4">
          <AdminGlobalSearchModal />
        </div>

        {/* Right: User Badge & View Front-End Link */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px]">
            <span className="font-bold text-white truncate max-w-[120px]">{session.name}</span>
            <span className="rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-bold px-1.5 py-0.5 uppercase">
              {session.role}
            </span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl"
          >
            <span>Toko Front-end</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>

      </header>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 bottom-0 z-50 bg-slate-950/98 backdrop-blur-xl border-t border-slate-800 p-4 pb-20 overflow-y-auto space-y-5 animate-in slide-in-from-top-2 duration-200">
          
          {/* User Profile Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-white truncate">{session.name}</p>
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
                      ({session.permissions.length} Izin)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              href="/"
              onClick={closeMenu}
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition bg-blue-500/10 border border-blue-500/20 px-2.5 py-1.5 rounded-xl shrink-0 flex items-center gap-1"
            >
              <span>Lihat Toko</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Quick Search in Mobile Drawer */}
          <div className="w-full">
            <AdminGlobalSearchModal />
          </div>

          {/* All Dynamic Navigation Groups */}
          <nav className="space-y-5 text-xs font-medium text-slate-300">
            {ADMIN_NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter(hasItemAccess);
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title} className="space-y-1">
                  <span className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    {group.title}
                  </span>
                  
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const active = isLinkActive(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMenu}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-bold transition duration-150 ${
                            active
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : item.color}`} />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {active && (
                            <ChevronRight className="h-3.5 w-3.5 text-white/80 shrink-0" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

        </div>
      )}
    </>
  );
}
