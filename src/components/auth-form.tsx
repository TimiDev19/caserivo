'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/toast-provider';
import Brand from '@/components/brand';

export default function AuthForm({ mode }: { mode: 'login'|'signup'|'forgot' }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const fail = (message: string) => { setError(message); toast(message, 'error'); };
    try {
      const db = createClient();
      if (!db) { fail('Supabase is not configured. Check the project environment values.'); return; }

      if (mode === 'login') {
        const { error: authError } = await db.auth.signInWithPassword({ email, password });
        if (authError) fail(authError.message);
        else { toast('Signed in successfully.', 'success'); router.push('/dashboard'); }
      } else if (mode === 'signup') {
        const firmName = String(form.get('firm_name') ?? '').trim();
        const firmEmail = String(form.get('firm_email') ?? '').trim();
        const country = String(form.get('country') ?? 'Nigeria');
        const currency = String(form.get('currency') ?? 'NGN');
        const { data, error: authError } = await db.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(form.get('name') ?? '').trim(), firm_name: firmName, firm_email: firmEmail, country, currency },
            emailRedirectTo: `${location.origin}/auth/callback?flow=signup&next=/dashboard`,
          },
        });
        if (authError) fail(authError.message);
        else if (!data.user) fail('We could not create your account. Please try again.');
        else if (!data.session) {
          toast('Account created. Check your inbox to verify your email.', 'success');
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } else {
          const { error: workspaceError } = await db.rpc('create_firm_workspace', {
            firm_name: firmName, firm_email: firmEmail, firm_country: country, firm_currency: currency, actor_user_id: data.user.id,
          });
          if (workspaceError) fail(`Your account was created, but workspace setup did not finish: ${workspaceError.message}`);
          else { toast('Your firm workspace is ready.', 'success'); router.push('/dashboard'); }
        }
      } else {
        const { error: authError } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/reset-password` });
        if (authError) fail(authError.message);
        else { toast('If an account exists, a reset link is on its way.', 'success'); router.push(`/forgot-password/sent?email=${encodeURIComponent(email)}`); }
      }
    } catch {
      fail('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const heading = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password';
  return <main className="auth-shell">
    <section className="auth-brand-panel"><Link href="/" className="brand" aria-label="Caserivo home"><Brand scheme="dark"/></Link><div className="auth-quote"><div className="eyebrow" style={{ color: '#8ed8c1' }}>A CLEARER WAY TO PRACTICE</div><h1>Better organisation.<br/><em>Stronger cases.</em></h1><p>Your clients, matters, court diary, and billing — together in one workspace built for the way law firms work.</p></div><small>© 2026 Caserivo · Better organisation. Stronger cases.</small></section>
    <section className="auth-content"><form className="auth-form" onSubmit={submit}>
      <h2>{heading}</h2><p>{mode === 'login' ? 'Sign in to your firm workspace.' : mode === 'signup' ? 'Create your account and firm workspace together.' : 'We’ll email you a secure reset link.'}</p>
      {error && <div className="notice error" role="alert">{error}</div>}
      {mode === 'signup' && <>
        <label className="field"><span>Your full name</span><input autoComplete="name" name="name" required placeholder="e.g. Adaeze Okafor"/></label>
        <label className="field"><span>Firm name</span><input name="firm_name" required minLength={2} maxLength={180} placeholder="e.g. Okafor & Partners"/></label>
        <label className="field"><span>Firm email address</span><input type="email" name="firm_email" required placeholder="office@yourfirm.com"/></label>
        <div className="auth-field-row"><label className="field"><span>Country</span><select name="country" defaultValue="Nigeria"><option>Nigeria</option><option>Ghana</option><option>Kenya</option><option>South Africa</option><option>Other</option></select></label><label className="field"><span>Currency</span><select name="currency" defaultValue="NGN"><option value="NGN">NGN · ₦</option><option value="GHS">GHS · ₵</option><option value="KES">KES · KSh</option><option value="ZAR">ZAR · R</option><option value="USD">USD · $</option><option value="GBP">GBP · £</option></select></label></div>
      </>}
      <label className="field"><span>Email address</span><input type="email" autoComplete="email" name="email" required placeholder="you@yourfirm.com"/></label>
      {mode !== 'forgot' && <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} name="password" required minLength={8} placeholder="At least 8 characters"/></label>}
      {mode === 'signup' && <label className="field terms-field"><input type="checkbox" required/><span>I agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</span></label>}
      <button className="button button-primary" disabled={busy}>{busy ? <><span className="button-spinner"/> {mode === 'signup' ? 'Creating your workspace…' : 'Please wait…'}</> : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account & workspace' : 'Send reset link'}</button>
      <div className="auth-switch">{mode === 'login' ? <>Forgot password? <Link href="/forgot-password">Reset it</Link><br/><br/>New to Caserivo? <Link href="/signup">Create an account</Link></> : mode === 'signup' ? <>Already registered? <Link href="/login">Sign in</Link></> : <>Remembered it? <Link href="/login">Back to sign in</Link></>}</div>
    </form></section>
  </main>;
}
