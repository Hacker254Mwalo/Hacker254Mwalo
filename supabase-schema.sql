-- ============================================================
-- Dumiropay Supabase Schema (v2)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run.
--
-- WHY THIS VERSION EXISTS:
-- 1) The live `investments` table was created at some point with the
--    WRONG columns (a `user_id uuid references profiles(id)` layout)
--    instead of the `user_phone` / `plan_id` / `total_return` columns
--    this app actually writes. Because the old script used
--    `create table if not exists`, it silently skipped fixing it every
--    time it was re-run — that mismatch is exactly why every
--    "Invest Now → Confirm" click fails with "Investment failed.
--    Please try again." This version DROPS and REBUILDS only that one
--    table with the correct structure (safe — it currently has 0 usable
--    rows, every insert into it has been failing since it was created).
-- 2) Added a new `bonus_claims` table so the Daily Bonus and Lucky Spin
--    are enforced by the DATABASE (one claim per user per day, per
--    type) instead of only by browser localStorage — which could be
--    bypassed by clearing site data / using another browser. The
--    `unique(user_phone, claim_type, claim_date)` constraint makes a
--    second claim on the same day physically impossible to insert.
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

-- ── FIX: rebuild investments with the correct columns (see note above) ──────
drop table if exists public.investments cascade;

create table public.investments (
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

-- ── NEW: server-enforced Daily Bonus / Lucky Spin claims ────────────────────
create table if not exists public.bonus_claims (
  id          uuid primary key default gen_random_uuid(),
  user_phone  text not null references public.users(phone),
  claim_type  text not null,           -- 'login_bonus' | 'spin'
  claim_date  date not null,
  amount      numeric not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_phone, claim_type, claim_date)
);

-- Support / live chat messages
create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  user_phone  text not null,
  message     text not null,
  sender_type text not null default 'user',          -- user | admin
  created_at  timestamptz not null default now()
);

-- Password reset requests
create table if not exists public.password_reset_requests (
  id          uuid primary key default gen_random_uuid(),
  user_phone  text not null,
  status      text not null default 'pending',      -- pending | completed
  created_at  timestamptz not null default now(),
  completed_at timestamptz
);

-- ── Indexes for performance ──────────────────────────────────────────────────
create index if not exists idx_deposits_user_phone         on public.deposits(user_phone);
create index if not exists idx_deposits_status              on public.deposits(status);
create index if not exists idx_withdrawals_user_phone       on public.withdrawals(user_phone);
create index if not exists idx_withdrawals_status           on public.withdrawals(status);
create index if not exists idx_loans_user_phone             on public.loans(user_phone);
create index if not exists idx_loans_status                 on public.loans(status);
create index if not exists idx_investments_user_phone       on public.investments(user_phone);
create index if not exists idx_support_messages_user_phone  on public.support_messages(user_phone);
create index if not exists idx_bonus_claims_lookup          on public.bonus_claims(user_phone, claim_type, claim_date);

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
alter table public.bonus_claims      enable row level security;
alter table public.support_messages  enable row level security;
alter table public.password_reset_requests enable row level security;

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
  public.bonus_claims,
  public.support_messages,
  public.password_reset_requests
to anon, authenticated;

drop policy if exists "anon_all" on public.users;
drop policy if exists "anon_all" on public.deposits;
drop policy if exists "anon_all" on public.withdrawals;
drop policy if exists "anon_all" on public.loans;
drop policy if exists "anon_all" on public.investments;
drop policy if exists "anon_all" on public.referrals;
drop policy if exists "anon_all" on public.keywords;
drop policy if exists "anon_all" on public.keyword_claims;
drop policy if exists "anon_all" on public.bonus_claims;
drop policy if exists "anon_all" on public.support_messages;
drop policy if exists "anon_all" on public.password_reset_requests;

create policy "anon_all" on public.users             for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.deposits          for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.withdrawals       for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.loans             for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.investments       for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.referrals         for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.keywords          for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.keyword_claims    for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.bonus_claims      for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.support_messages  for all to anon, authenticated using (true) with check (true);
create policy "anon_all" on public.password_reset_requests for all to anon, authenticated using (true) with check (true);

-- ── Transactions table (audit trail for all balance changes) ─────────────────
create table if not exists public.transactions (
  id             uuid primary key default gen_random_uuid(),
  phone_number   text not null,
  user_phone     text,
  type           text not null default 'deposit',      -- deposit | withdrawal | profit | investment
  amount         numeric not null,
  status         text not null default 'completed',    -- completed | pending | failed
  reference      text,                                 -- checkout_id, withdrawal_id, etc.
  description    text,                                 -- human-readable description
  created_at     timestamptz not null default now()
);

create index if not exists idx_transactions_phone_number on public.transactions(phone_number);
create index if not exists idx_transactions_user_phone on public.transactions(user_phone);
create index if not exists idx_transactions_status on public.transactions(status);
create index if not exists idx_transactions_created_at on public.transactions(created_at);

alter table public.transactions enable row level security;

grant all on table public.transactions to anon, authenticated;

drop policy if exists "anon_all" on public.transactions;
create policy "anon_all" on public.transactions for all to anon, authenticated using (true) with check (true);

-- ── Incremental migration helpers (safe to re-run) ───────────────────────────
alter table public.deposits add column if not exists mpesa_receipt text;
alter table public.deposits add column if not exists method text default 'manual';
alter table public.users    add column if not exists bonus_balance numeric not null default 0;
alter table public.users    add column if not exists is_admin boolean not null default false;
alter table public.users    add column if not exists must_change_password boolean not null default false;
