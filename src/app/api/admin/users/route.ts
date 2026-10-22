import { NextResponse } from 'next/server';
import { ADMIN_EMAIL, createAdminClient, getAdminSession, isAdminServiceConfigured } from '@/lib/admin';

export const dynamic = 'force-dynamic';

async function authorize() {
  const session = await getAdminSession();
  if (!session) return { response: NextResponse.json({ error: 'Admin sign in required.' }, { status: 401 }) };
  const admin = createAdminClient();
  if (!admin || !isAdminServiceConfigured()) return { response: NextResponse.json({ error: 'Replace the dummy service key with a valid Supabase service-role key to manage users.' }, { status: 503 }) };
  return { session, admin };
}

export async function GET(request: Request) {
  const auth = await authorize();
  if ('response' in auth) return auth.response;
  const pageParam = Number(new URL(request.url).searchParams.get('page') ?? 1);
  const page = Number.isInteger(pageParam) ? Math.max(1, pageParam) : 1;
  const { data, error } = await auth.admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) return NextResponse.json({ error: 'Could not load users.' }, { status: 502 });
  let summaryPage = 1;
  let totalUsers = 0;
  let suspendedUsers = 0;
  let lastPage = 1;
  do {
    const { data: batch, error: summaryError } = await auth.admin.auth.admin.listUsers({ page: summaryPage, perPage: 1000 });
    if (summaryError) return NextResponse.json({ error: 'Could not calculate account totals.' }, { status: 502 });
    totalUsers = batch.total;
    suspendedUsers += batch.users.filter((user) => Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now())).length;
    lastPage = batch.lastPage;
    summaryPage += 1;
  } while (summaryPage <= lastPage);
  return NextResponse.json({
    users: data.users.map((user) => ({
      id: user.id,
      email: user.email ?? '',
      createdAt: user.created_at,
      emailConfirmedAt: user.email_confirmed_at ?? null,
      bannedUntil: user.banned_until ?? null,
      signup: {
        name: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '',
        firmName: typeof user.user_metadata?.firm_name === 'string' ? user.user_metadata.firm_name : '',
        firmEmail: typeof user.user_metadata?.firm_email === 'string' ? user.user_metadata.firm_email : '',
        country: typeof user.user_metadata?.country === 'string' ? user.user_metadata.country : '',
        currency: typeof user.user_metadata?.currency === 'string' ? user.user_metadata.currency : '',
      },
    })),
    page,
    hasMore: data.users.length === 100,
    summary: { totalUsers, suspendedUsers },
  }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function PATCH(request: Request) {
  const auth = await authorize();
  if ('response' in auth) return auth.response;
  let body: { userId?: unknown; action?: unknown; releaseAt?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.userId) || !['suspend', 'reactivate', 'delete'].includes(String(body.action))) {
    return NextResponse.json({ error: 'Invalid user or action.' }, { status: 400 });
  }
  if (body.action === 'suspend' || body.action === 'delete') {
    const { data: target, error: lookupError } = await auth.admin.auth.admin.getUserById(body.userId);
    if (lookupError || !target.user) return NextResponse.json({ error: 'Could not find that account.' }, { status: 404 });
    if (target.user.email?.trim().toLowerCase() === ADMIN_EMAIL) {
      return NextResponse.json({ error: 'The admin account cannot be changed here.' }, { status: 400 });
    }
  }
  if (body.action === 'delete') {
    // Soft deletion disables sign-in and removes the user from active Auth listings while preserving
    // existing foreign-key references and workspace records.
    const { error } = await auth.admin.auth.admin.deleteUser(body.userId, true);
    if (error) return NextResponse.json({ error: 'Could not delete this account.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  }
  let banDuration: string | undefined;
  if (body.action === 'suspend') {
    if (typeof body.releaseAt !== 'string') return NextResponse.json({ error: 'Choose a release date.' }, { status: 400 });
    const releaseAt = new Date(body.releaseAt);
    if (Number.isNaN(releaseAt.getTime()) || releaseAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Choose a release date in the future.' }, { status: 400 });
    }
    banDuration = `${Math.ceil((releaseAt.getTime() - Date.now()) / 1000)}s`;
  }
  const { error } = await auth.admin.auth.admin.updateUserById(body.userId, {
    ban_duration: body.action === 'suspend' ? banDuration : 'none',
  });
  if (error) return NextResponse.json({ error: 'Could not update this account.' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
