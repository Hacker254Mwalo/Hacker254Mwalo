-- Add missing columns to investments table for migration compatibility
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS user_id text;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS profit numeric DEFAULT 0;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_profit_at timestamptz;
