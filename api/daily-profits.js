import { createClient } from '@supabase/supabase-js'

// Singleton — persists across warm Vercel invocations
let supabase = null
function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL || 'https://jwnhluxftefqciwomqig.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_it2B68etQCyh9Irq6s9kbg_yUhVRcr_'
    )
  }
  return supabase
}

export default async function handler(req, res) {
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const db = getSupabase()

  // Step 1: Process daily profits
  const { error: profitError } = await db.rpc('process_daily_profits')
  if (profitError) {
    console.error('Profit accumulation error:', profitError)
    return res.status(500).json({ error: profitError.message })
  }

  // Step 2: Delete transactions older than 90 days (prevents auto-pause)
  const { error: cleanupError, count } = await db
    .from('transactions')
    .delete()
    .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  console.log(`✅ Daily profits processed. Cleaned up ${count ?? '?'} old transactions (90+ days)`)

  return res.status(200).json({
    success: true,
    message: 'Profits processed + old transactions cleaned',
  })
}
