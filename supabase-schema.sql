-- ============================================================
-- Dumiropay Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Users table (phone is primary key, PIN stored as SHA-256 hash)
create table if not exists public.users (
  phone         text primary key,
  name          text not null,
  pin_hash      text not null,
  balance       numeric not null default 0,
  referral_code text unique,
  referred_by   text references public.users(phone),
  created_at    timestamptz not null default now()
);

-- Deposits table (pending until admin approves)
create table if not exists public.deposits (
  id           uuid primary key default gen_random_uuid(),
  user_phone   text not null references public.users(phone),
  amount       numeric not null,
  checkout_id  text,
  status       text not null default 'pending', -- pending | approved | rejected
  created_at   timestamptz not null default now()
);

-- Investments table
create table if not exists public.investments (
  id           uuid primary key default gen_random_uuid(),
  user_phone   text not null references public.users(phone),
  plan_id      text not null,
  plan_name    text not null,
  amount       numeric not null,
  daily_return numeric not null,
  total_return numeric not null,
  status       text not null default 'active',
  created_at   timestamptz not null default now()
);

-- Referrals table
create table if not exists public.referrals (
  id             uuid primary key default gen_random_uuid(),
  referrer_phone text not null references public.users(phone),
  referred_phone text not null references public.users(phone),
  referred_name  text,
  level          integer not null,
  commission     numeric not null,
  plan_name      text,
  created_at     timestamptz not null default now()
);

-- Row Level Security (open for anon key - tighten later as needed)
alter table public.users       enable row level security;
alter table public.deposits    enable row level security;
alter table public.investments enable row level security;
alter table public.referrals   enable row level security;

create policy "anon_all" on public.users       for all to anon using (true) with check (true);
create policy "anon_all" on public.deposits    for all to anon using (true) with check (true);
create policy "anon_all" on public.investments for all to anon using (true) with check (true);
create policy "anon_all" on public.referrals   for all to anon using (true) with check (true);
