import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const db = await createClient();
  if (!db) return NextResponse.redirect(new URL('/login?error=configuration', request.url));

  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/login?error=verification', request.url));
  }

  const { data: { user }, error: userError } = await db.auth.getUser();
  if (userError || !user) return NextResponse.redirect(new URL('/login?error=verification', request.url));

  if (url.searchParams.get('flow') === 'signup') {
    const { data: membership, error: membershipError } = await db.from('firm_members').select('firm_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (membershipError) return NextResponse.redirect(new URL('/onboarding?error=workspace', request.url));
    if (!membership) {
      const profile = user.user_metadata ?? {};
      if (!profile.firm_name || !profile.firm_email || !profile.country || !profile.currency) {
        return NextResponse.redirect(new URL('/onboarding?error=details', request.url));
      }
      const { error } = await db.rpc('create_firm_workspace', {
        firm_name: profile.firm_name,
        firm_email: profile.firm_email,
        firm_country: profile.country,
        firm_currency: profile.currency,
        actor_user_id: user.id,
      });
      if (error) return NextResponse.redirect(new URL('/onboarding?error=workspace', request.url));
    }
  }

  const next = url.searchParams.get('next');
  const path = next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return NextResponse.redirect(new URL(path, request.url));
}
