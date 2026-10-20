'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, FileText, LayoutDashboard, Settings, UsersRound, Scale } from 'lucide-react';

const links=[['Dashboard','/dashboard',LayoutDashboard],['Clients','/clients',UsersRound],['Cases','/cases',Scale],['Court Diary','/diary',CalendarDays],['Invoices','/invoices',FileText]] as const;
export default function WorkspaceNav() {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return <><nav aria-label="Workspace navigation">{links.map(([name,href,Icon])=><Link key={href} href={href} className={`side-link${active(href) ? ' active' : ''}`} aria-current={active(href) ? 'page' : undefined}><Icon/><span>{name}</span></Link>)}<Link href="/settings" className={`side-link mobile-settings-link${active('/settings') ? ' active' : ''}`} aria-current={active('/settings') ? 'page' : undefined}><Settings/><span>Settings</span></Link></nav><div className="sidebar-bottom"><Link href="/settings" className={`side-link${active('/settings') ? ' active' : ''}`} aria-current={active('/settings') ? 'page' : undefined}><Settings/><span>Firm settings</span></Link></div></>;
}
