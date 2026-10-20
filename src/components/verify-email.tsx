'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/toast-provider';
import Brand from '@/components/brand';
import { authCallbackUrl } from '@/lib/auth-urls';

export default function VerifyEmail({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const db = createClient();
    if (!db) { toast('Supabase is not configured.', 'error'); setBusy(false); return; }
    const { error } = await db.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: authCallbackUrl('?flow=signup&next=/dashboard') },
    });
    if (error) toast(error.message, 'error');
    else toast('A new verification email is on its way.', 'success');
    setBusy(false);
  }
  return <main className="auth-shell">
    <section className="auth-brand-panel"><Link href="/" className="brand" aria-label="Caserivo home"><Brand scheme="dark"/></Link><div className="auth-quote"><div className="eyebrow" style={{ color: '#8ed8c1' }}>ONE LAST STEP</div><h1>Almost there.<br/><em>Check your inbox.</em></h1><p>Verify your email to activate your Caserivo account and finish creating your firm workspace.</p></div><small>© 2026 Caserivo · Better organisation. Stronger cases.</small></section>
    <section className="auth-content"><div className="auth-form verify-card"><span className="verify-icon"><MailCheck size={26}/></span><h2>Verify your email</h2><p>We sent a confirmation link to <strong>{email || 'your email address'}</strong>. Open it to confirm your account. Your firm workspace will be ready automatically.</p>
      <form onSubmit={resend}><label className="field"><span>Email address</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="you@yourfirm.com"/></label><button className="button button-primary" disabled={busy}>{busy ? <><span className="button-spinner"/> Sending…</> : 'Resend verification email'}</button></form>
      <div className="auth-switch">Already verified? <Link href="/login">Sign in</Link></div>
    </div></section>
  </main>;
}
