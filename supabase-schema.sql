-- ============================================================
-- Dumiropay Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists pgcrypto;

-- Users table (phone is primary key, PIN stored as SHA-256 hash)
create table if not exists public.users (
  phone         text primary key,
  name          text not null,
  pin_hash      text not null,
  balance       numeric not null default 0,
  bonus_balance numeric not null default 0,
  is_admin      boolean not null default false,
  referral_code text unique,
  referred_by   text references public.users(phone),
  created_at    timestamptz not null default now()
);

-- Deposits table (pending until admin approves, or auto-approved via callback)
create table if not exists public.deposits (
  id             uuid primary key default gen_random_uuid(),
  user_phone     text not null references public.users(phone),
  amount         numeric not null,
  checkout_id    text,
  mpesa_receipt  text,
  status         text not null default 'pending',   -- pending | approved | rejected
  created_at     timestamptz not null default now()
);

-- Withdrawals table
create table if not exists public.withdrawals (
  id          uuid primary key default gen_random_uuid(),
  user_phone  text not null references public.users(phone),
  amount      numeric not null,
  fee         numeric not null default 0,
  net_amount  numeric not null,
  mpesa_phone text not null,
  status      text not null default 'pending',      -- pending | approved | rejected
  created_at  timestamptz not null default now()
);

-- Loans table
create table if not exists public.loans (
  id          uuid primary key default gen_random_uuid(),
  user_phone  text not null references public.users(phone),
  amount      numeric not null,
  purpose     text,
  status      text not null default 'pending',      -- pending | approved | rejected
  created_at  timestamptz not null default now()
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

-- Keywords / promo bonus codes table
create table if not exists public.keywords (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  active      boolean not null default true,
  min_bonus   numeric not null default 50,
  max_bonus   numeric not null default 500,
  max_claims  integer not null default 5,
  claim_count integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Tracks which user claimed which keyword (enforces one-claim-per-user)
create table if not exists public.keyword_claims (
  id           uuid primary key default gen_random_uuid(),
  keyword_id   uuid not null references public.keywords(id),
  user_phone   text not null references public.users(phone),
  bonus_amount numeric not null,
  created_at   timestamptz not null default now(),
  unique(keyword_id, user_phone)
);

-- Support / live chat messages
create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  user_phone  text not null,
  message     text not null,
  sender_type text not null default 'user',          -- user | admin
  created_at  timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
-- NOTE: The current app uses a custom phone+PIN auth system, not Supabase Auth,
-- so auth.uid()-based policies are not applicable here. These open anon policies
-- let the frontend operate. For production, migrate to Supabase Auth and replace
-- these with policies that check auth.uid() = user_phone and is_admin flags.

alter table public.users             enable row level security;
alter table public.deposits          enable row level security;
alter table public.withdrawals       enable row level security;
alter table public.loans             enable row level security;
alter table public.investments       enable row level security;
alter table public.referrals         enable row level security;
alter table public.keywords          enable row level security;
alter table public.keyword_claims    enable row level security;
alter table public.support_messages  enable row level security;

grant usage on schema public to anon, authenticated;
grant all on table
  public.users,
  public.deposits,
  public.withdrawals,
  public.loans,
  public.investments,
  public.referrals,
  public.keywords,
  public.keyword_claims,
  public.support_messages
to anon, authenticated;

drop policy if exists "anon_all" on public.users;
drop policy if exists "anon_all" on public.deposits;
drop policy if exists "anon_all" on public.withdrawals;
drop policy if exists "anon_all" on public.loans;
drop policy if exists "anon_all" on public.investments;
drop policy if exists "anon_all" on public.referrals;
drop policy if exists "anon_all" on public.keywords;
drop policy if exists "anon_all" on public.keyword_claims;
drop policy if exists "anon_all" on public.support_messages;

create policy "anon_all" on public.users             for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.deposits          for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.withdrawals       for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.loans             for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.investments       for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.referrals         for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.keywords          for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.keyword_claims    for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.support_messages  for all to anon, authenticated using (true) with check (true);

-- ── Incremental migration helpers (safe to re-run) ───────────────────────────
alter table public.deposits add column if not exists mpesa_receipt text;
alter table public.users    add column if not exists bonus_balance numeric not null default 0;
alter table public.users    add column if not exists is_admin boolean not null default false;
