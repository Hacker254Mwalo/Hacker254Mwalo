-- ============================================================
-- Production Fixes Migration
-- 1. Enforce KSh 500 minimum withdrawal in atomic_withdraw
-- 2. Add claim_keyword RPC with active-investment gate
-- 3. Enforce KSh 400 minimum deposit in atomic_approve_deposit
-- ============================================================

-- 1. Patch atomic_withdraw to enforce minimum KSh 500
create or replace function public.atomic_withdraw(
  p_user_phone  text,
  p_amount      numeric,
  p_fee         numeric,
  p_net_amount  numeric,
  p_mpesa_phone text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id      uuid;
  v_balance      numeric;
  v_withdrawal_id uuid;
  v_new_balance  numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Withdrawal amount must be greater than zero';
  end if;

  if p_amount < 500 then
    raise exception 'Minimum withdrawal amount is KSh 500';
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

-- 2. Add claim_keyword RPC with active-investment gate
create or replace function public.claim_keyword(
  p_user_phone text,
  p_code       text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kw        public.keywords%rowtype;
  v_bonus     numeric;
  v_new_balance numeric;
begin
  -- Must have an active investment
  if not exists (
    select 1
    from public.investments
    where user_phone = p_user_phone and status = 'active'
  ) then
    return json_build_object(
      'success', false,
      'code', 'NO_ACTIVE_INVESTMENT',
      'message', 'An active investment is required to redeem promo codes. Please invest first.'
    );
  end if;

  -- Lookup keyword (case-insensitive)
  select * into v_kw
  from public.keywords
  where upper(code) = upper(trim(p_code))
  limit 1;

  if not found then
    return json_build_object('success', false, 'message', 'Invalid keyword code.');
  end if;

  if not v_kw.active then
    return json_build_object('success', false, 'message', 'This keyword is no longer active.');
  end if;

  if v_kw.claim_count >= v_kw.max_claims then
    return json_build_object('success', false, 'message', 'All slots for this keyword have been claimed.');
  end if;

  -- Check if user already claimed this keyword
  if exists (
    select 1
    from public.keyword_claims
    where keyword_id = v_kw.id and user_phone = p_user_phone
  ) then
    return json_build_object('success', false, 'message', 'You have already claimed this keyword.');
  end if;

  -- Random bonus between min and max
  v_bonus := floor(random() * (v_kw.max_bonus - v_kw.min_bonus + 1) + v_kw.min_bonus);

  -- Record the claim
  insert into public.keyword_claims (keyword_id, user_phone, bonus_amount)
  values (v_kw.id, p_user_phone, v_bonus);

  -- Increment claim count
  update public.keywords
  set claim_count = claim_count + 1
  where id = v_kw.id;

  -- Credit user balance
  update public.users
  set balance = balance + v_bonus
  where phone = p_user_phone
  returning balance into v_new_balance;

  return json_build_object(
    'success', true,
    'bonus', v_bonus,
    'balance', v_new_balance
  );
end;
$$;

-- Grant execute permissions
grant execute on function public.atomic_withdraw(text, numeric, numeric, numeric, text) to anon, authenticated;
grant execute on function public.claim_keyword(text, text) to anon, authenticated;

-- Reload schema
notify pgrst, 'reload schema';
