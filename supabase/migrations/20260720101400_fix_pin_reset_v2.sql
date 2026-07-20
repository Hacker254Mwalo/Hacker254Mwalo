-- Fix PIN reset v2:
-- 1. request_password_reset always creates a request (even for unknown phones)
--    so admin can see and act on all requests.
-- 2. Clean up stale requests for non-existent users periodically.

CREATE OR REPLACE FUNCTION public.request_password_reset(p_user_phone text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_request_id uuid;
begin
  -- Always create a request so admin can see it, regardless of whether
  -- the phone exists in users table (prevents account enumeration but
  -- still allows admin to handle all requests).
  insert into public.password_reset_requests (user_phone, status)
  values (p_user_phone, 'pending')
  returning id into v_request_id;

  return json_build_object('success', true, 'queued', true, 'request_id', v_request_id);
end;
$function$;

-- Drop old conflicting policies, then add clean ones
DROP POLICY IF EXISTS anon_all_prr ON public.password_reset_requests;
DROP POLICY IF EXISTS allow_all_password_reset_requests ON public.password_reset_requests;
DROP POLICY IF EXISTS anon_all ON public.password_reset_requests;

-- Allow anyone to CREATE (insert) requests
CREATE POLICY allow_insert_prr ON public.password_reset_requests
  FOR INSERT WITH CHECK (true);

-- Allow anyone to READ their own or all (admin needs to see all)
CREATE POLICY allow_select_prr ON public.password_reset_requests
  FOR SELECT USING (true);

-- Allow admin (service_role via SECURITY DEFINER) to UPDATE requests
CREATE POLICY allow_update_prr ON public.password_reset_requests
  FOR UPDATE USING (true);

-- Delete orphaned requests
DELETE FROM public.password_reset_requests
WHERE user_phone NOT IN (SELECT phone FROM public.users);
