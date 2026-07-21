-- ============================================================
-- Cascade delete: removes all related data when a user is deleted
-- Attached as BEFORE DELETE trigger on public.users
-- ============================================================

DROP TRIGGER IF EXISTS on_user_deleted ON public.users;
DROP FUNCTION IF EXISTS public.handle_admin_user_deletion() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_admin_user_deletion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Clear referral references where this user was the referrer
  UPDATE public.users SET referred_by = NULL WHERE referred_by = OLD.phone;
  
  -- Delete related data across all tables
  DELETE FROM public.referrals WHERE referrer_phone = OLD.phone OR referred_phone = OLD.phone;
  DELETE FROM public.deposits WHERE user_phone = OLD.phone;
  DELETE FROM public.withdrawals WHERE user_phone = OLD.phone;
  DELETE FROM public.loans WHERE user_phone = OLD.phone;
  DELETE FROM public.investments WHERE user_phone = OLD.phone;
  DELETE FROM public.bonus_claims WHERE user_phone = OLD.phone;
  DELETE FROM public.keyword_claims WHERE user_phone = OLD.phone;
  DELETE FROM public.support_messages WHERE user_phone = OLD.phone;
  DELETE FROM public.password_reset_requests WHERE user_phone = OLD.phone;
  DELETE FROM public.transactions WHERE phone_number = OLD.phone;
  
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_user_deleted
  BEFORE DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_user_deletion();
