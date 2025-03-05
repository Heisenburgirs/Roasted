import { Metadata } from 'next';
import { Bangers, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import roasted from "../../public/roasted.png"

// Initialize fonts
const bangers = Bangers({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bangers',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Define the absolute URL to your image
// For production, use your actual domain
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://roasted.xyz';

// Define metadata with Open Graph and Twitter card info
export const metadata: Metadata = {
  title: 'Roasted - The Ultimate Roasting Platform',
  description: 'Create, share, and get paid for your best roasts!',
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: 'Roasted - The Ultimate Roasting Platform',
    description: 'Create, share, and get paid for your best roasts!',
    siteName: 'Roasted',
    images: [
      {
        url: roasted.src,
        width: 1200,
        height: 630,
        alt: 'Roasted - The Ultimate Roasting Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roasted - The Ultimate Roasting Platform',
    description: 'Create, share, and get paid for your best roasts!',
    images: [roasted.src],
    creator: '@roasted',
  },
  
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bangers.className}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}