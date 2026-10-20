create or replace function private.update_invoice_with_items(
  p_invoice_id uuid,
  p_client_id uuid,
  p_due_date date,
  p_payment_account_number text,
  p_payment_bank_name text,
  p_payment_account_name text,
  p_items jsonb,
  p_actor_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  invoice_row public.invoices%rowtype;
  client_row public.clients%rowtype;
  new_total bigint := 0;
  item jsonb;
  item_description text;
  item_amount bigint;
begin
  if auth.uid() is null or auth.uid() <> p_actor_user_id then raise exception 'Unauthorized'; end if;
  select * into invoice_row from public.invoices where id = p_invoice_id;
  if invoice_row.id is null or not private.has_firm_role(invoice_row.firm_id, array['owner','administrator','lawyer']::public.firm_role[]) then
    raise exception 'You do not have permission to update this invoice.';
  end if;
  if invoice_row.status in ('paid','void') then raise exception 'Paid or void invoices cannot be edited.'; end if;
  if p_due_date is null or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A due date and at least one service are required.';
  end if;
  select * into client_row from public.clients where id = p_client_id and firm_id = invoice_row.firm_id;
  if client_row.id is null then raise exception 'Select a valid client from this workspace.'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    item_description := trim(item->>'description');
    if item_description is null or item_description = '' then raise exception 'Every service needs a description.'; end if;
    if coalesce(item->>'amount_minor','') !~ '^[0-9]{1,15}$' then raise exception 'Enter a valid amount for every service.'; end if;
    item_amount := (item->>'amount_minor')::bigint;
    new_total := new_total + item_amount;
    if new_total > 9000000000000000 then raise exception 'Invoice total is too large.'; end if;
  end loop;
  update public.invoices set client_id=p_client_id, due_at=(p_due_date + time '12:00') at time zone 'UTC',
    client_snapshot=jsonb_build_object('name',client_row.name,'email',client_row.email,'address',client_row.address),
    payment_account_number=nullif(trim(p_payment_account_number),''), payment_bank_name=nullif(trim(p_payment_bank_name),''),
    payment_account_name=nullif(trim(p_payment_account_name),''), subtotal_minor=new_total, total_minor=new_total,
    updated_at=now()
  where id=p_invoice_id;
  delete from public.invoice_items where invoice_id=p_invoice_id;
  for item in select value from jsonb_array_elements(p_items) loop
    item_description := trim(item->>'description'); item_amount := (item->>'amount_minor')::bigint;
    insert into public.invoice_items(invoice_id,description,quantity,unit_amount_minor,line_total_minor)
    values(p_invoice_id,item_description,1,item_amount,item_amount);
  end loop;
end;
$$;
revoke all on function private.update_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) from public, anon;
grant execute on function private.update_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) to authenticated;

create or replace function public.update_invoice_with_items(
  p_invoice_id uuid, p_client_id uuid, p_due_date date, p_payment_account_number text,
  p_payment_bank_name text, p_payment_account_name text, p_items jsonb, p_actor_user_id uuid
) returns void language sql security invoker set search_path=public,private,pg_temp as $$
  select private.update_invoice_with_items(p_invoice_id,p_client_id,p_due_date,p_payment_account_number,p_payment_bank_name,p_payment_account_name,p_items,p_actor_user_id);
$$;
revoke all on function public.update_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) from public, anon;
grant execute on function public.update_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) to authenticated;
