-- Migration: 20261108180000_customer_onboarding.sql
-- Add onboarding and business profile fields to public.profiles

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists account_type text not null default 'personal' check (account_type in ('personal', 'business')),
  add column if not exists company_name text,
  add column if not exists gstin text,
  add column if not exists city text,
  add column if not exists default_address text,
  add column if not exists default_pincode text,
  add column if not exists preferred_vehicle text default 'bike' check (preferred_vehicle in ('bike', 'auto', 'car', 'pickup'));

grant update (
  full_name,
  email,
  phone,
  onboarding_completed,
  account_type,
  company_name,
  gstin,
  city,
  default_address,
  default_pincode,
  preferred_vehicle
) on public.profiles to authenticated;
