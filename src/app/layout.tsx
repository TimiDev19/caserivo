import type { Metadata } from 'next';
import './globals.css';
import './toasts.css';
import './forms.css';
import './auth-extra.css';
import { ToastProvider } from '@/components/toast-provider';
import { ThemeProvider } from '@/components/theme-provider';
export const metadata: Metadata = { title: 'Caserivo — Better organisation. Stronger cases.', description: 'A calmer workspace for legal practice.', icons: { icon: '/caserivo-icon-light.png' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><ThemeProvider><ToastProvider>{children}</ToastProvider></ThemeProvider></body></html>;
}
