import WorkspaceRecovery from '@/components/workspace-recovery';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Complete Workspace Setup', robots: { index: false, follow: false, noarchive: true } };
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <WorkspaceRecovery reason={error ?? 'workspace'}/>;
}
