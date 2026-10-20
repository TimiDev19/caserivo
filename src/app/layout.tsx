import type { Metadata } from 'next';
import './globals.css';
import './toasts.css';
import './forms.css';
import './auth-extra.css';
import { ToastProvider } from '@/components/toast-provider';
import { ThemeProvider } from '@/components/theme-provider';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://caserivo.netlify.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Caserivo — Legal Practice Management Software',
    template: '%s | Caserivo',
  },
  description: 'Manage clients, legal cases, court hearings, and invoices in one calm, secure workspace built for modern law firms.',
  applicationName: 'Caserivo',
  keywords: ['legal practice management', 'law firm management software', 'legal case management', 'court diary', 'legal invoicing'],
  category: 'business',
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Caserivo',
    title: 'Caserivo — Legal Practice Management Software',
    description: 'Manage clients, cases, court dates, and invoices in one secure workspace for your firm.',
    images: [{ url: '/caserivo-logo-light.png', width: 435, height: 130, alt: 'Caserivo' }],
  },
  twitter: {
    card: 'summary',
    title: 'Caserivo — Legal Practice Management Software',
    description: 'A secure workspace to manage clients, cases, court hearings, and invoices.',
    images: ['/caserivo-logo-light.png'],
  },
  icons: {
    icon: [
      { url: '/caserivo-icon-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/caserivo-icon-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/caserivo-icon-light.png',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ThemeProvider><ToastProvider>{children}</ToastProvider></ThemeProvider></body></html>;
}
