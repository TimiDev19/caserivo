import VerifyEmail from '@/components/verify-email';
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <VerifyEmail initialEmail={email ?? ''}/>;
}
