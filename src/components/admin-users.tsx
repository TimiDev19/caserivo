'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from '@/components/modal';

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  signup: { name: string; firmName: string; firmEmail: string; country: string; currency: string };
};

function localDateValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function defaultReleaseDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDateValue(date);
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [summary, setSummary] = useState<{ totalUsers: number; suspendedUsers: number } | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState<{ user: AdminUser; action: 'suspend' | 'reactivate' | 'delete' } | null>(null);
  const [releaseDate, setReleaseDate] = useState(defaultReleaseDate);

  const load = useCallback(async (nextPage: number) => {
    setError('');
    try {
      const response = await fetch(`/api/admin/users?page=${nextPage}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load users.');
      setUsers(data.users);
      setSummary(data.summary);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load users.');
    }
  }, []);

  useEffect(() => { void load(1); }, [load]);

  async function confirmAccountAction() {
    if (!pendingAction) return;
    const { user, action } = pendingAction;
    if (action === 'suspend' && !releaseDate) {
      setError('Choose a release date.');
      return;
    }
    setBusy(user.id);
    setError('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, action, ...(action === 'suspend' ? { releaseAt: new Date(`${releaseDate}T23:59:59`).toISOString() } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update this account.');
      setPendingAction(null);
      await load(page);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this account.');
    } finally {
      setBusy('');
    }
  }

  const filtered = users.filter((user) => [user.email, user.signup.name, user.signup.firmName, user.signup.firmEmail, user.signup.country, user.signup.currency].join(' ').toLowerCase().includes(query.toLowerCase()));

  return <>
    <section className="admin-stats" aria-label="Account overview">
      <article className="admin-stat-card"><span>Total users</span><strong>{summary?.totalUsers ?? '—'}</strong><small>Registered accounts</small></article>
      <article className="admin-stat-card"><span>Suspended accounts</span><strong>{summary?.suspendedUsers ?? '—'}</strong><small>Currently unable to sign in</small></article>
    </section>
    <div className="admin-toolbar"><label className="searchbox"><span className="sr-only">Search users</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search signup details…"/></label><span>{filtered.length} user{filtered.length === 1 ? '' : 's'} on this page</span></div>
    {error && <div className="notice-bar" role="alert">{error}</div>}
    <div className="admin-user-list" aria-busy={busy === 'loading'}>
      <div className="admin-user-head"><span>Account</span><span>Signup details</span><span>Joined</span><span>Access</span><span>Action</span></div>
      {filtered.map((user) => {
        const inactive = Boolean(user.bannedUntil && new Date(user.bannedUntil).getTime() > Date.now());
        return <article className="admin-user-row" key={user.id}>
          <div className="admin-user-account"><b>{user.signup.name || 'Name not provided'}</b><span>{user.email}</span><small>{user.emailConfirmedAt ? 'Email verified' : 'Email not verified'}</small></div>
          <div className="admin-signup-details"><b>{user.signup.firmName || 'Firm not provided'}</b><span>{user.signup.firmEmail || 'Firm email not provided'}</span><small>{[user.signup.country, user.signup.currency].filter(Boolean).join(' · ') || 'Country and currency not provided'}</small></div>
          <span className="admin-date">{date(user.createdAt)}</span>
          <div className="admin-status-cell"><span className={`admin-status${inactive ? ' is-inactive' : ''}`}>{inactive ? 'Suspended' : 'Active'}</span>{inactive && <small>Until {date(user.bannedUntil)}</small>}</div>
          <div className="admin-actions"><button type="button" className={`admin-action${inactive ? ' is-reactivate' : ''}`} disabled={busy === user.id} onClick={() => { setError(''); setReleaseDate(defaultReleaseDate()); setPendingAction({ user, action: inactive ? 'reactivate' : 'suspend' }); }}>{inactive ? 'Reactivate' : 'Suspend'}</button><button type="button" className="admin-action is-delete" disabled={busy === user.id} onClick={() => { setError(''); setPendingAction({ user, action: 'delete' }); }}>Delete</button></div>
        </article>;
      })}
      {filtered.length === 0 && <div className="empty-state admin-empty">{query ? 'No users match this search.' : 'No registered users found.'}</div>}
    </div>
    <div className="admin-pagination"><button className="button button-quiet" disabled={page <= 1} onClick={() => void load(page - 1)}>Previous</button><span>Page {page}</span><button className="button button-quiet" disabled={!hasMore} onClick={() => void load(page + 1)}>Next</button></div>
    {pendingAction && <Modal title={pendingAction.action === 'delete' ? 'Delete account' : pendingAction.action === 'suspend' ? 'Suspend account' : 'Reactivate account'} onClose={() => { if (!busy) setPendingAction(null); }}>
      <p className="admin-confirm-copy">{pendingAction.action === 'delete'
        ? <>Delete the account for <b>{pendingAction.user.email}</b>? They will no longer be able to sign in. Existing firm workspace records will be retained. This action cannot be undone.</>
        : pendingAction.action === 'suspend'
          ? <>Suspend <b>{pendingAction.user.email}</b>? Sign-in will be blocked until the selected date. Supabase will automatically release the suspension then.</>
          : <>Reactivate <b>{pendingAction.user.email}</b>? They will be able to sign in again.</>}</p>
      {pendingAction.action === 'suspend' && <label className="field admin-release-field"><span>Release date</span><input type="date" min={localDateValue(new Date())} value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} required/><small>Suspension ends at 11:59 PM in your local time on this date.</small></label>}
      {error && <div className="notice-bar" role="alert">{error}</div>}
      <div className="modal-footer"><button type="button" className="button button-quiet button-small" disabled={Boolean(busy)} onClick={() => setPendingAction(null)}>Cancel</button><button type="button" className={`button button-small${pendingAction.action === 'delete' ? ' admin-confirm-delete' : ' button-primary'}`} disabled={Boolean(busy)} onClick={() => void confirmAccountAction()}>{busy ? 'Saving…' : pendingAction.action === 'delete' ? 'Delete account' : pendingAction.action === 'suspend' ? 'Suspend until date' : 'Reactivate account'}</button></div>
    </Modal>}
  </>;
}
