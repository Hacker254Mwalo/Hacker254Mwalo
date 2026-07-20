-- Fix: PIN reset was broken because:
-- 1. users table was missing a 'status' column (verifyUser checks data.status)
-- 2. Stale reset requests for non-existent users blocked admin reset
-- Fix: add status column (default 'active'), remove orphaned reset requests

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
DELETE FROM public.password_reset_requests WHERE user_phone NOT IN (SELECT phone FROM public.users);
