import Link from 'next/link';
import { getWorkspace } from '@/lib/data';
import WorkspaceNav from '@/components/workspace-nav';
import ThemeToggle from '@/components/theme-toggle';
import Brand from '@/components/brand';
export default async function AppShell({children}:{children:React.ReactNode}){
 const {user,workspace}=await getWorkspace();
 return <div className="app-shell"><aside className="sidebar"><Link href="/" className="brand" aria-label="Caserivo home"><Brand/></Link><div className="workspace-label">WORKSPACE · {workspace?.name||'Not set up'}</div><WorkspaceNav/><div className="user-mini"><span>{user?.email?.slice(0,2).toUpperCase()||'?'}</span><div><b>{user?.user_metadata?.full_name||'Signed out'}</b><small>{user?.email||'Connect your account'}</small></div></div></aside><div className="app-main"><header className="app-header"><h1>Caserivo</h1><Link href="/" className="mobile-header-brand" aria-label="Caserivo home"><Brand/></Link><div className="header-actions"><span>{workspace?.name||'Firm workspace'}</span><ThemeToggle/></div></header>{children}</div></div>
}
