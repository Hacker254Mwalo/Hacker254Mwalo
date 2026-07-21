import { getServerClient } from '../src/lib/supabase.js'

export default async function handler(req, res) {
  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Cron job — no real user IP, use placeholder. sb-forwarded-for still set to
  // avoid hitting the shared Vercel IP rate limit across all cron invocations.
  const supabase = getServerClient(
    { 'x-forwarded-for': '127.0.0.1' },
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Step 1: Process daily profits (uses RPC — single HTTP call, no PG connection)
  const { error: profitError } = await supabase.rpc('process_daily_profits')
  if (profitError) {
    console.error('Profit accumulation error:', profitError)
    return res.status(500).json({ error: profitError.message })
  }

  // Step 2: Delete transactions older than 90 days (prevents auto-pause)
  const { error: cleanupError, count } = await supabase
    .from('transactions')
    .delete()
    .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

  console.log(`Daily profits processed. Cleaned up ${count ?? '?'} old transactions (90+ days)`)

  return res.status(200).json({
    success: true,
    message: 'Profits processed + old transactions cleaned',
  })
}
