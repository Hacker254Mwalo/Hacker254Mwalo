-- ============================================================
-- Fix STK Push and Admin Transaction Visibility Issues
-- ============================================================
-- Issue 1: insert_deposit RPC is called but never defined
-- Issue 2: transactions table is never created, causing admin visibility issues
-- ============================================================

-- 1. Create the missing transactions table with proper schema
CREATE TABLE IF NOT EXISTS public.transactions (
  id             uuid primary key default gen_random_uuid(),
  phone_number   text not null,
  user_phone     text,
  type           text not null default 'deposit',
  amount         numeric not null,
  status         text not null default 'completed',
  reference      text,
  description    text,
  created_at     timestamptz not null default now()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_phone_number ON public.transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_transactions_user_phone ON public.transactions(user_phone);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- 3. Enable RLS on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Grant permissions
GRANT ALL ON TABLE public.transactions TO anon, authenticated;

-- 5. Create RLS policy
DROP POLICY IF EXISTS "anon_all" ON public.transactions;
CREATE POLICY "anon_all" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Create the missing insert_deposit RPC that stk-push.js calls
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

-- 7. Backfill missing user_phone values in transactions table
UPDATE public.transactions SET user_phone = phone_number WHERE user_phone IS NULL;

-- 8. Backfill missing type values (default to deposit for legacy rows)
UPDATE public.transactions SET type = 'deposit' WHERE type IS NULL OR type = '';

-- 9. Backfill missing description values
UPDATE public.transactions SET description = 'Deposit' WHERE description IS NULL AND type = 'deposit';
UPDATE public.transactions SET description = 'Profit' WHERE description IS NULL AND type = 'profit';
UPDATE public.transactions SET description = 'Withdrawal' WHERE description IS NULL AND type = 'withdrawal';

-- 10. Add missing columns to deposits table if they don't exist
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS method text DEFAULT 'manual';

-- 11. Create index for deposits method
CREATE INDEX IF NOT EXISTS idx_deposits_method ON public.deposits(method);
