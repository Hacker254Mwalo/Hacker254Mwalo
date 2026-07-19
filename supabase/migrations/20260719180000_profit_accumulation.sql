-- Profit accumulation logic for active investments
-- This credits users with their investment's daily_return every 24 hours.

-- 1. Function to credit all active investments
create or replace function public.process_daily_profits()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- For every active investment that hasn't ended yet
  for r in 
    select id, user_phone, daily_return 
    from public.investments 
    where status = 'active' 
      and ends_at > now()
      and daily_return > 0
  loop
    -- Add daily return to user's balance
    update public.users
    set balance = balance + r.daily_return
    where phone = r.user_phone;

    -- Track the profit in the investment record (cumulative)
    update public.investments
    set profit = profit + r.daily_return
    where id = r.id;

    -- Record the transaction
    insert into public.transactions (user_id, type, amount, status, reference)
    select id, 'profit', r.daily_return, 'completed', r.id::text
    from public.users
    where phone = r.user_phone;
  end loop;

  -- Auto-complete investments that have reached their end date
  update public.investments
  set status = 'completed'
  where status = 'active' and ends_at <= now();
end;
$$;

-- 2. Schedule the job to run every day at midnight (Nairobi time)
-- We check for the cron schema before scheduling
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule(
      'daily-profit-accumulation',
      '0 0 * * *', -- Every day at 00:00
      'select public.process_daily_profits()'
    );
  end if;
end
$$;

grant execute on function public.process_daily_profits() to anon, authenticated;
