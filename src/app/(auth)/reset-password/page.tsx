'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/toast-provider';

export default function ResetPassword() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    const db = createClient();
    if (!db) { const message = 'Supabase is not configured.'; setError(message); toast(message, 'error'); setBusy(false); return; }
    const { error: updateError } = await db.auth.updateUser({ password: String(form.get('password')) });
    if (updateError) { setError(updateError.message); toast(updateError.message, 'error'); setBusy(false); return; }
    toast('Password updated. Sign in with your new password.', 'success');
    router.push('/login');
    setBusy(false);
  }
  return <main className="auth-content"><form className="auth-form" onSubmit={save}><h2>Choose a new password</h2><p>Set a new password for your Caserivo account.</p>{error && <div className="notice error" role="alert">{error}</div>}<label className="field"><span>New password</span><input type="password" name="password" required minLength={8}/></label><button className="button button-primary" disabled={busy}>{busy ? <><span className="button-spinner"/> Updating…</> : 'Update password'}</button><div className="auth-switch"><Link href="/login">Back to sign in</Link></div></form></main>;
}
