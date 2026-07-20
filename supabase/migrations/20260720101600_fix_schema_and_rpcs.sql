-- ============================================================
-- Final schema and RPC fixes for new Supabase project
-- Fixes all functions to match the new project's table schema
-- ============================================================

-- 1. Add missing columns to transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_phone text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS description text;

-- 2. Add updated_at to withdrawals and loans and users
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.loans ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 3. Fix atomic_invest — use phone instead of user.id, fix transactions insert
CREATE OR REPLACE FUNCTION public.atomic_invest(
  p_user_phone text, p_plan_id text, p_plan_name text,
  p_amount numeric, p_daily_return numeric, p_total_return numeric
) RETURNS json LANGUAGE plpgsql AS $$
declare
  v_user           public.users%rowtype;
  v_investment_id  uuid;
  v_l1_phone       text;
  v_l2_phone       text;
  v_l1_commission  numeric;
  v_l2_commission  numeric;
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
    user_phone, plan_id, plan_name, amount, profit,
    daily_return, total_return, status, started_at, ends_at, created_at
  ) values (
    p_user_phone, p_plan_id, p_plan_name, p_amount, 0,
    p_daily_return, p_total_return, 'active', now(), now() + interval '90 days', now()
  )
  returning id into v_investment_id;

  insert into public.transactions (phone_number, amount, status)
  values (p_user_phone, p_amount::integer, 'completed');

  select count(*) into v_investment_count
  from public.investments
  where user_phone = p_user_phone;

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

-- 4. Fix process_daily_profits — fix transactions insert
CREATE OR REPLACE FUNCTION public.process_daily_profits() RETURNS void LANGUAGE plpgsql AS $$
declare
  r record;
  v_now timestamp with time zone := now();
begin
  for r in
    select id, user_phone, daily_return
    from public.investments
    where status = 'active'
      and ends_at > v_now
      and daily_return > 0
      and (last_profit_at is null or last_profit_at < v_now - interval '23 hours')
  loop
    update public.users
    set balance = balance + r.daily_return
    where phone = r.user_phone;

    update public.investments
    set
      profit = profit + r.daily_return,
      last_profit_at = v_now
    where id = r.id;

    insert into public.transactions (phone_number, amount, status)
    values (r.user_phone, r.daily_return::integer, 'completed');
  end loop;

  update public.investments
  set status = 'completed'
  where status = 'active' and ends_at <= v_now;
end;
$$;

-- 5. Fix atomic_approve_deposit — fix transactions insert
CREATE OR REPLACE FUNCTION public.atomic_approve_deposit(
  p_deposit_id uuid, p_user_phone text, p_amount numeric
) RETURNS json LANGUAGE plpgsql AS $$
declare
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
  returning balance into v_new_balance;

  if not found then
    raise exception 'User not found';
  end if;

  insert into public.transactions (phone_number, amount, status)
  values (p_user_phone, p_amount::integer, 'completed');

  return json_build_object('success', true, 'new_balance', v_new_balance);
end;
$$;

-- 6. Fix atomic_withdraw — fix transactions insert
CREATE OR REPLACE FUNCTION public.atomic_withdraw(
  p_user_phone text, p_amount numeric, p_fee numeric, p_net_amount numeric, p_mpesa_phone text
) RETURNS json LANGUAGE plpgsql AS $$
declare
  v_balance      numeric;
  v_withdrawal_id uuid;
  v_new_balance  numeric;
begin
  if p_amount is null or p_amount < 500 then
    raise exception 'Minimum withdrawal amount is KSh 500';
  end if;

  select balance into v_balance
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

  insert into public.transactions (phone_number, amount, status)
  values (p_user_phone, p_amount::integer, 'pending');

  return json_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'new_balance', v_new_balance
  );
end;
$$;
