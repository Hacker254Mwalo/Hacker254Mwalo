-- Dumiropay production workflow repair
-- Aligns the custom phone-and-PIN app with the live schema and places
-- password, investment, bonus, spin, and loan invariants inside Postgres.

create extension if not exists pgcrypto;

-- The application uses custom phone + PIN credentials, not Supabase Auth.
-- New application users must receive a database UUID without requiring an
-- auth.users row. Existing IDs are preserved.
alter table public.users drop constraint if exists users_id_fkey;
alter table public.users alter column id set default gen_random_uuid();
alter table public.users add column if not exists must_change_password boolean not null default false;
alter table public.password_reset_requests add column if not exists temp_pin text;

-- One manual claim of each type per customer per Nairobi calendar date.
create unique index if not exists bonus_claims_one_per_user_type_day
  on public.bonus_claims (user_phone, claim_type, claim_date);

-- Remove stale RPC overloads that reference legacy columns and can make
-- PostgREST resolve the wrong function.
drop function if exists public.atomic_invest(text, numeric, text, numeric, numeric, text);
drop function if exists public.atomic_invest(text, numeric, text, text, numeric, numeric, text);

create or replace function public.atomic_invest(
  p_user_phone text,
  p_plan_id text,
  p_plan_name text,
  p_amount numeric,
  p_daily_return numeric,
  p_total_return numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
  v_investment_id uuid;
  v_l1_phone text;
  v_l2_phone text;
  v_l1_commission numeric;
  v_l2_commission numeric;
  v_investment_count integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Investment amount must be greater than zero';
  end if;

  select * into v_user
  from public.users
  where phone = p_user_phone
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if v_user.balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.users
  set balance = balance - p_amount
  where phone = p_user_phone;

  insert into public.investments (
    user_id, user_phone, plan_id, plan_name, amount, profit,
    daily_return, total_return, status, started_at, ends_at, created_at
  ) values (
    v_user.id, p_user_phone, p_plan_id, p_plan_name, p_amount, 0,
    p_daily_return, p_total_return, 'active', now(), now() + interval '90 days', now()
  )
  returning id into v_investment_id;

  insert into public.transactions (user_id, type, amount, status, reference)
  values (v_user.id, 'investment', p_amount, 'completed', v_investment_id::text);

  select count(*) into v_investment_count
  from public.investments
  where user_phone = p_user_phone;

  -- Referral commissions apply only to a customer's first investment.
  if v_investment_count = 1 and v_user.referred_by is not null then
    v_l1_phone := v_user.referred_by;
    v_l1_commission := floor(p_amount * 0.10);

    update public.users
    set balance = balance + v_l1_commission
    where phone = v_l1_phone;

    insert into public.referrals (
      referrer_phone, referred_phone, referred_name, level, commission, plan_name
    ) values (
      v_l1_phone, p_user_phone, v_user.name, 1, v_l1_commission, p_plan_name
    );

    select referred_by into v_l2_phone
    from public.users
    where phone = v_l1_phone;

    if v_l2_phone is not null then
      v_l2_commission := floor(p_amount * 0.04);

      update public.users
      set balance = balance + v_l2_commission
      where phone = v_l2_phone;

      insert into public.referrals (
        referrer_phone, referred_phone, referred_name, level, commission, plan_name
      ) values (
        v_l2_phone, p_user_phone, v_user.name, 2, v_l2_commission, p_plan_name
      );
    end if;
  end if;

  return json_build_object(
    'success', true,
    'investment_id', v_investment_id,
    'new_balance', v_user.balance - p_amount
  );
end;
$$;

create or replace function public.atomic_withdraw(
  p_user_phone text,
  p_amount numeric,
  p_fee numeric,
  p_net_amount numeric,
  p_mpesa_phone text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance numeric;
  v_withdrawal_id uuid;
  v_new_balance numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero';
  end if;

  select id, balance into v_user_id, v_balance
  from public.users
  where phone = p_user_phone
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if v_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  update public.users
  set balance = balance - p_amount
  where phone = p_user_phone
  returning balance into v_new_balance;

  insert into public.withdrawals (
    user_phone, amount, fee, net_amount, mpesa_phone, status
  ) values (
    p_user_phone, p_amount, coalesce(p_fee, 0), p_net_amount, p_mpesa_phone, 'pending'
  )
  returning id into v_withdrawal_id;

  insert into public.transactions (user_id, type, amount, status, reference)
  values (v_user_id, 'withdrawal', p_amount, 'pending', v_withdrawal_id::text);

  return json_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'new_balance', v_new_balance
  );
end;
$$;

create or replace function public.atomic_approve_deposit(
  p_deposit_id uuid,
  p_user_phone text,
  p_amount numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_new_balance numeric;
begin
  update public.deposits
  set status = 'approved'
  where id = p_deposit_id and user_phone = p_user_phone and status = 'pending';

  if not found then
    raise exception 'Deposit not found or already processed';
  end if;

  update public.users
  set balance = balance + p_amount
  where phone = p_user_phone
  returning id, balance into v_user_id, v_new_balance;

  if not found then
    raise exception 'User not found';
  end if;

  insert into public.transactions (user_id, type, amount, status, reference)
  values (v_user_id, 'deposit', p_amount, 'completed', p_deposit_id::text);

  return json_build_object('success', true, 'new_balance', v_new_balance);
end;
$$;

create or replace function public.atomic_reject_withdrawal(
  p_withdrawal_id uuid,
  p_user_phone text,
  p_amount numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance numeric;
begin
  update public.withdrawals
  set status = 'rejected'
  where id = p_withdrawal_id and user_phone = p_user_phone and status = 'pending';

  if not found then
    raise exception 'Withdrawal not found or already processed';
  end if;

  update public.users
  set balance = balance + p_amount
  where phone = p_user_phone
  returning balance into v_new_balance;

  return json_build_object('success', true, 'new_balance', v_new_balance);
end;
$$;

create or replace function public.request_password_reset(p_user_phone text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  -- Return the same generic result for unknown phone numbers to avoid account enumeration.
  if not exists (select 1 from public.users where phone = p_user_phone) then
    return json_build_object('success', true, 'queued', false);
  end if;

  select id into v_request_id
  from public.password_reset_requests
  where user_phone = p_user_phone and status = 'pending'
  order by created_at desc
  limit 1;

  if v_request_id is null then
    insert into public.password_reset_requests (user_phone, status)
    values (p_user_phone, 'pending')
    returning id into v_request_id;
  end if;

  return json_build_object('success', true, 'queued', true, 'request_id', v_request_id);
end;
$$;

create or replace function public.admin_reset_password(
  p_request_id uuid,
  p_user_phone text,
  p_pin_hash text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pin_hash is null or length(trim(p_pin_hash)) = 0 then
    raise exception 'Temporary PIN is required';
  end if;

  update public.password_reset_requests
  set status = 'completed', completed_at = now(), temp_pin = null
  where id = p_request_id and user_phone = p_user_phone and status = 'pending';

  if not found then
    raise exception 'Reset request not found or already completed';
  end if;

  update public.users
  set pin_hash = p_pin_hash, must_change_password = true
  where phone = p_user_phone;

  if not found then
    raise exception 'User not found';
  end if;

  return json_build_object('success', true, 'must_change_password', true);
end;
$$;

create or replace function public.change_user_pin(
  p_user_phone text,
  p_current_pin_hash text,
  p_new_pin_hash text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_new_pin_hash is null or length(trim(p_new_pin_hash)) = 0 then
    raise exception 'New PIN is required';
  end if;

  update public.users
  set pin_hash = p_new_pin_hash, must_change_password = false
  where phone = p_user_phone and pin_hash = p_current_pin_hash;

  if not found then
    raise exception 'Current PIN is incorrect';
  end if;

  return json_build_object('success', true, 'must_change_password', false);
end;
$$;

create or replace function public.claim_daily_login_bonus(
  p_user_phone text,
  p_amount numeric default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim_id uuid;
  v_new_balance numeric;
  v_claim_date date := timezone('Africa/Nairobi', now())::date;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Bonus amount must be greater than zero';
  end if;

  if not exists (select 1 from public.users where phone = p_user_phone) then
    raise exception 'User not found';
  end if;

  insert into public.bonus_claims (user_phone, claim_type, claim_date, amount)
  values (p_user_phone, 'login_bonus', v_claim_date, p_amount)
  on conflict (user_phone, claim_type, claim_date) do nothing
  returning id into v_claim_id;

  if v_claim_id is null then
    return json_build_object('success', false, 'message', 'Already claimed today.');
  end if;

  update public.users
  set balance = balance + p_amount
  where phone = p_user_phone
  returning balance into v_new_balance;

  return json_build_object('success', true, 'amount', p_amount, 'balance', v_new_balance);
end;
$$;

create or replace function public.claim_lucky_spin(p_user_phone text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_investment_id uuid;
  v_plan_name text;
  v_daily_profit numeric;
  v_reward numeric;
  v_claim_id uuid;
  v_new_balance numeric;
  v_claim_date date := timezone('Africa/Nairobi', now())::date;
  v_weekday integer := extract(dow from timezone('Africa/Nairobi', now()))::integer;
begin
  -- Monday (1) and Friday (5) only, calculated in the application's timezone.
  if v_weekday not in (1, 5) then
    return json_build_object('success', false, 'code', 'SPIN_NOT_AVAILABLE', 'message', 'Lucky Spin is available on Mondays and Fridays only.');
  end if;

  -- Select one active investment at random, then award exactly 3% of that
  -- investment's daily profit. A customer with no active investment cannot spin.
  select id, plan_name, daily_return
  into v_investment_id, v_plan_name, v_daily_profit
  from public.investments
  where user_phone = p_user_phone and status = 'active' and coalesce(daily_return, 0) > 0
  order by random()
  limit 1;

  if v_investment_id is null then
    return json_build_object(
      'success', false,
      'code', 'NO_ACTIVE_INVESTMENT',
      'message', 'An active investment is required. Please deposit and invest first.'
    );
  end if;

  v_reward := round(v_daily_profit * 0.03, 2);

  insert into public.bonus_claims (user_phone, claim_type, claim_date, amount)
  values (p_user_phone, 'spin', v_claim_date, v_reward)
  on conflict (user_phone, claim_type, claim_date) do nothing
  returning id into v_claim_id;

  if v_claim_id is null then
    return json_build_object('success', false, 'code', 'ALREADY_SPUN', 'message', 'Already spun today.');
  end if;

  update public.users
  set balance = balance + v_reward
  where phone = p_user_phone
  returning balance into v_new_balance;

  return json_build_object(
    'success', true,
    'amount', v_reward,
    'balance', v_new_balance,
    'investment_id', v_investment_id,
    'plan_name', v_plan_name,
    'daily_profit', v_daily_profit
  );
end;
$$;

create or replace function public.create_loan_request(
  p_user_phone text,
  p_amount numeric,
  p_purpose text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loan_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Loan amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.investments
    where user_phone = p_user_phone and status = 'active'
  ) then
    raise exception 'An active investment is required before requesting a loan.';
  end if;

  insert into public.loans (user_phone, amount, purpose, status)
  values (p_user_phone, p_amount, nullif(trim(p_purpose), ''), 'pending')
  returning id into v_loan_id;

  return json_build_object('success', true, 'loan_id', v_loan_id);
end;
$$;

grant execute on function public.atomic_invest(text, text, text, numeric, numeric, numeric) to anon, authenticated;
grant execute on function public.atomic_withdraw(text, numeric, numeric, numeric, text) to anon, authenticated;
grant execute on function public.atomic_approve_deposit(uuid, text, numeric) to anon, authenticated;
grant execute on function public.atomic_reject_withdrawal(uuid, text, numeric) to anon, authenticated;
grant execute on function public.request_password_reset(text) to anon, authenticated;
grant execute on function public.admin_reset_password(uuid, text, text) to anon, authenticated;
grant execute on function public.change_user_pin(text, text, text) to anon, authenticated;
grant execute on function public.claim_daily_login_bonus(text, numeric) to anon, authenticated;
grant execute on function public.claim_lucky_spin(text) to anon, authenticated;
grant execute on function public.create_loan_request(text, numeric, text) to anon, authenticated;

-- Make PostgREST immediately see new columns and RPC signatures.
notify pgrst, 'reload schema';
