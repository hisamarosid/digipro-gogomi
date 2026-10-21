import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { CartProvider } from '@/context/CartContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SiteSettingService } from '@/services/siteSetting.service';

const inter = Inter({ subsets: ['latin'] });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await SiteSettingService.getAllSettings();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || settings.SEO_CANONICAL_URL || 'http://localhost:3000';
  const siteName = settings.STORE_NAME || 'Gogomi Store';
  const title = settings.SEO_TITLE || `${siteName} — ${settings.STORE_TAGLINE}`;
  const description = settings.SEO_DESCRIPTION || 'Beli akun AI, lisensi software, aplikasi produktivitas, dan aset digital legal dengan pembayaran QRIS instan dan garansi terjamin.';
  const keywords = settings.SEO_KEYWORDS ? settings.SEO_KEYWORDS.split(',').map((k) => k.trim()) : ['produk digital', 'lisensi software', 'chatgpt plus', 'canva pro', 'qris'];

  const icons: any = {};
  if (settings.STORE_FAVICON_URL) {
    icons.icon = settings.STORE_FAVICON_URL;
  } else if (settings.STORE_ICON_URL) {
    icons.icon = settings.STORE_ICON_URL;
  }
  if (settings.STORE_ICON_URL) {
    icons.apple = settings.STORE_ICON_URL;
  }

  const otherMeta: Record<string, string> = {};
  if (settings.GSC_VERIFICATION_CODE) {
    otherMeta['google-site-verification'] = settings.GSC_VERIFICATION_CODE;
  }

  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
    keywords,
    authors: [{ name: siteName }],
    metadataBase: new URL(baseUrl),
    icons: Object.keys(icons).length > 0 ? icons : undefined,
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName,
      locale: 'id_ID',
      type: 'website',
      images: settings.SEO_OG_IMAGE ? [{ url: settings.SEO_OG_IMAGE }] : undefined,
    },
    twitter: {
      card: (settings.SEO_TWITTER_CARD as any) || 'summary_large_image',
      title,
      description,
      images: settings.SEO_OG_IMAGE ? [settings.SEO_OG_IMAGE] : undefined,
    },
    other: Object.keys(otherMeta).length > 0 ? otherMeta : undefined,
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <CartProvider>
              {children}
              <Toaster position="top-right" theme="dark" richColors />
            </CartProvider>
          </LanguageProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function handleChunkError(err) {
                  try {
                    var msg = String((err && (err.message || (err.reason && err.reason.message))) || err || '').toLowerCase();
                    if (msg.indexOf('loading chunk') !== -1 || msg.indexOf('dynamically imported module') !== -1 || msg.indexOf('chunkloaderror') !== -1 || msg.indexOf('failed to fetch') !== -1) {
                      var lastReload = sessionStorage.getItem('gogomi_chunk_reload_ts');
                      var now = Date.now();
                      if (!lastReload || now - parseInt(lastReload, 10) > 15000) {
                        sessionStorage.setItem('gogomi_chunk_reload_ts', now.toString());
                        window.location.reload();
                      }
                    }
                  } catch(e) {}
                }
                window.addEventListener('error', function(e) { handleChunkError(e.error || e); });
                window.addEventListener('unhandledrejection', function(e) { handleChunkError(e.reason); });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
