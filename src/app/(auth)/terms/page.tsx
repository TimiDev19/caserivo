import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Terms of Service', description: 'Review the terms for using the Caserivo legal practice workspace.', alternates: { canonical: '/terms' }, robots: { index: false, follow: false, noarchive: true } };
export default function Terms(){return <main className="auth-content"><article className="auth-form"><h2>Terms of service</h2><p>These draft terms are placeholders, not a binding agreement. The service operator must add reviewed terms before accepting customers.</p></article></main>}
