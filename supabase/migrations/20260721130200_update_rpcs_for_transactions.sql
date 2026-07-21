-- ============================================================
-- Update RPC functions to properly populate transaction fields
-- The previous versions only inserted phone_number and amount,
-- leaving type, user_phone, reference, and description as NULL.
-- This causes the admin transaction list to show incomplete data.
-- ============================================================

-- 1. Update atomic_invest to include full transaction metadata
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

  -- Insert transaction with full metadata
  insert into public.transactions (
    phone_number, user_phone, type, amount, status, reference, description
  ) values (
    p_user_phone, p_user_phone, 'investment', p_amount::integer, 'completed', 
    v_investment_id::text, 'Investment in ' || p_plan_name
  );

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

-- 2. Update process_daily_profits to include full transaction metadata
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

    -- Insert transaction with full metadata
    insert into public.transactions (
      phone_number, user_phone, type, amount, status, reference, description
    ) values (
      r.user_phone, r.user_phone, 'profit', r.daily_return::integer, 'completed',
      r.id::text, 'Daily profit from investment'
    );
  end loop;

  update public.investments
  set status = 'completed'
  where status = 'active' and ends_at <= v_now;
end;
$$;

-- 3. Update atomic_approve_deposit to include full transaction metadata
CREATE OR REPLACE FUNCTION public.atomic_approve_deposit(
  p_deposit_id uuid, p_user_phone text, p_amount numeric
) RETURNS json LANGUAGE plpgsql AS $$
declare
  v_new_balance numeric;
  v_mpesa_receipt text;
begin
  -- Get the deposit record to retrieve mpesa_receipt
  select mpesa_receipt into v_mpesa_receipt
  from public.deposits
  where id = p_deposit_id and user_phone = p_user_phone and status = 'pending';

  if not found then
    raise exception 'Deposit not found or already processed';
  end if;

  update public.deposits
  set status = 'approved'
  where id = p_deposit_id and user_phone = p_user_phone and status = 'pending';

  update public.users
  set balance = balance + p_amount
  where phone = p_user_phone
  returning balance into v_new_balance;

  if not found then
    raise exception 'User not found';
  end if;

  -- Insert transaction with full metadata
  insert into public.transactions (
    phone_number, user_phone, type, amount, status, reference, description
  ) values (
    p_user_phone, p_user_phone, 'deposit', p_amount::integer, 'completed',
    p_deposit_id::text, 'Deposit approved - M-Pesa: ' || coalesce(v_mpesa_receipt, 'pending')
  );

  return json_build_object('success', true, 'new_balance', v_new_balance);
end;
$$;

-- 4. Update atomic_withdraw to include full transaction metadata
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

  -- Insert transaction with full metadata
  insert into public.transactions (
    phone_number, user_phone, type, amount, status, reference, description
  ) values (
    p_user_phone, p_user_phone, 'withdrawal', p_amount::integer, 'pending',
    v_withdrawal_id::text, 'Withdrawal to ' || p_mpesa_phone || ' (fee: KSh ' || coalesce(p_fee, 0)::text || ')'
  );

  return json_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'new_balance', v_new_balance
  );
end;
$$;
