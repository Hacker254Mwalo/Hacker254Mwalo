CREATE OR REPLACE FUNCTION complete_short_term_investment(
  p_investment_id UUID,
  p_user_phone TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- 1. Update investment status
  UPDATE short_term_investments
  SET status = 'completed'
  WHERE id = p_investment_id AND status = 'active';

  -- 2. Credit user balance
  UPDATE users
  SET balance = balance + p_payout_amount
  WHERE phone = p_user_phone OR id = p_user_phone;

  -- 3. Record transaction
  INSERT INTO transactions (user_phone, amount, type, description, date)
  VALUES (p_user_phone, p_payout_amount, 'payout', 'Short-term node completion payout', NOW());

  -- 4. Record activity feed
  INSERT INTO activity_feed (user_phone, type, amount, description, date)
  VALUES (p_user_phone, 'short_term_payout', p_payout_amount, 'completed short-term run', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
