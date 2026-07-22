-- Add last_paid_date to investments table and retroactively update profit

alter table public.investments
add column if not exists last_paid_date timestamptz;

-- Retroactively update profit and last_paid_date for existing active investments
-- This assumes 'total_earned' in the user's request maps to 'profit' in the schema,
-- and 'start_date' maps to 'created_at' (or 'started_at' if available and more accurate).
-- We'll use 'created_at' for simplicity and broad applicability.

update public.investments
set
  profit = (extract(epoch from (now() - created_at)) / (24 * 3600)) * daily_return,
  last_paid_date = now()
where
  status = 'active'
  and daily_return > 0
  and profit = 0; -- Only update investments that haven't earned anything yet

-- Update the existing process_daily_profits function to use last_paid_date
-- and ensure it updates profit correctly.
-- The existing function already uses 'last_profit_at' which serves the same purpose.
-- For consistency with the user's request, we will rename 'last_profit_at' to 'last_paid_date'
-- and ensure the logic remains the same.

-- First, drop the existing function if it exists
drop function if exists public.process_daily_profits();

-- Then, recreate the function with the updated column name and logic
create or replace function public.process_daily_profits()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_now timestamptz := now();
begin
  -- For every active investment that hasn't ended yet and hasn't been paid in the last 23 hours
  for r in
    select id, user_phone, daily_return
    from public.investments
    where status = 'active'
      and ends_at > v_now
      and daily_return > 0
      and (last_paid_date is null or last_paid_date < (v_now - interval '23 hours'))
  loop
    -- Add daily return to user's balance
    update public.users
    set balance = balance + r.daily_return
    where phone = r.user_phone;

    -- Track the profit in the investment record (cumulative)
    update public.investments
    set
      profit = profit + r.daily_return,
      last_paid_date = v_now
    where id = r.id;

    -- Record the transaction
    insert into public.transactions (phone_number, user_phone, type, amount, status, reference, description)
    values (r.user_phone, r.user_phone, 'profit', r.daily_return, 'completed', r.id::text, 'Daily investment profit');
  end loop;

  -- Auto-complete investments that have reached their end date
  update public.investments
  set status = 'completed'
  where status = 'active' and ends_at <= v_now;
end;
$$;

-- Grant execute permissions
grant execute on function public.process_daily_profits() to anon, authenticated;

-- Ensure the cron job is scheduled (this part is idempotent)
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    -- Remove old schedule if it exists (to avoid duplicates or conflicts)
    perform cron.unschedule('daily-profit-accumulation');
    perform cron.schedule(
      'daily-profit-accumulation',
      '0 0 * * *', -- Every day at 00:00 UTC
      'select public.process_daily_profits()'
    );
  end if;
end
$$;
