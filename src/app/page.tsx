import Link from 'next/link';
import { ArrowUpRight, CalendarDays, FileText, ShieldCheck, Scale, UsersRound } from 'lucide-react';
import Brand, { BrandIcon } from '@/components/brand';
import ThemeToggle from '@/components/theme-toggle';
import type { Metadata } from 'next';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://caserivo.netlify.app';
export const metadata: Metadata = {
  title: 'Legal Practice Management Software for Modern Law Firms',
  description: 'Bring clients, legal cases, court dates, and invoicing together in one calm, secure workspace built for modern law firms.',
  alternates: { canonical: '/' },
};

export default function Home() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Caserivo',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: siteUrl,
    description: 'Legal practice management software for managing clients, cases, court hearings, and invoices.',
  };
  return <main className="marketing"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}/><nav className="topnav"><Link href="/" className="brand" aria-label="Caserivo home"><Brand/></Link><div className="navlinks"><a href="#features">Features</a><a href="#security">Security</a><Link href="/login">Log in</Link><ThemeToggle/><Link className="button button-dark" href="/signup">Get started <ArrowUpRight size={16}/></Link></div></nav>
    <section className="hero"><div className="hero-copy"><div className="eyebrow"><span/> LEGAL PRACTICE, IN GOOD ORDER</div><h1>Better organisation.<br/><em>Stronger cases.</em></h1><p>Manage your clients, track legal cases, stay ahead of court dates, and create professional invoices — all from one workspace.</p><div className="hero-actions"><Link className="button button-primary" href="/signup">Get started <ArrowUpRight size={17}/></Link><a className="button button-quiet" href="#features">Explore features <span>↓</span></a></div><div className="hero-note"><ShieldCheck size={16}/> Private workspaces for your firm</div></div>
    <div className="hero-art"><div className="halo"/><div className="mock-window"><div className="mock-head"><div className="brand mini"><BrandIcon scheme="light"/> caserivo</div><span className="avatar">AM</span></div><div className="mock-body"><div className="mock-greeting">MONDAY, 20 OCTOBER 2026</div><h3>Good morning, Adaeze</h3><div className="metric-grid"><div><small>ACTIVE CASES</small><b>24</b><span>Across your firm</span></div><div><small>UPCOMING HEARINGS</small><b>06</b><span>Next 30 days</span></div></div><div className="mock-section">UP NEXT <span>View diary ↗</span></div><div className="hearing"><div className="datebox"><b>22</b><small>OCT</small></div><div><b>Okafor v. Meridian Bank</b><small>Federal High Court · 10:00 AM</small></div><span className="tag">IN 2 DAYS</span></div><div className="hearing"><div className="datebox pale"><b>24</b><small>OCT</small></div><div><b>State v. Nwosu</b><small>Ikeja High Court · 11:30 AM</small></div><span className="tag muted">IN 4 DAYS</span></div></div></div><div className="float-card"><span className="float-icon"><FileText size={17}/></span><div><b>Invoice paid</b><small>₦850,000.00 · just now</small></div><span className="check">✓</span></div></div></section>
    <div className="trust-strip"><span>ONE WORKSPACE TO STAY AHEAD</span><div><span><UsersRound size={16}/> Clients</span><span><Scale size={16}/> Cases</span><span><CalendarDays size={16}/> Court diary</span><span><FileText size={16}/> Invoicing</span></div></div>
    <section id="features" className="features"><div className="eyebrow">MADE FOR THE WORK THAT MATTERS</div><h2>Less admin in the way.<br/><em>More clarity in the work.</em></h2><div className="feature-grid"><article><span className="feature-icon"><UsersRound/></span><h3>Know every client</h3><p>Keep contact details, matter history, and important context in one secure place.</p></article><article><span className="feature-icon"><Scale/></span><h3>Move cases forward</h3><p>See who owns each matter, what stage it is at, and what needs your attention next.</p></article><article><span className="feature-icon"><CalendarDays/></span><h3>Stay ahead of court</h3><p>Keep hearings in a shared diary and get timely reminders before court dates.</p></article><article><span className="feature-icon"><FileText/></span><h3>Bill with confidence</h3><p>Create clear, branded invoices and keep track of payments and balances.</p></article></div></section>
    <section id="security" className="security"><div><div className="eyebrow">BUILT AROUND CONFIDENTIALITY</div><h2>Your firm&apos;s work<br/>stays <em>yours.</em></h2><p>Each firm has its own protected workspace. Access is controlled by membership and role, with database-level policies to keep records in the right hands.</p></div><div className="security-card"><ShieldCheck size={28}/><h3>Private by design</h3><p>Tenant-scoped records, role-aware access, and secure document handling.</p><span>Learn about security <ArrowUpRight size={15}/></span></div></section>
    <section className="closing"><div className="eyebrow">A BETTER WAY TO RUN YOUR PRACTICE</div><h2>Bring the work together.</h2><p>Start with a clearer view of your clients, cases, and next steps.</p><Link className="button button-light" href="/signup">Get started <ArrowUpRight size={16}/></Link></section><footer><Link href="/" className="brand" aria-label="Caserivo home"><Brand/></Link><span>Better organisation. Stronger cases.</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@caserivo.com">Contact</a></div><small>© 2026 Caserivo</small></footer></main>
}
