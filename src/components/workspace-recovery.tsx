'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { useToast } from '@/components/toast-provider';

export default function WorkspaceRecovery({ reason }: { reason: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(reason === 'details' ? 'Your signup did not include all the firm details needed to finish setup.' : 'Your account is ready, but the firm workspace still needs to be created.');
  const router = useRouter();
  const toast = useToast();

  const retry = useCallback(async () => {
    setBusy(true);
    const db = createClient();
    if (!db) { setMessage('We could not reach the setup service. Please try again.'); setBusy(false); return; }
    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user) { setMessage('Sign in again to finish your firm workspace.'); setBusy(false); return; }
    const { data: membership, error: memberError } = await db.from('firm_members').select('firm_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (membership) { router.replace('/dashboard'); return; }
    if (memberError) { setMessage('We could not confirm your workspace yet. Try again in a moment.'); setBusy(false); return; }
    const profile = user.user_metadata ?? {};
    if (!profile.firm_name || !profile.firm_email || !profile.country || !profile.currency) {
      setMessage('Your signup is missing firm details. Please contact support so we can finish setup.'); setBusy(false); return;
    }
    const { error } = await db.rpc('create_firm_workspace', {
      firm_name: profile.firm_name, firm_email: profile.firm_email, firm_country: profile.country, firm_currency: profile.currency, actor_user_id: user.id,
    });
    if (error) { setMessage('Workspace setup did not finish. Try again; your signup details are saved.'); setBusy(false); return; }
    toast('Your firm workspace is ready.', 'success');
    router.replace('/dashboard');
  }, [router, toast]);

  return <main className="auth-content"><section className="auth-form"><span className="verify-icon"><span className="button-spinner dark-spinner"/></span><h2>Finish firm setup</h2><p role="status" aria-live="polite">{message}</p><button className="button button-primary" disabled={busy} onClick={() => void retry()}>{busy ? <><span className="button-spinner"/> Setting up…</> : 'Finish setup'}</button><div className="auth-switch"><Link href="/login">Back to sign in</Link></div></section></main>;
}
