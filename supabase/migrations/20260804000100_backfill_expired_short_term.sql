-- Backfill: process all short-term investments that have already expired
-- These were stuck due to the broken complete_short_term_investment function.
-- We manually complete them now using the corrected logic.

DO $$
DECLARE
  v_inv RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_inv IN
    SELECT id, user_phone, total_return
    FROM public.short_term_investments
    WHERE status = 'active'
      AND ends_at <= NOW()
  LOOP
    -- Update investment status
    UPDATE public.short_term_investments
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_inv.id AND status = 'active';

    -- Credit user balance
    UPDATE public.users
    SET balance = balance + v_inv.total_return
    WHERE phone = v_inv.user_phone;

    -- Record transaction
    INSERT INTO public.transactions (phone_number, user_phone, amount, type, status, description)
    VALUES (v_inv.user_phone, v_inv.user_phone, v_inv.total_return::integer, 'short_term_payout', 'completed', 'Backfill: Short-term node completion payout');

    -- Record activity feed
    INSERT INTO public.activity_feed (user_phone, action_type, amount, description)
    VALUES (v_inv.user_phone, 'short_term_payout', v_inv.total_return::integer, 'Backfill: Completed short-term node payout');

    v_count := v_count + 1;
    RAISE NOTICE 'Completed investment % for user % - paid %', v_inv.id, v_inv.user_phone, v_inv.total_return;
  END LOOP;

  RAISE NOTICE 'Backfill complete: processed % expired investments', v_count;
END $$;
