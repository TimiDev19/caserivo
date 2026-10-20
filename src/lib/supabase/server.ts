import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const jar = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createServerClient(url, key, {
    cookies: { getAll: () => jar.getAll(), setAll: (values: Parameters<SetAllCookies>[0]) => {
      try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); } catch { /* Server Components cannot set cookies. */ }
    } },
  });
}
