import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session';
import { FeatureFlagService } from '@/services/featureFlag.service';
import { SiteSettingService } from '@/services/siteSetting.service';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { UnverifiedEmailBanner } from '@/components/account/UnverifiedEmailBanner';

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  const flags = await FeatureFlagService.getAllFlags();
  const settings = await SiteSettingService.getAllSettings();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Header userSession={session} featureFlags={flags} siteSettings={settings} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <AccountSidebar session={session} flags={flags} />
          <main className="md:col-span-9">
            {session.role === 'CUSTOMER' && !session.emailVerified && (
              <UnverifiedEmailBanner userEmail={session.email} />
            )}
            {children}
          </main>
        </div>
      </div>

      <Footer siteSettings={settings} />
    </div>
  );
}
