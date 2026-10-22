import Link from 'next/link';
import { ArrowUpRight, CalendarDays, FileText, Scale, UsersRound } from 'lucide-react';
import { getWorkspace } from '@/lib/data';

export default async function Dashboard() {
  const { supabase, workspace, user } = await getWorkspace();
  const stats = { clients: 0, cases: 0, hearings: 0, invoices: 0 };
  let upcoming: any[] = [];
  let recent: any[] = [];
  let openInvoices: any[] = [];
  let dataError = '';
  let casesLoadError = false;
  let hearingsLoadError = false;
  let invoicesLoadError = false;
  let clientCountError = false;
  let caseCountError = false;
  let hearingCountError = false;
  let invoiceCountError = false;

  if (supabase && user && workspace) {
    const now = new Date().toISOString();
    const [clientsResult, casesResult, hearingsResult, invoicesResult, upcomingResult, casesListResult, invoicesListResult] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('cases').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('hearings').select('*', { count: 'exact', head: true }).gte('starts_at', now).eq('status', 'scheduled'),
      supabase.from('invoices').select('*', { count: 'exact', head: true }).in('status', ['issued', 'overdue']),
      supabase.from('hearings')
        .select('id,title,starts_at,court_name,case:cases!hearings_case_id_fkey(title,reference)')
        .gte('starts_at', now).eq('status', 'scheduled').order('starts_at').limit(4),
      supabase.from('cases')
        .select('id,title,reference,status,updated_at,client:clients!cases_client_id_fkey(name)')
        .order('updated_at', { ascending: false }).limit(4),
      supabase.from('invoices')
        .select('id,invoice_number,status,total_minor,currency,due_at,client_snapshot')
        .in('status', ['issued', 'overdue']).order('created_at', { ascending: false }).limit(4),
    ]);

    stats.clients = clientsResult.count ?? 0;
    stats.cases = casesResult.count ?? 0;
    stats.hearings = hearingsResult.count ?? 0;
    stats.invoices = invoicesResult.count ?? 0;
    upcoming = upcomingResult.data ?? [];
    recent = casesListResult.data ?? [];
    openInvoices = invoicesListResult.data ?? [];
    clientCountError = Boolean(clientsResult.error);
    caseCountError = Boolean(casesResult.error);
    hearingCountError = Boolean(hearingsResult.error);
    invoiceCountError = Boolean(invoicesResult.error);
    casesLoadError = Boolean(casesListResult.error);
    hearingsLoadError = Boolean(upcomingResult.error);
    invoicesLoadError = Boolean(invoicesListResult.error);
    const failedQueries = [clientsResult, casesResult, hearingsResult, invoicesResult, upcomingResult, casesListResult, invoicesListResult]
      .filter((result) => result.error)
      .map((result) => result.error!.message);
    if (failedQueries.length) dataError = `Some dashboard data could not be loaded: ${[...new Set(failedQueries)].join(' ')}`;
  }

  const configured = Boolean(supabase && user && workspace);
  const formatMoney = (minor: number, currency: string) => new Intl.NumberFormat(undefined, {
    style: 'currency', currency: currency.trim() || 'NGN', maximumFractionDigits: 2,
  }).format(Number(minor) / 100);

  return <main className="app-content">
    <div className="welcome-row">
      <div><h2>Good morning{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}</h2><p>Here’s what needs your attention today.</p></div>
      <Link href="/clients/new" className="button button-primary button-small">Add a client <ArrowUpRight size={14}/></Link>
    </div>
    {!configured && <div className="notice-bar">{!supabase ? 'Supabase is not configured. Add your project URL and anon key to .env.local, then apply the database migration.' : !user ? 'Sign in to see your firm’s live workspace data.' : 'Create a firm workspace to get started.'} <Link href="/login" style={{ fontWeight: 700 }}>Sign in →</Link></div>}
    {dataError && <div className="notice-bar" role="status">{dataError}</div>}
    <div className="stat-grid">
      {[[UsersRound, 'Clients', stats.clients, 'In your workspace', clientCountError], [Scale, 'Active cases', stats.cases, 'Currently in progress', caseCountError], [CalendarDays, 'Upcoming hearings', stats.hearings, 'Scheduled from today', hearingCountError], [FileText, 'Open invoices', stats.invoices, 'Awaiting payment', invoiceCountError]].map(([Icon, label, value, sub, countError]: any) => <div className="stat-card" key={label}><div className="stat-top">{label}<span className="stat-icon"><Icon/></span></div><strong>{configured ? countError ? '—' : value : '—'}</strong><small>{configured ? countError ? 'Could not load count' : sub : 'Live firm data'}</small></div>)}
    </div>
    <div className="dash-grid">
      <section className="panel">
        <div className="panel-title"><h3>Upcoming court diary</h3><Link href="/diary">View diary →</Link></div>
        {configured && upcoming.length ? upcoming.map((hearing) => <div className="data-row" key={hearing.id}><div className="data-mark">{new Date(hearing.starts_at).getDate()}</div><div className="data-row-main"><b>{hearing.title || hearing.case?.title || 'Court hearing'}</b><small>{hearing.court_name} · {new Date(hearing.starts_at).toLocaleString()}</small></div><span className="badge">Scheduled</span></div>) : <div className="empty-state"><b>{hearingsLoadError ? 'Could not load hearings' : 'No upcoming hearings'}</b>{hearingsLoadError ? 'Check the dashboard data notice above.' : configured ? 'Schedule a hearing to keep your team one step ahead.' : 'Your next hearings will appear here when connected.'}<br/><Link href="/diary/new" style={{ color: 'var(--teal)', fontWeight: 700 }}>Schedule a hearing →</Link></div>}
      </section>
      <section className="panel">
        <div className="panel-title"><h3>Recent cases</h3><Link href="/cases">View cases →</Link></div>
        {configured && recent.length ? recent.map((item) => <div className="data-row" key={item.id}><div className="data-mark">{item.reference?.slice(0, 2) || 'CS'}</div><div className="data-row-main"><b>{item.title}</b><small>{item.client?.name || 'Client'} · {item.reference}</small></div><span className="badge">{item.status}</span></div>) : <div className="empty-state"><b>{casesLoadError ? 'Could not load cases' : 'No cases to show'}</b>{casesLoadError ? 'Check the dashboard data notice above.' : configured ? 'Create a case to start tracking its progress.' : 'Recent matters will appear here.'}<br/><Link href="/cases/new" style={{ color: 'var(--teal)', fontWeight: 700 }}>Create a case →</Link></div>}
      </section>
      <section className="panel">
        <div className="panel-title"><h3>Invoice summary</h3><Link href="/invoices">View invoices →</Link></div>
        {configured && openInvoices.length ? openInvoices.map((invoice) => <div className="data-row" key={invoice.id}><div className="data-mark">{invoice.invoice_number.slice(-2)}</div><div className="data-row-main"><b>{invoice.client_snapshot?.name || invoice.invoice_number}</b><small>{invoice.invoice_number} · Due {invoice.due_at ? new Date(invoice.due_at).toLocaleDateString() : 'No due date'}</small></div><span className="badge">{formatMoney(invoice.total_minor, invoice.currency)}</span></div>) : <div className="empty-state"><b>{invoicesLoadError ? 'Could not load invoices' : configured ? 'No unpaid invoices' : 'Keep billing in view'}</b>{invoicesLoadError ? 'Check the dashboard data notice above.' : configured ? 'Issued and overdue invoice balances will be tracked here.' : 'See open balances and recent payments from your workspace.'}<br/><Link href="/invoices/new" style={{ color: 'var(--teal)', fontWeight: 700 }}>Create an invoice →</Link></div>}
      </section>
      <section className="panel">
        <div className="panel-title"><h3>Quick actions</h3></div>
        {[["Add a client", '/clients/new', UsersRound], ['Create a case', '/cases/new', Scale], ['Schedule a hearing', '/diary/new', CalendarDays], ['Generate an invoice', '/invoices/new', FileText]].map(([label, href, Icon]: any) => <Link className="data-row" href={href} key={href}><div className="data-mark"><Icon size={14}/></div><div className="data-row-main"><b>{label}</b><small>Start a new {String(label).toLowerCase().replace(/^(add|create|schedule|generate) /, '')}</small></div><ArrowUpRight size={14}/></Link>)}
      </section>
    </div>
  </main>;
}
