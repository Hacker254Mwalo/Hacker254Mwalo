import { createClient } from '@supabase/supabase-js'

const VERIFIED_SUPABASE_URL = 'https://jwnhluxftefqciwomqig.supabase.co'
const VERIFIED_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_it2B68etQCyh9Irq6s9kbg_yUhVRcr_'

export const isSupabaseConfigured = Boolean(VERIFIED_SUPABASE_URL && VERIFIED_SUPABASE_PUBLISHABLE_KEY)
export const supabase = createClient(VERIFIED_SUPABASE_URL, VERIFIED_SUPABASE_PUBLISHABLE_KEY)
