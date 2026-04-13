import type { Metadata, Viewport } from 'next';
import { GoogleTagManager } from '@next/third-parties/google';
import { Inter, Instrument_Sans, Instrument_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-instrument-sans',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-instrument-serif',
});

export const metadata: Metadata = {
  title: 'FanGround - Live Football Fan Hub',
  description: 'The ultimate live matchday experience. Predictions, team sheets & real-time banter with fans worldwide.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FanGround',
  },
  icons: {
    icon: [{ url: '/logo/fanground-256.png', sizes: '256x256', type: 'image/png' }],
    apple: [{ url: '/logo/fanground-256.png', sizes: '256x256', type: 'image/png' }],
    shortcut: '/logo/fanground-256.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f6fb' },
    { media: '(prefers-color-scheme: dark)', color: '#070a12' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import AuthContext from './AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSans.variable} ${instrumentSerif.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const pref = localStorage.getItem('fg-theme-preference');
                if (pref === 'light' || pref === 'dark') {
                  document.documentElement.setAttribute('data-theme', pref);
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
              } catch {}
            `,
          }}
        />
      </head>
      <body>
        {process.env.NEXT_PUBLIC_GTM_ID ? (
          <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />
        ) : null}
        <AuthContext>{children}</AuthContext>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
