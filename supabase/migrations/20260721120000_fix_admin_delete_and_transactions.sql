-- ============================================================
-- Fix: admin_delete_user RPC + transactions backfill
-- 1. Rewrite admin_delete_user RPC to use correct column names
--    and only reference tables that exist
-- 2. Backfill transactions.user_phone from phone_number where null
-- 3. Backfill transactions.type for legacy rows
-- ============================================================

-- 1. Fix admin_delete_user RPC — references non-existent tables
--    (support_threads, user_keywords) and wrong column (referee_phone)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_phone text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Clear referral references where this user was the referrer
  UPDATE public.users SET referred_by = NULL WHERE referred_by = p_user_phone;
  
  -- Delete related data across all tables
  DELETE FROM public.referrals WHERE referrer_phone = p_user_phone OR referred_phone = p_user_phone;
  DELETE FROM public.deposits WHERE user_phone = p_user_phone;
  DELETE FROM public.withdrawals WHERE user_phone = p_user_phone;
  DELETE FROM public.loans WHERE user_phone = p_user_phone;
  DELETE FROM public.investments WHERE user_phone = p_user_phone;
  DELETE FROM public.bonus_claims WHERE user_phone = p_user_phone;
  DELETE FROM public.keyword_claims WHERE user_phone = p_user_phone;
  DELETE FROM public.support_messages WHERE user_phone = p_user_phone;
  DELETE FROM public.password_reset_requests WHERE user_phone = p_user_phone;
  DELETE FROM public.transactions WHERE phone_number = p_user_phone OR user_phone = p_user_phone;
  
  -- Delete the user
  DELETE FROM public.users WHERE phone = p_user_phone;
END;
$$;

-- 2. Backfill transactions.user_phone from phone_number where null
UPDATE public.transactions
SET user_phone = phone_number
WHERE user_phone IS NULL AND phone_number IS NOT NULL;

-- 3. Backfill transactions.type for legacy rows (no type = was from deposit/profit RPCs)
UPDATE public.transactions
SET type = 'deposit', description = 'Deposit'
WHERE type IS NULL AND amount > 0 AND phone_number IS NOT NULL;
