import AppShell from '@/components/app-shell';
import type { Metadata } from 'next';
export const metadata: Metadata = { robots: { index: false, follow: false, noarchive: true } };
export default function WorkspaceLayout({children}:{children:React.ReactNode}){ return <AppShell>{children}</AppShell>; }
