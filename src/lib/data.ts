import { createClient } from '@/lib/supabase/server';

export type Workspace = { id: string; name: string };
export async function getWorkspace() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, workspace: null };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, workspace: null };
  const { data } = await supabase.from('firm_members').select('firm:firms(id,name)').eq('user_id', user.id).limit(1).maybeSingle();
  const firm = data?.firm as unknown as Workspace | null;
  return { supabase, user, workspace: firm ?? null };
}
