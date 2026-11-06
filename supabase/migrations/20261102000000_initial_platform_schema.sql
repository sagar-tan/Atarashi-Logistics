create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, phone)
  values (new.id, new.email, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function app_private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

create type public.app_role as enum ('customer', 'driver', 'admin', 'moderator');
create type public.vehicle_type as enum ('bike', 'auto', 'car', 'pickup');
create type public.parcel_size as enum ('small', 'medium', 'large');
create type public.booking_status as enum ('pending', 'assigned', 'picked_up', 'in_transit', 'completed', 'cancelled', 'timed_out');
create type public.payment_method as enum ('cash', 'online', 'wallet');
create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  account_status text not null default 'active' check (account_status in ('active', 'inactive', 'banned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.vehicles (
  id uuid primary key default extensions.gen_random_uuid(),
  driver_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  registration_number text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.driver_status (
  driver_id uuid primary key references public.profiles(id) on delete cascade,
  is_online boolean not null default false,
  kyc_status text not null default 'pending' check (kyc_status in ('pending', 'verified', 'failed')),
  current_location extensions.geography(point, 4326),
  location_updated_at timestamptz,
  updated_at timestamptz not null default now()
);
create index driver_status_location_idx on public.driver_status using gist (current_location);

create table public.vehicle_pricing (
  vehicle_type public.vehicle_type primary key,
  price_per_km_paise integer not null check (price_per_km_paise >= 0),
  minimum_fare_paise integer not null check (minimum_fare_paise >= 0),
  driver_commission_basis_points integer not null check (driver_commission_basis_points between 0 and 10000),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default extensions.gen_random_uuid(),
  customer_id uuid not null references public.profiles(id),
  driver_id uuid references public.profiles(id),
  vehicle_type public.vehicle_type not null,
  parcel_size public.parcel_size not null,
  weight_kg numeric(7,2) not null check (weight_kg > 0),
  pickup_address text not null,
  pickup_location extensions.geography(point, 4326) not null,
  pickup_contact_name text not null,
  pickup_contact_phone text not null,
  dropoff_address text not null,
  dropoff_location extensions.geography(point, 4326) not null,
  dropoff_contact_name text not null,
  dropoff_contact_phone text not null,
  distance_meters integer not null check (distance_meters > 0),
  estimated_fare_paise integer not null check (estimated_fare_paise >= 0),
  final_fare_paise integer check (final_fare_paise >= 0),
  discount_paise integer not null default 0 check (discount_paise >= 0),
  status public.booking_status not null default 'pending',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_customer_created_idx on public.bookings (customer_id, created_at desc);
create index bookings_driver_status_idx on public.bookings (driver_id, status);
create index bookings_pickup_location_idx on public.bookings using gist (pickup_location);

create table public.booking_events (
  id uuid primary key default extensions.gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  from_status public.booking_status,
  to_status public.booking_status,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index booking_events_booking_created_idx on public.booking_events (booking_id, created_at);

create table public.wallet_ledger (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  booking_id uuid references public.bookings(id),
  amount_paise integer not null check (amount_paise <> 0),
  entry_type text not null check (entry_type in ('credit', 'debit', 'refund', 'commission', 'settlement')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.vehicles enable row level security;
alter table public.driver_status enable row level security;
alter table public.vehicle_pricing enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_events enable row level security;
alter table public.wallet_ledger enable row level security;

create policy "profiles_select_self_or_assigned_driver" on public.profiles for select to authenticated using (
  (select auth.uid()) = id or exists (
    select 1 from public.bookings b
    where b.customer_id = (select auth.uid()) and b.driver_id = id
  )
);
create policy "profiles_update_self" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "user_roles_select_self" on public.user_roles for select to authenticated using ((select auth.uid()) = user_id);
create policy "vehicles_select_owner" on public.vehicles for select to authenticated using ((select auth.uid()) = driver_id);
create policy "driver_status_select_owner_or_assigned_customer" on public.driver_status for select to authenticated using (
  (select auth.uid()) = driver_id or exists (
    select 1 from public.bookings b
    where b.customer_id = (select auth.uid()) and b.driver_id = driver_status.driver_id
      and b.status in ('assigned', 'picked_up', 'in_transit')
  )
);
create policy "pricing_select_authenticated" on public.vehicle_pricing for select to authenticated using (true);
create policy "bookings_select_customer_or_driver" on public.bookings for select to authenticated using ((select auth.uid()) = customer_id or (select auth.uid()) = driver_id);
create policy "booking_events_select_booking_party" on public.booking_events for select to authenticated using (
  exists (select 1 from public.bookings b where b.id = booking_id and ((select auth.uid()) = b.customer_id or (select auth.uid()) = b.driver_id))
);
create policy "wallet_ledger_select_owner" on public.wallet_ledger for select to authenticated using ((select auth.uid()) = user_id);

grant select on public.profiles to authenticated;
grant update (full_name, email) on public.profiles to authenticated;
grant select on public.user_roles, public.vehicles, public.driver_status, public.vehicle_pricing,
  public.bookings, public.booking_events, public.wallet_ledger to authenticated;
