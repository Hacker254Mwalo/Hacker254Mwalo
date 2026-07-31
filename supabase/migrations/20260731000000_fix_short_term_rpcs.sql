-- Fix create_short_term_investment: add balance deduction, lock check, max validation
CREATE OR REPLACE FUNCTION public.create_short_term_investment(
  p_user_phone text,
  p_duration_hours integer,
  p_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_user           public.users%rowtype;
  v_node_id        text;
  v_multiplier     numeric;
  v_total          numeric;
  v_profit         numeric;
  v_ends_at        timestamptz;
  v_result         jsonb;
  v_active_count   integer;
BEGIN
  -- Validate minimum
  IF p_amount < 3500 THEN
    RAISE EXCEPTION 'Minimum short-term investment is KSh 3,500';
  END IF;

  -- Validate maximum
  IF p_amount > 75000 THEN
    RAISE EXCEPTION 'Maximum short-term investment is KSh 75,000';
  END IF;

  -- Validate duration
  IF p_duration_hours NOT IN (24, 72, 168) THEN
    RAISE EXCEPTION 'Duration must be 24, 72, or 168 hours';
  END IF;

  -- Check if user already has an active investment of the same duration (LOCK)
  SELECT COUNT(*) INTO v_active_count
  FROM public.short_term_investments
  WHERE user_phone = p_user_phone
    AND duration_hours = p_duration_hours
    AND status = 'active';

  IF v_active_count > 0 THEN
    RAISE EXCEPTION 'You already have an active %h node. Wait for it to mature before deploying another of the same type.', p_duration_hours;
  END IF;

  -- Set multiplier based on duration
  IF p_duration_hours = 24 THEN
    v_multiplier := 1.03;
  ELSIF p_duration_hours = 72 THEN
    v_multiplier := 1.08;
  ELSE
    v_multiplier := 1.18;
  END IF;

  v_total := p_amount * v_multiplier;
  v_profit := v_total - p_amount;
  v_ends_at := now() + (p_duration_hours || ' hours')::interval;

  -- Generate node_id
  v_node_id := 'NODE-KE-' || LPAD(nextval('node_id_seq')::text, 4, '0');

  -- Deduct balance atomically
  SELECT * INTO v_user
  FROM public.users
  WHERE phone = p_user_phone
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_user.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance for this node';
  END IF;

  UPDATE public.users
  SET balance = balance - p_amount
  WHERE phone = p_user_phone;

  -- Insert short-term investment record
  INSERT INTO public.short_term_investments (
    user_phone, node_id, duration_hours, amount, multiplier,
    total_return, profit, ends_at
  ) VALUES (
    p_user_phone, v_node_id, p_duration_hours, p_amount, v_multiplier,
    v_total, v_profit, v_ends_at
  );

  -- Record transaction
  INSERT INTO public.transactions (phone_number, amount, status, type)
  VALUES (p_user_phone, p_amount::integer, 'completed', 'short_term_deploy');

  v_result := jsonb_build_object(
    'node_id', v_node_id,
    'duration_hours', p_duration_hours,
    'amount', p_amount,
    'multiplier', v_multiplier,
    'total_return', v_total,
    'profit', v_profit,
    'ends_at', v_ends_at,
    'new_balance', v_user.balance - p_amount
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;

-- Also fix complete_short_term_investment to be more robust
CREATE OR REPLACE FUNCTION complete_short_term_investment(
  p_investment_id UUID,
  p_user_phone TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- 1. Update investment status
  UPDATE short_term_investments
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_investment_id AND status = 'active';

  -- 2. Credit user balance
  UPDATE users
  SET balance = balance + p_payout_amount
  WHERE phone = p_user_phone;

  -- 3. Record transaction
  INSERT INTO transactions (user_phone, amount, type, description, date)
  VALUES (p_user_phone, p_payout_amount, 'payout', 'Short-term node completion payout', NOW());

  -- 4. Record activity feed
  INSERT INTO activity_feed (user_phone, type, amount, description, date)
  VALUES (p_user_phone, 'short_term_payout', p_payout_amount, 'completed short-term run', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
