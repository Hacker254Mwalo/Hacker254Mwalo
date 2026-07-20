import { createClient } from '@supabase/supabase-js'

// This is the verified production project. The key is a Supabase publishable
// browser key, not a service-role secret. Keeping this fallback in source makes
// the deployed client resilient while stale Vercel environment variables are removed.
const VERIFIED_SUPABASE_URL = 'https://qlzfhogkbfsipmrurbfo.supabase.co'
const VERIFIED_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_L0FfFvLgNp5MF0yuU9lzRQ_WPQ-XLEb'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const environmentMatchesVerifiedProject =
  configuredUrl === VERIFIED_SUPABASE_URL &&
  configuredKey === VERIFIED_SUPABASE_PUBLISHABLE_KEY

// Use deployment variables only when they exactly match the connected project.
// Otherwise the verified values keep production on the intended Supabase schema.
const supabaseUrl = environmentMatchesVerifiedProject ? configuredUrl : VERIFIED_SUPABASE_URL
const supabaseAnonKey = environmentMatchesVerifiedProject ? configuredKey : VERIFIED_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
