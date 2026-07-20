import { createClient } from '@supabase/supabase-js'

export default function handler(req, res) {
  // 1. Security check: ensure this is called by Vercel Cron and not a user
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase not configured.' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  // 2. Call the bulletproof profit accumulation function in Supabase
  supabase.rpc('process_daily_profits').then(({ error }) => {
    if (error) {
      console.error('Profit accumulation error:', error)
      return res.status(500).json({ error: error.message })
    }
    console.log('✅ Daily profits processed successfully')
    return res.status(200).json({ success: true, message: 'Profits processed' })
  })
}
