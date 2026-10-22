import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminLogin from '@/components/admin-login';
import Brand from '@/components/brand';
import { getAdminSession } from '@/lib/admin';

export const metadata: Metadata = { title: 'Admin login | Caserivo', robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect('/admin');
  return <main className="admin-login-page"><div className="admin-login-brand"><Brand/></div><AdminLogin/></main>;
}
