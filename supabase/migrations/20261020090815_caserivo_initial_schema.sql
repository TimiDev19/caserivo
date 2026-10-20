create extension if not exists pgcrypto;
grant usage on schema public to authenticated;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.firm_role as enum ('owner','administrator','lawyer','staff');
create type public.record_status as enum ('active','closed','archived');

create table public.firms (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 180), email text not null,
 country text not null default 'Nigeria', currency char(3) not null default 'NGN', logo_path text,
 address text, phone text, website text, tax_id text, invoice_instructions text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.firm_members (
 firm_id uuid not null references public.firms on delete cascade, user_id uuid not null references auth.users on delete cascade,
 role public.firm_role not null default 'staff', created_at timestamptz not null default now(), primary key(firm_id,user_id)
);
create index firm_members_user_idx on public.firm_members(user_id);

create function private.is_firm_member(target_firm uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.firm_members m where m.firm_id=target_firm and m.user_id=auth.uid()); $$;
create function private.has_firm_role(target_firm uuid, allowed public.firm_role[]) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.firm_members m where m.firm_id=target_firm and m.user_id=auth.uid() and m.role=any(allowed)); $$;
revoke all on function private.is_firm_member(uuid) from public; grant execute on function private.is_firm_member(uuid) to authenticated;
revoke all on function private.has_firm_role(uuid,public.firm_role[]) from public; grant execute on function private.has_firm_role(uuid,public.firm_role[]) to authenticated;

