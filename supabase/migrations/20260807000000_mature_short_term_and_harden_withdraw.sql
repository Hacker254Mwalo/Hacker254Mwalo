-- 2026-08-07 — Auto-mature expired short-term nodes + harden withdrawals
-- Fixes:
--  1. Expired active short_term_investments now auto-complete (idempotent, per-row,
--     returns a JSON list of processed ids) instead of sitting forever at "Maturing...".
--  2. atomic_withdraw no longer blows up when called with NULL/invalid fee/net_amount/
--     mpesa_phone (e.g. Number(undefined) = NaN from the frontend). Defaults are applied.

-- ── 1. Idempotent batch payer: complete_short_term_auto_mature ─────────────────
-- Call from anywhere (cron, client, admin). Skips rows that are not
-- (active AND expired). Returns { processed: [...], skipped: [...] }.
CREATE OR REPLACE FUNCTION public.complete_short_term_auto_mature()
RETURNS json AS $$
DECLARE
  v_rec RECORD;
  v_processed jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
BEGIN
  FOR v_rec IN
    SELECT id, user_phone, total_return
    FROM public.short_term_investments
    WHERE status = 'active' AND ends_at <= NOW()
    ORDER BY ends_at
  LOOP
    BEGIN
      UPDATE public.short_term_investments
      SET status = 'completed',
          completed_at = NOW()
      WHERE id = v_rec.id AND status = 'active';

      IF NOT FOUND THEN
        v_skipped := v_skipped || to_jsonb(v_rec.id);
        CONTINUE;
      END IF;

      UPDATE public.users
      SET balance = balance + v_rec.total_return
      WHERE phone = v_rec.user_phone;

      INSERT INTO public.transactions (phone_number, user_phone, amount, type, status, description)
      VALUES (v_rec.user_phone, v_rec.user_phone, LEAST(v_rec.total_return, 2147483647)::integer, 'short_term_payout', 'completed', 'Auto-mature short-term node payout');

      INSERT INTO public.activity_feed (user_phone, action_type, amount, description)
      VALUES (v_rec.user_phone, 'short_term_payout', LEAST(v_rec.total_return, 2147483647)::integer, 'Completed short-term node payout');

      v_processed := v_processed || to_jsonb(v_rec.id);
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped || to_jsonb(v_rec.id);
    END;
  END LOOP;

  RETURN json_build_object('processed', v_processed, 'skipped', v_skipped);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Convenience: single-row version that is idempotent (no exception when already
-- completed — it just returns silently) so the client can retry safely.
CREATE OR REPLACE FUNCTION public.complete_short_term_investment(
  p_investment_id UUID,
  p_user_phone TEXT,
  p_payout_amount NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.short_term_investments
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_investment_id
    AND status = 'active'
    AND ends_at <= NOW();

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN; -- already completed / not yet expired / not mine: idempotent no-op
  END IF;

  UPDATE public.users
  SET balance = balance + p_payout_amount
  WHERE phone = p_user_phone;

  INSERT INTO public.transactions (phone_number, user_phone, amount, type, status, description)
  VALUES (p_user_phone, p_user_phone, LEAST(p_payout_amount, 2147483647)::integer, 'short_term_payout', 'completed', 'Short-term node completion payout');

  INSERT INTO public.activity_feed (user_phone, action_type, amount, description)
  VALUES (p_user_phone, 'short_term_payout', LEAST(p_payout_amount, 2147483647)::integer, 'Completed short-term node payout');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Harden atomic_withdraw against invalid arguments ───────────────────────
-- If fee / net_amount are NULL/invalid, derive them from amount (8% fee).
-- If mpesa_phone is NULL, default to the user's registered phone.
CREATE OR REPLACE FUNCTION public.atomic_withdraw(
  p_user_phone TEXT,
  p_amount NUMERIC,
  p_fee NUMERIC,
  p_net_amount NUMERIC,
  p_mpesa_phone TEXT
)
RETURNS json AS $$
DECLARE
  v_balance NUMERIC;
  v_fee NUMERIC;
  v_net NUMERIC;
  v_mpesa TEXT;
  v_withdrawal_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'Invalid withdrawal amount');
  END IF;

  -- Derive fee if missing or not a positive number
  IF p_fee IS NULL OR p_fee < 0 THEN
    v_fee := FLOOR(p_amount * 0.08);
  ELSE
    v_fee := p_fee;
  END IF;

  v_net := GREATEST(0, p_amount - v_fee);
  IF p_net_amount IS NULL OR p_net_amount < 0 THEN
    v_net := GREATEST(0, p_amount - v_fee);
  ELSE
    v_net := LEAST(p_net_amount, GREATEST(0, p_amount - v_fee));
  END IF;

  v_mpesa := COALESCE(NULLIF(TRIM(p_mpesa_phone), ''), p_user_phone);

  SELECT balance INTO v_balance FROM public.users WHERE phone = p_user_phone;
  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  IF p_amount < 500 THEN
    RETURN json_build_object('success', false, 'message', 'Minimum withdrawal is KSh 500');
  END IF;
  IF v_balance < p_amount THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  UPDATE public.users
  SET balance = balance - p_amount
  WHERE phone = p_user_phone;

  INSERT INTO public.withdrawals (user_phone, amount, fee, net_amount, mpesa_phone, status)
  VALUES (p_user_phone, p_amount, v_fee, v_net, v_mpesa, 'pending')
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO public.transactions (phone_number, amount, status)
  VALUES (p_user_phone, p_amount, 'pending');

  RETURN json_build_object('success', true, 'withdrawal_id', v_withdrawal_id, 'new_balance', v_balance - p_amount, 'fee', v_fee, 'net_amount', v_net);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
