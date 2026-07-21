-- ============================================================
-- Add the missing insert_deposit RPC that stk-push.js calls
-- This RPC is called by the STK push API handler to create
-- a pending deposit record when the STK prompt is initiated.
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_deposit(
  p_user_phone text,
  p_amount numeric,
  p_checkout_id text,
  p_method text
) RETURNS json LANGUAGE plpgsql AS $$
declare
  v_deposit_id uuid;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Deposit amount must be greater than zero';
  end if;

  if p_user_phone is null or p_user_phone = '' then
    raise exception 'User phone is required';
  end if;

  insert into public.deposits (
    user_phone, amount, checkout_id, status, method
  ) values (
    p_user_phone, p_amount, p_checkout_id, 'pending', p_method
  )
  returning id into v_deposit_id;

  -- Also create a transaction record for audit trail
  insert into public.transactions (
    phone_number, user_phone, type, amount, status, reference, description
  ) values (
    p_user_phone, p_user_phone, 'deposit', p_amount, 'pending', p_checkout_id, 'STK Push Initiated'
  );

  return json_build_object(
    'success', true,
    'deposit', json_build_object('id', v_deposit_id)
  );
end;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_deposit(text, numeric, text, text) TO anon, authenticated;