create function private.create_firm_workspace(firm_name text, firm_email text, firm_country text, firm_currency text, actor_user_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_firm uuid;
begin
 if auth.uid() is null or auth.uid() <> actor_user_id then raise exception 'Unauthorized'; end if;
 if length(trim(firm_name)) < 2 or length(firm_currency) <> 3 then raise exception 'Invalid firm details'; end if;
 insert into public.firms(name,email,country,currency) values(trim(firm_name),trim(firm_email),trim(firm_country),upper(firm_currency)) returning id into new_firm;
 insert into public.firm_members(firm_id,user_id,role) values(new_firm,auth.uid(),'owner');
 return new_firm;
end $$;
revoke all on function private.create_firm_workspace(text,text,text,text,uuid) from public;
grant execute on function private.create_firm_workspace(text,text,text,text,uuid) to authenticated;
create function public.create_firm_workspace(firm_name text, firm_email text, firm_country text, firm_currency text, actor_user_id uuid)
returns uuid language sql security invoker set search_path=public,private,pg_temp as $$
 select private.create_firm_workspace(firm_name,firm_email,firm_country,firm_currency,actor_user_id); $$;
revoke all on function public.create_firm_workspace(text,text,text,text,uuid) from public;
grant execute on function public.create_firm_workspace(text,text,text,text,uuid) to authenticated;

create table public.clients (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms on delete cascade,
 name text not null check(length(name) between 1 and 200), client_type text not null default 'individual' check(client_type in ('individual','organization')),
 email text, phone text, address text, notes text, status public.record_status not null default 'active',
 created_by uuid not null references auth.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index clients_firm_name_idx on public.clients(firm_id,name);
alter table public.clients add constraint clients_firm_id_id_unique unique(firm_id,id);
create table public.cases (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms on delete cascade,
 client_id uuid references public.clients on delete set null, title text not null, reference text not null,
 case_type text, description text, court_name text, status public.record_status not null default 'active',
 assigned_to uuid references auth.users, created_by uuid not null references auth.users,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(firm_id,reference)
);
create index cases_firm_idx on public.cases(firm_id,status,updated_at desc);
alter table public.cases add constraint cases_firm_id_id_unique unique(firm_id,id);
alter table public.cases add constraint cases_client_same_firm foreign key(firm_id,client_id) references public.clients(firm_id,id);
create table public.hearings (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms on delete cascade,
 case_id uuid references public.cases on delete set null, title text not null, court_name text not null,
 starts_at timestamptz not null, ends_at timestamptz, notes text, status text not null default 'scheduled' check(status in ('scheduled','completed','cancelled','rescheduled')),
 reminder_state text not null default 'pending' check(reminder_state in ('pending','sent','failed','cancelled')),
 reminder_sent_at timestamptz, created_by uuid not null references auth.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index hearings_reminders_idx on public.hearings(starts_at) where status='scheduled' and reminder_state='pending';
alter table public.hearings add constraint hearings_case_same_firm foreign key(firm_id,case_id) references public.cases(firm_id,id);
create table public.invoices (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms on delete cascade,
 client_id uuid references public.clients on delete set null, case_id uuid references public.cases on delete set null,
 invoice_number text not null, currency char(3) not null, status text not null default 'draft' check(status in ('draft','issued','paid','overdue','void')),
 subtotal_minor bigint not null default 0 check(subtotal_minor>=0), tax_minor bigint not null default 0 check(tax_minor>=0), total_minor bigint not null default 0 check(total_minor>=0), paid_minor bigint not null default 0 check(paid_minor>=0 and paid_minor<=total_minor),
 issued_at timestamptz, due_at timestamptz, firm_snapshot jsonb not null default '{}'::jsonb, client_snapshot jsonb not null default '{}'::jsonb,
 created_by uuid not null references auth.users, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(firm_id,invoice_number)
);
create table public.invoice_items (
 id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices on delete cascade,
 description text not null, quantity numeric(12,3) not null check(quantity>0), unit_amount_minor bigint not null check(unit_amount_minor>=0), line_total_minor bigint not null check(line_total_minor>=0)
);
alter table public.invoices add constraint invoices_client_same_firm foreign key(firm_id,client_id) references public.clients(firm_id,id);
alter table public.invoices add constraint invoices_case_same_firm foreign key(firm_id,case_id) references public.cases(firm_id,id);
create table public.payments (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms on delete cascade,
 invoice_id uuid not null references public.invoices on delete cascade, amount_minor bigint not null check(amount_minor>0), paid_at timestamptz not null default now(), method text, reference text, created_by uuid not null references auth.users, created_at timestamptz not null default now()
);
create table public.documents (
 id uuid primary key default gen_random_uuid(), firm_id uuid not null references public.firms on delete cascade,
 storage_path text not null, filename text not null, content_type text not null, size_bytes bigint not null check(size_bytes between 1 and 20971520),
 client_id uuid references public.clients on delete cascade, case_id uuid references public.cases on delete cascade, uploaded_by uuid not null references auth.users, created_at timestamptz not null default now()
);
alter table public.documents add constraint documents_client_same_firm foreign key(firm_id,client_id) references public.clients(firm_id,id);
alter table public.documents add constraint documents_case_same_firm foreign key(firm_id,case_id) references public.cases(firm_id,id);
create table public.audit_logs (
 id bigint generated always as identity primary key, firm_id uuid not null references public.firms on delete cascade,
 actor_user_id uuid not null references auth.users, action text not null, entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create function private.write_audit_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare row_firm uuid; row_id uuid; actor uuid;
begin
 row_firm := coalesce(new.firm_id,old.firm_id); row_id := coalesce(new.id,old.id);
 actor := coalesce(auth.uid(),new.created_by,old.created_by);
 if actor is not null then
  insert into public.audit_logs(firm_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(row_firm,actor,lower(tg_op),tg_table_name,row_id,'{}'::jsonb);
 end if;
 return coalesce(new,old);
end $$;
revoke all on function private.write_audit_event() from public;
create trigger audit_clients after insert or update or delete on public.clients for each row execute function private.write_audit_event();
create trigger audit_cases after insert or update or delete on public.cases for each row execute function private.write_audit_event();
create trigger audit_hearings after insert or update or delete on public.hearings for each row execute function private.write_audit_event();
create trigger audit_invoices after insert or update or delete on public.invoices for each row execute function private.write_audit_event();

do $$ declare t text; begin
 foreach t in array array['firms','firm_members','clients','cases','hearings','invoices','invoice_items','payments','documents','audit_logs'] loop
  execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;
create policy "members read firms" on public.firms for select to authenticated using(private.is_firm_member(id));
create policy "owners update firms" on public.firms for update to authenticated using(private.has_firm_role(id,array['owner','administrator']::public.firm_role[])) with check(private.has_firm_role(id,array['owner','administrator']::public.firm_role[]));
create policy "members read membership" on public.firm_members for select to authenticated using(private.is_firm_member(firm_id));
create policy "owners manage membership" on public.firm_members for all to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[])) with check(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));
create policy "members read clients" on public.clients for select to authenticated using(private.is_firm_member(firm_id));
create policy "authorized create clients" on public.clients for insert to authenticated with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer','staff']::public.firm_role[]) and created_by=auth.uid());
create policy "authorized update clients" on public.clients for update to authenticated using(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[])) with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]));
create policy "admins archive clients" on public.clients for delete to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));
create policy "members read cases" on public.cases for select to authenticated using(private.is_firm_member(firm_id));
create policy "lawyers create cases" on public.cases for insert to authenticated with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]) and created_by=auth.uid());
create policy "lawyers update cases" on public.cases for update to authenticated using(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[])) with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]));
create policy "admins delete cases" on public.cases for delete to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));
create policy "members read hearings" on public.hearings for select to authenticated using(private.is_firm_member(firm_id));
create policy "lawyers create hearings" on public.hearings for insert to authenticated with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]) and created_by=auth.uid());
create policy "lawyers update hearings" on public.hearings for update to authenticated using(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[])) with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]));
create policy "admins delete hearings" on public.hearings for delete to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));
create policy "members read invoices" on public.invoices for select to authenticated using(private.is_firm_member(firm_id));
create policy "billing create invoices" on public.invoices for insert to authenticated with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]) and created_by=auth.uid());
create policy "billing update invoices" on public.invoices for update to authenticated using(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[])) with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]));
create policy "admins delete invoices" on public.invoices for delete to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));
create policy "members read invoice items" on public.invoice_items for select to authenticated using(exists(select 1 from public.invoices i where i.id=invoice_id and private.is_firm_member(i.firm_id)));
create policy "billing manage invoice items" on public.invoice_items for all to authenticated using(exists(select 1 from public.invoices i where i.id=invoice_id and private.has_firm_role(i.firm_id,array['owner','administrator','lawyer']::public.firm_role[]))) with check(exists(select 1 from public.invoices i where i.id=invoice_id and private.has_firm_role(i.firm_id,array['owner','administrator','lawyer']::public.firm_role[])));
create policy "members read payments" on public.payments for select to authenticated using(private.is_firm_member(firm_id));
create policy "billing create payments" on public.payments for insert to authenticated with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]) and created_by=auth.uid());
create policy "billing update payments" on public.payments for update to authenticated using(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[])) with check(private.has_firm_role(firm_id,array['owner','administrator','lawyer']::public.firm_role[]));
create policy "admins delete payments" on public.payments for delete to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));
create policy "members read documents" on public.documents for select to authenticated using(private.is_firm_member(firm_id));
create policy "members add documents" on public.documents for insert to authenticated with check(private.is_firm_member(firm_id) and uploaded_by=auth.uid());
create policy "admins delete documents" on public.documents for delete to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));
create policy "admins read audit" on public.audit_logs for select to authenticated using(private.has_firm_role(firm_id,array['owner','administrator']::public.firm_role[]));

grant select,insert,update,delete on public.firms,public.firm_members,public.clients,public.cases,public.hearings,public.invoices,public.invoice_items,public.payments,public.documents to authenticated;
grant select on public.audit_logs to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('firm-documents','firm-documents',false,20971520,array['application/pdf','image/png','image/jpeg','image/webp']) on conflict(id) do nothing;
create policy "firm members access own folder" on storage.objects for select to authenticated using(bucket_id='firm-documents' and private.is_firm_member((storage.foldername(name))[1]::uuid));
create policy "firm members upload own folder" on storage.objects for insert to authenticated with check(bucket_id='firm-documents' and private.is_firm_member((storage.foldername(name))[1]::uuid));
create policy "firm admins delete own files" on storage.objects for delete to authenticated using(bucket_id='firm-documents' and private.has_firm_role((storage.foldername(name))[1]::uuid,array['owner','administrator']::public.firm_role[]));
