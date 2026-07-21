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

-- Users can read their own notifications OR global (all) notifications
create policy "Users can read own and global notifications"
  on notifications for select
  using (
    target = 'all'
    or user_phone = current_setting('request.jwt.claims', true)::json->>'phone'
  );

-- Users can update (mark read) their own or global notifications
create policy "Users can mark notifications read"
  on notifications for update
  using (
    target = 'all'
    or user_phone = current_setting('request.jwt.claims', true)::json->>'phone'
  );

-- Users can delete their own notifications (not global ones)
create policy "Users can delete own notifications"
  on notifications for delete
  using (
    user_phone = current_setting('request.jwt.claims', true)::json->>'phone'
  );

-- Service role (admin) has full access
grant all on notifications to service_role;
grant select, update, delete on notifications to anon, authenticated;
grant insert on notifications to service_role;
