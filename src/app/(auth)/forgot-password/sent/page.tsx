import Link from 'next/link';
import Brand from '@/components/brand';
export default async function ResetEmailSent({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <main className="auth-shell"><section className="auth-brand-panel"><Link href="/" className="brand" aria-label="Caserivo home"><Brand scheme="dark"/></Link><div className="auth-quote"><div className="eyebrow" style={{color:'#8ed8c1'}}>ACCOUNT SECURITY</div><h1>Back to your<br/><em>workspace soon.</em></h1><p>Use the secure link in your inbox to choose a new password.</p></div><small>© 2026 Caserivo · Better organisation. Stronger cases.</small></section><section className="auth-content"><div className="auth-form"><h2>Check your email</h2><p>If an account exists for <strong>{email || 'that address'}</strong>, we’ve sent a password reset link.</p><Link className="button button-primary" href="/login">Back to sign in</Link></div></section></main>;
}
