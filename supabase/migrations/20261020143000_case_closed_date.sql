alter table public.cases add column closed_at timestamptz;
update public.cases set closed_at = updated_at where status = 'closed' and closed_at is null;
