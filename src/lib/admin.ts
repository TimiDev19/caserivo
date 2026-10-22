import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Separate, server-only administrator credentials. Never expose these through a client component or NEXT_PUBLIC_ variable.
export const ADMIN_EMAIL = 'admin.teemi@caserivo.local';
const ADMIN_PASSWORD = 'NoniMadueke';
const SESSION_COOKIE = 'caserivo_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function signature(value: string) {
  return createHmac('sha256', ADMIN_PASSWORD).update(value).digest('base64url');
}

export function checkAdminCredentials(email: string, password: string) {
  const providedEmail = Buffer.from(email.trim().toLowerCase());
  const expectedEmail = Buffer.from(ADMIN_EMAIL);
  const providedPassword = Buffer.from(password);
  const expectedPassword = Buffer.from(ADMIN_PASSWORD);
  return providedEmail.length === expectedEmail.length && timingSafeEqual(providedEmail, expectedEmail)
    && providedPassword.length === expectedPassword.length && timingSafeEqual(providedPassword, expectedPassword);
}

export function createAdminSession() {
  const payload = Buffer.from(JSON.stringify({ email: ADMIN_EMAIL, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString('base64url');
  return `${payload}.${signature(payload)}`;
}

export async function getAdminSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [payload, suppliedSignature, extra] = token.split('.');
  if (!payload || !suppliedSignature || extra) return null;
  const expectedSignature = Buffer.from(signature(payload));
  const receivedSignature = Buffer.from(suppliedSignature);
  if (expectedSignature.length !== receivedSignature.length || !timingSafeEqual(expectedSignature, receivedSignature)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: unknown; exp?: unknown };
    if (session.email !== ADMIN_EMAIL || typeof session.exp !== 'number' || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return { email: ADMIN_EMAIL };
  } catch {
    return null;
  }
}

export const adminSessionCookie = SESSION_COOKIE;
export const adminSessionTtl = SESSION_TTL_SECONDS;

export function isAdminServiceConfigured() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(key && !key.toLowerCase().startsWith('dummy-'));
}

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !isAdminServiceConfigured()) return null;
  return createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
