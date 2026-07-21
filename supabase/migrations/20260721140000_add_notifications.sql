-- ── Notifications table ──────────────────────────────────────────────────────
-- Stores admin-sent notifications for individual users or all users.
-- target = 'all'  → visible to every user (user_phone is NULL)
-- target = 'user' → visible only to the specified user_phone

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_phone  text references users(phone) on delete cascade,
  target      text not null default 'user' check (target in ('all', 'user')),
  title       text,
  message     text not null,
  type        text not null default 'info' check (type in ('info', 'success', 'warning', 'promo', 'alert')),
  icon        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Index for fast per-user queries
create index if not exists notifications_user_phone_idx on notifications(user_phone);
create index if not exists notifications_target_idx on notifications(target);
create index if not exists notifications_created_at_idx on notifications(created_at desc);

-- Enable Row Level Security
alter table notifications enable row level security;

-- Grant access to anon/authenticated to match the live site's existing pattern
grant all on notifications to anon, authenticated, service_role;

-- Open policy to match the rest of the live schema (anon_all)
drop policy if exists "anon_all" on notifications;
create policy "anon_all" on notifications for all to anon, authenticated using (true) with check (true);
