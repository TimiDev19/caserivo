alter table public.invoices
  add column payment_account_number text,
  add column payment_bank_name text,
  add column payment_account_name text;

create or replace function private.create_invoice_with_items(
  p_firm_id uuid,
  p_client_id uuid,
  p_due_date date,
  p_payment_account_number text,
  p_payment_bank_name text,
  p_payment_account_name text,
  p_items jsonb,
  p_actor_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  new_invoice_id uuid;
  firm_row public.firms%rowtype;
  client_row public.clients%rowtype;
  new_invoice_number text;
  new_total bigint := 0;
  item jsonb;
  item_description text;
  item_amount bigint;
begin
  if auth.uid() is null or auth.uid() <> p_actor_user_id then
    raise exception 'Unauthorized';
  end if;
  if not private.has_firm_role(p_firm_id, array['owner','administrator','lawyer']::public.firm_role[]) then
    raise exception 'You do not have permission to create invoices for this workspace.';
  end if;
  if p_due_date is null or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A due date and at least one service are required.';
  end if;
  select * into firm_row from public.firms where id = p_firm_id;
  select * into client_row from public.clients where id = p_client_id and firm_id = p_firm_id;
  if firm_row.id is null or client_row.id is null then
    raise exception 'Select a valid client from this workspace.';
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    item_description := trim(item->>'description');
    if item_description is null or item_description = '' then
      raise exception 'Every service needs a description.';
    end if;
    if coalesce(item->>'amount_minor','') !~ '^[0-9]{1,15}$' then
      raise exception 'Enter a valid amount for every service.';
    end if;
    item_amount := (item->>'amount_minor')::bigint;
    if item_amount < 0 then raise exception 'Service amounts cannot be negative.'; end if;
    new_total := new_total + item_amount;
    if new_total > 9000000000000000 then raise exception 'Invoice total is too large.'; end if;
  end loop;

  new_invoice_number := 'CRV-' || to_char(current_date, 'YYYYMM') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.invoices (
    firm_id, client_id, invoice_number, currency, status, subtotal_minor, total_minor,
    issued_at, due_at, firm_snapshot, client_snapshot,
    payment_account_number, payment_bank_name, payment_account_name, created_by
  ) values (
    p_firm_id, p_client_id, new_invoice_number, firm_row.currency, 'issued', new_total, new_total,
    now(), (p_due_date + time '12:00') at time zone 'UTC',
    jsonb_build_object('name', firm_row.name, 'email', firm_row.email, 'country', firm_row.country, 'address', firm_row.address, 'phone', firm_row.phone, 'website', firm_row.website, 'tax_id', firm_row.tax_id, 'invoice_instructions', firm_row.invoice_instructions),
    jsonb_build_object('name', client_row.name, 'email', client_row.email, 'address', client_row.address),
    nullif(trim(p_payment_account_number), ''), nullif(trim(p_payment_bank_name), ''), nullif(trim(p_payment_account_name), ''), p_actor_user_id
  ) returning id into new_invoice_id;

  for item in select value from jsonb_array_elements(p_items) loop
    item_description := trim(item->>'description');
    item_amount := (item->>'amount_minor')::bigint;
    insert into public.invoice_items(invoice_id, description, quantity, unit_amount_minor, line_total_minor)
    values(new_invoice_id, item_description, 1, item_amount, item_amount);
  end loop;
  return new_invoice_id;
end;
$$;
revoke all on function private.create_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) from public, anon;
grant execute on function private.create_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) to authenticated;

create or replace function public.create_invoice_with_items(
  p_firm_id uuid,
  p_client_id uuid,
  p_due_date date,
  p_payment_account_number text,
  p_payment_bank_name text,
  p_payment_account_name text,
  p_items jsonb,
  p_actor_user_id uuid
) returns uuid
language sql
security invoker
set search_path = public, private, pg_temp
as $$
  select private.create_invoice_with_items(p_firm_id,p_client_id,p_due_date,p_payment_account_number,p_payment_bank_name,p_payment_account_name,p_items,p_actor_user_id);
$$;
revoke all on function public.create_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) from public, anon;
grant execute on function public.create_invoice_with_items(uuid,uuid,date,text,text,text,jsonb,uuid) to authenticated;
