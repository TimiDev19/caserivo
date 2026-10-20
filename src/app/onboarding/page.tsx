import WorkspaceRecovery from '@/components/workspace-recovery';
export default async function Onboarding({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <WorkspaceRecovery reason={error ?? 'workspace'}/>;
}
