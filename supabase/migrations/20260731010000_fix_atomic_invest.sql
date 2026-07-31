-- Fix atomic_invest: anti-cheat was blocking all Finance workload investments
-- The check compared daily_return against base 3% rate, but Finance (1.25x) 
-- legitimately produces 3.75% daily. Fix: accept workload multiplier up to 1.25x.
CREATE OR REPLACE FUNCTION public.atomic_invest(
  p_user_phone text,
  p_plan_id text,
  p_plan_name text,
  p_amount numeric,
  p_daily_return numeric,
  p_total_return numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_user public.users%rowtype;
  v_investment_id uuid;
  v_l1_phone text;
  v_l2_phone text;
  v_l1_commission numeric;
  v_l2_commission numeric;
  v_investment_count integer;
  v_max_daily numeric;
  v_max_total numeric;
  v_workload text;
begin
  -- Validate amount
  if p_amount is null or p_amount <= 0 then
    raise exception 'Investment amount must be greater than zero';
  end if;

  -- Validate user exists
  select * into v_user from public.users where phone = p_user_phone for update;
  if not found then
    raise exception 'User not found';
  end if;

  if v_user.balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  -- Anti-cheat: Validate daily return is within legitimate bounds
  -- Base rate is 3% daily (amount * 0.03)
  -- Maximum legitimate multiplier is 1.25 (Finance AI workload)
  -- So max daily = amount * 0.03 * 1.25, max total = amount * 0.03 * 1.25 * 60
  v_max_daily := floor(p_amount * 0.03 * 1.25);
  v_max_total := floor(p_amount * 0.03 * 1.25 * 60);

  if p_daily_return > v_max_daily then
    raise exception 'Invalid daily return value detected';
  end if;

  if p_total_return > v_max_total then
    raise exception 'Invalid total return value detected';
  end if;

  -- Deduct balance
  update public.users set balance = balance - p_amount where phone = p_user_phone;

  -- Insert investment record
  insert into public.investments (
    user_phone, plan_id, plan_name, amount, profit,
    daily_return, total_return, status, started_at, ends_at, created_at,
    workload
  ) values (
    p_user_phone, p_plan_id, p_plan_name, p_amount, 0,
    p_daily_return, p_total_return, 'active', now(), now() + interval '60 days', now(),
    p_plan_id
  )
  returning id into v_investment_id;

  -- Record transaction
  insert into public.transactions (phone_number, amount, status)
  values (p_user_phone, p_amount::integer, 'completed');

  -- Referral commissions (only on first investment)
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
$function$;

-- Fix process_daily_profits to use workload multiplier correctly
CREATE OR REPLACE FUNCTION public.process_daily_profits()
RETURNS void
LANGUAGE plpgsql
AS $function$
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
    -- Credit daily profit to user
    update public.users
    set balance = balance + r.daily_return
    where phone = r.user_phone;

    -- Update investment: add profit, set last_profit_at
    update public.investments
    set profit = profit + r.daily_return,
        last_profit_at = v_now,
        last_executed_at = v_now
    where id = r.id;

    -- Record transaction
    insert into public.transactions (phone_number, amount, status, type)
    values (r.user_phone, r.daily_return::integer, 'completed', 'daily_profit');
  end loop;
end;
$function$;
