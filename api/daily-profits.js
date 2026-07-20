import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jwnhluxftefqciwomqig.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_it2B68etQCyh9Irq6s9kbg_yUhVRcr_'

export default function handler(req, res) {
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  supabase.rpc('process_daily_profits').then(({ error }) => {
    if (error) {
      console.error('Profit accumulation error:', error)
      return res.status(500).json({ error: error.message })
    }
    console.log('✅ Daily profits processed successfully')
    return res.status(200).json({ success: true, message: 'Profits processed' })
  })
}
