import { createClient } from '@supabase/supabase-js'

const VERIFIED_SUPABASE_URL = 'https://jwnhluxftefqciwomqig.supabase.co'
const VERIFIED_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_it2B68etQCyh9Irq6s9kbg_yUhVRcr_'

export const isSupabaseConfigured = Boolean(VERIFIED_SUPABASE_URL && VERIFIED_SUPABASE_PUBLISHABLE_KEY)

// Single shared client for client-side PostgREST queries (no direct PG connections)
const globalHeaders = {}

// Extract real user IP from Vercel headers and pass to Supabase via sb-forwarded-for
// This prevents all Vercel-hosted requests from appearing as a single IP, which
// would hit Supabase auth rate limits immediately.
if (typeof window === 'undefined') {
  // Server-side: headers set per-request (see server client helper below)
}

export const supabase = createClient(VERIFIED_SUPABASE_URL, VERIFIED_SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false, // this app uses custom auth, not Supabase Auth
    autoRefreshToken: false,
  },
  global: {
    headers: globalHeaders,
  },
  // Disable realtime by default — only instantiate per-component when needed
  realtime: {
    params: {
      eventsPerSecond: 0, // prevents background heartbeat connections
    },
  },
})

// Client-side: detect real IP from headers when behind a proxy
// Vercel sets x-forwarded-for or x-vercel-forwarded-for on edge functions
export function getClientIp(headers) {
  const forwarded = headers?.['x-forwarded-for'] || headers?.['x-vercel-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return headers?.['x-real-ip'] || '0.0.0.0'
}

/**
 * Create a Supabase client for serverless functions with proper IP forwarding.
 * Pass req.headers from the Vercel handler.
 *
 * Usage in API routes:
 *   const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)
 *   const { data } = await supabase.from('users').select('*')
 */
export function getServerClient(headers, serviceRoleKey) {
  const ip = getClientIp(headers)
  return createClient(
    process.env.SUPABASE_URL || VERIFIED_SUPABASE_URL,
    serviceRoleKey || VERIFIED_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false },
      global: {
        headers: {
          'sb-forwarded-for': ip,
        },
      },
      realtime: {
        params: { eventsPerSecond: 0 },
      },
    }
  )
}
