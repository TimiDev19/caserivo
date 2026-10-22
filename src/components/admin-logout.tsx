'use client';

export default function AdminLogout() {
  async function logout() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    window.location.assign('/admin/login');
  }
  return <button type="button" className="admin-logout" onClick={() => void logout()}>Sign out</button>;
}
