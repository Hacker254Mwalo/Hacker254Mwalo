-- Add display_as_bar column to notifications table
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS display_as_bar boolean not null default false;
