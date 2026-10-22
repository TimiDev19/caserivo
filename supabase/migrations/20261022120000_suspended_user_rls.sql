-- Supabase Auth bans block new sign-ins until their expiry. Also make RLS
-- reject already-issued sessions while a ban is active.
create or replace function private.is_firm_member(target_firm uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
   select 1
   from public.firm_members m
   join auth.users u on u.id=m.user_id
   where m.firm_id=target_firm
     and m.user_id=auth.uid()
     and (u.banned_until is null or u.banned_until <= now())
 );
$$;

create or replace function private.has_firm_role(target_firm uuid, allowed public.firm_role[])
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
   select 1
   from public.firm_members m
   join auth.users u on u.id=m.user_id
   where m.firm_id=target_firm
     and m.user_id=auth.uid()
     and m.role=any(allowed)
     and (u.banned_until is null or u.banned_until <= now())
 );
$$;

create or replace function private.create_firm_workspace(
  firm_name text,
  firm_email text,
  firm_country text,
  firm_currency text,
  actor_user_id uuid
)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare new_firm uuid;
begin
 if auth.uid() is null or auth.uid() <> actor_user_id
    or exists(select 1 from auth.users where id=auth.uid() and banned_until > now()) then
   raise exception 'Unauthorized';
 end if;
 if length(trim(firm_name)) < 2 or length(firm_currency) <> 3 then raise exception 'Invalid firm details'; end if;
 insert into public.firms(name,email,country,currency) values(trim(firm_name),trim(firm_email),trim(firm_country),upper(firm_currency)) returning id into new_firm;
 insert into public.firm_members(firm_id,user_id,role) values(new_firm,auth.uid(),'owner');
 return new_firm;
end $$;
