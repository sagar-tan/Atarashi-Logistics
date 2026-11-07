-- Migration: 20261107000000_auth_user_roles_trigger.sql
-- Automatically populate public.profiles (full_name, email, phone) and public.user_roles ('customer') on auth.users insert

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_role public.app_role;
begin
  -- 1. Populate profiles table with id, full_name, email, phone
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.phone
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(excluded.phone, public.profiles.phone),
    updated_at = now();

  -- 2. Determine role from user metadata or default to 'customer'
  begin
    default_role := coalesce(
      (new.raw_user_meta_data->>'role')::public.app_role,
      'customer'::public.app_role
    );
  exception when others then
    default_role := 'customer'::public.app_role;
  end;

  -- 3. Populate user_roles table
  insert into public.user_roles (user_id, role)
  values (new.id, default_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
