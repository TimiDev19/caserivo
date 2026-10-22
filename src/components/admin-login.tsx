'use client';

import { FormEvent, useState } from 'react';

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Admin sign-in failed.');
      window.location.assign('/admin');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Admin sign-in failed.');
      setBusy(false);
    }
  }

  return <form className="admin-login-card" onSubmit={submit}>
    <span className="admin-eyebrow">ADMINISTRATION</span><h1>Admin sign in</h1><p>Sign in to manage account access.</p>
    {error && <div className="notice error" role="alert">{error}</div>}
    <label className="field"><span>Email</span><input name="email" type="email" autoComplete="username" required/></label>
    <label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" required/></label>
    <button className="button button-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}
