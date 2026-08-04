-- Fix complete_short_term_investment RPC function
-- Root cause: INSERT statements referenced non-existent columns:
--   - transactions table has no 'date' column (use created_at)
--   - activity_feed table uses 'action_type' not 'type', and has no 'date' column
-- This caused the function to throw an error, leaving investments stuck as 'active'

CREATE OR REPLACE FUNCTION public.complete_short_term_investment(
  p_investment_id UUID,
  p_user_phone TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
BEGIN
  -- 1. Update investment status to completed
  UPDATE public.short_term_investments
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_investment_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Investment not found or already completed';
  END IF;

  -- 2. Credit user balance atomically
  UPDATE public.users
  SET balance = balance + p_payout_amount
  WHERE phone = p_user_phone;

  -- 3. Record transaction (using correct column names: phone_number, created_at)
  INSERT INTO public.transactions (phone_number, user_phone, amount, type, status, description)
  VALUES (p_user_phone, p_user_phone, p_payout_amount::integer, 'short_term_payout', 'completed', 'Short-term node completion payout');

  -- 4. Record activity feed (using correct column names: action_type, created_at)
  INSERT INTO public.activity_feed (user_phone, action_type, amount, description)
  VALUES (p_user_phone, 'short_term_payout', p_payout_amount::integer, 'Completed short-term node payout');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
