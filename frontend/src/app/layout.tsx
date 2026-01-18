import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'Crossy - Fun Multiplayer Crossword Puzzles',
  description: 'Solve crossword puzzles together with friends in real-time. Daily puzzles, multiplayer rooms, and endless fun!',
  keywords: ['crossword', 'puzzle', 'multiplayer', 'games', 'word games', 'online crossword'],
  authors: [{ name: 'CrossPlay Team' }],
  creator: 'CrossPlay',
  manifest: '/manifest.json',
  openGraph: {
    title: 'Crossy - Fun Multiplayer Crossword Puzzles',
    description: 'Solve crossword puzzles together with friends in real-time.',
    type: 'website',
    siteName: 'Crossy',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Crossy - Multiplayer Crosswords',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crossy - Fun Multiplayer Crossword Puzzles',
    description: 'Solve crossword puzzles together with friends in real-time.',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Crossy',
  },
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
