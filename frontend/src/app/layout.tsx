import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Crossy - Fun Multiplayer Crossword Puzzles',
  description: 'Solve crossword puzzles together with friends in real-time. Daily puzzles, multiplayer rooms, and endless fun!',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Crossy',
  },
  openGraph: {
    title: 'Crossy - Fun Multiplayer Crossword Puzzles',
    description: 'Solve crossword puzzles together with friends in real-time.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#d946ef',
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
