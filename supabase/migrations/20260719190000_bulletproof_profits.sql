-- Bulletproof Profit Accumulation
-- This ensures users get profits automatically every 24h with NO chance of double-crediting.

-- 1. Add safety column to track exactly when profit was last credited
alter table public.investments add column if not exists last_profit_at timestamp with time zone;

-- 2. Update the profit processing function with strict guards
create or replace function public.process_daily_profits()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_now timestamp with time zone := now();
begin
  -- For every active investment:
  -- 1. Status must be 'active'
  -- 2. Has not ended yet
  -- 3. daily_return > 0
  -- 4. SAFETY: Has NOT been credited in the last 23 hours (prevents double runs)
  for r in 
    select id, user_phone, daily_return 
    from public.investments 
    where status = 'active' 
      and ends_at > v_now
      and daily_return > 0
      and (last_profit_at is null or last_profit_at < v_now - interval '23 hours')
  loop
    -- A. Update User Balance
    update public.users
    set balance = balance + r.daily_return
    where phone = r.user_phone;

    -- B. Update Investment Record (track profit + set safety timestamp)
    update public.investments
    set 
      profit = profit + r.daily_return,
      last_profit_at = v_now
    where id = r.id;

    -- C. Record Transaction for history
    insert into public.transactions (user_id, type, amount, status, reference)
    select id, 'profit', r.daily_return, 'completed', r.id::text
    from public.users
    where phone = r.user_phone;
  end loop;

  -- Auto-complete investments that have reached their end date
  update public.investments
  set status = 'completed'
  where status = 'active' and ends_at <= v_now;
end;
$$;

-- 3. Re-grant permissions
grant execute on function public.process_daily_profits() to anon, authenticated;
