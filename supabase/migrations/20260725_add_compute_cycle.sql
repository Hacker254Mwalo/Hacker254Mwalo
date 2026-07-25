-- Add last_executed_at column to investments
ALTER TABLE investments ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '24 hours');

-- RPC: execute 24h compute cycle
CREATE OR REPLACE FUNCTION execute_compute_cycle(p_investment_id UUID, p_user_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv RECORD;
  v_yield NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Fetch investment and verify ownership
  SELECT * INTO v_inv FROM investments
  WHERE id = p_investment_id AND user_phone = p_user_phone AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Investment not found or not active');
  END IF;

  -- Check 24h cooldown
  IF v_inv.last_executed_at IS NOT NULL AND NOW() - v_inv.last_executed_at < INTERVAL '24 hours' THEN
    RETURN jsonb_build_object('success', false, 'error', '24h cooldown not elapsed', 'retry_at', v_inv.last_executed_at + INTERVAL '24 hours');
  END IF;

  -- Calculate yield (3% of amount)
  v_yield := FLOOR(v_inv.amount * 0.03);

  -- Credit user balance
  UPDATE users SET balance = balance + v_yield WHERE phone = p_user_phone;

  -- Update investment profit and timestamp
  UPDATE investments
  SET profit = profit + v_yield,
      last_profit_at = NOW(),
      last_executed_at = NOW()
  WHERE id = p_investment_id;

  -- Record transaction
  INSERT INTO transactions (phone_number, user_phone, type, amount, description)
  VALUES (p_user_phone, p_user_phone, 'compute_yield', v_yield, '24h Compute Yield for ' || v_inv.plan_name);

  -- Return updated balance
  SELECT balance INTO v_new_balance FROM users WHERE phone = p_user_phone;

  RETURN jsonb_build_object(
    'success', true,
    'yield', v_yield,
    'new_balance', v_new_balance,
    'new_profit', v_inv.profit + v_yield
  );
END;
$$;
