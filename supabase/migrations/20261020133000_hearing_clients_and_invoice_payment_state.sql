alter table public.hearings add column client_id uuid;
alter table public.hearings add constraint hearings_client_same_firm
  foreign key (firm_id, client_id) references public.clients(firm_id, id);

create or replace function private.set_invoice_paid_state(
  p_invoice_id uuid,
  p_is_paid boolean,
  p_actor_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  invoice_row public.invoices%rowtype;
begin
  if auth.uid() is null or auth.uid() <> p_actor_user_id then raise exception 'Unauthorized'; end if;
  select * into invoice_row from public.invoices where id = p_invoice_id for update;
  if invoice_row.id is null or not private.has_firm_role(invoice_row.firm_id, array['owner','administrator','lawyer']::public.firm_role[]) then
    raise exception 'You do not have permission to update this invoice.';
  end if;
  if invoice_row.status = 'void' then raise exception 'A void invoice cannot be marked paid or unpaid.'; end if;
  if p_is_paid then
    update public.invoices set status='paid', paid_minor=total_minor, updated_at=now() where id=p_invoice_id;
  else
    update public.invoices set status=case when due_at < now() then 'overdue' else 'issued' end,
      paid_minor=0, updated_at=now() where id=p_invoice_id;
  end if;
end;
$$;
revoke all on function private.set_invoice_paid_state(uuid,boolean,uuid) from public, anon;
grant execute on function private.set_invoice_paid_state(uuid,boolean,uuid) to authenticated;

create or replace function public.set_invoice_paid_state(p_invoice_id uuid, p_is_paid boolean, p_actor_user_id uuid)
returns void
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.set_invoice_paid_state(p_invoice_id,p_is_paid,p_actor_user_id);
$$;
revoke all on function public.set_invoice_paid_state(uuid,boolean,uuid) from public, anon;
grant execute on function public.set_invoice_paid_state(uuid,boolean,uuid) to authenticated;
