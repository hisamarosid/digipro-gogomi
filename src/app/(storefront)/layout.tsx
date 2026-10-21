import React from 'react';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { CartProvider } from '@/context/CartContext';
import { CartDrawer } from '@/components/storefront/CartDrawer';
import { TelegramFloatingButton } from '@/components/storefront/TelegramFloatingButton';
import { getCurrentSession } from '@/lib/auth/session';
import { SiteSettingService } from '@/services/siteSetting.service';

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  const settings = await SiteSettingService.getAllSettings();

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <Header userSession={session} siteSettings={settings} />
        <main className="flex-1">{children}</main>
        <Footer siteSettings={settings} />
        <CartDrawer />
        <TelegramFloatingButton />
      </div>
    </CartProvider>
  );
}
