-- ============================================================
-- Fix referral list visibility for users and admin
-- 1. Create get_all_referrals RPC (was missing — admin tab was broken)
-- 2. Create get_user_referrals RPC — returns ALL referred signups + commission rows
-- 3. Populate missing referral rows from existing users.referred_by
-- ============================================================

-- 1. RPC: Admin gets ALL referrals across the platform
CREATE OR REPLACE FUNCTION public.get_all_referrals()
RETURNS TABLE (
  id uuid,
  referrer_phone text,
  referrer_name text,
  referred_phone text,
  referred_name text,
  level integer,
  commission numeric,
  plan_name text,
  created_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.referrer_phone,
    COALESCE(rf.name, '')::text AS referrer_name,
    r.referred_phone,
    COALESCE(r.referred_name, '')::text AS referred_name,
    r.level,
    r.commission,
    COALESCE(r.plan_name, '')::text AS plan_name,
    r.created_at
  FROM public.referrals r
  LEFT JOIN public.users rf ON rf.phone = r.referrer_phone
  ORDER BY r.created_at DESC;
END;
$$;

-- 2. RPC: User sees ALL their referrals (signup roster + commissions)
--    Combines referrals table (commissions from investments) with users table (signup roster)
CREATE OR REPLACE FUNCTION public.get_user_referrals(p_phone text)
RETURNS TABLE (
  referred_phone text,
  referred_name text,
  level integer,
  commission numeric,
  plan_name text,
  created_at timestamptz,
  is_active boolean,
  is_invested boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Return all users referred by p_phone, with commission data if exists
  RETURN QUERY
  SELECT
    u.phone::text,
    u.name::text,
    COALESCE(r.level, 1)::integer,
    COALESCE(r.commission, 0)::numeric,
    COALESCE(r.plan_name, ''::text)::text,
    u.created_at,
    EXISTS(SELECT 1 FROM public.investments i WHERE i.user_phone = u.phone AND i.status = 'active')::boolean AS is_active,
    EXISTS(SELECT 1 FROM public.investments i WHERE i.user_phone = u.phone)::boolean AS is_invested
  FROM public.users u
  LEFT JOIN public.referrals r ON r.referrer_phone = p_phone AND r.referred_phone = u.phone
  WHERE u.referred_by = p_phone
  ORDER BY u.created_at DESC;
END;
$$;

-- 3. Backfill missing referral rows: for users who have referred_by set
--    but no corresponding row in referrals table
INSERT INTO public.referrals (referrer_phone, referred_phone, referred_name, level, commission, plan_name)
SELECT
  u.referred_by,
  u.phone,
  u.name,
  1,
  0,
  'Signup'
FROM public.users u
WHERE u.referred_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.referrer_phone = u.referred_by AND r.referred_phone = u.phone
  )
ON CONFLICT DO NOTHING;
