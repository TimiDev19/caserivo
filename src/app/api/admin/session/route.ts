import { NextResponse } from 'next/server';
import { adminSessionCookie, adminSessionTtl, checkAdminCredentials, createAdminSession } from '@/lib/admin';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Enter your admin email and password.' }, { status: 400 }); }
  if (typeof body.email !== 'string' || typeof body.password !== 'string' || !checkAdminCredentials(body.email, body.password)) {
    return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(adminSessionCookie, createAdminSession(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: adminSessionTtl,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(adminSessionCookie, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}
