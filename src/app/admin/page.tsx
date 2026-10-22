import Link from 'next/link';
import { redirect } from 'next/navigation';
import AdminUsers from '@/components/admin-users';
import AdminLogout from '@/components/admin-logout';
import ThemeToggle from '@/components/theme-toggle';
import Brand from '@/components/brand';
import { getAdminSession, isAdminServiceConfigured } from '@/lib/admin';

export const metadata = { title: 'User administration | Caserivo', robots: { index: false, follow: false } };

export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');
  const configured = isAdminServiceConfigured();
  return <main className="admin-page"><header className="admin-header"><Link href="/" className="brand"><Brand/></Link><div><span className="admin-signed-in">Admin · {session.email}</span><AdminLogout/><ThemeToggle/></div></header><section className="admin-content"><div className="admin-title"><div><span className="admin-eyebrow">ACCOUNT ADMINISTRATION</span><h1>Users</h1><p>Signup information and account access. Case and workspace records are not shown here.</p></div></div>{configured ? <AdminUsers/> : <div className="notice-bar">Replace the dummy value in <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code> with a valid Supabase service-role key to load and manage accounts.</div>}</section></main>;
}
