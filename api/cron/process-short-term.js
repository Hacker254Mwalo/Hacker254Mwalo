import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req, res) {
  // Simple auth check if needed, or rely on Vercel cron secret
  // if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).json({ error: 'Unauthorized' })
  // }

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Find expired active short-term investments
    const { data: expired, error: fetchError } = await supabase
      .from('short_term_investments')
      .select('*')
      .eq('status', 'active')
      .lt('endsAt', new Date().toISOString())

    if (fetchError) throw fetchError

    if (!expired || expired.length === 0) {
      return res.status(200).json({ message: 'No expired investments found' })
    }

    const results = []

    // 2. Process each one (credit user and update status)
    for (const inv of expired) {
      try {
        // Use a transaction/RPC for safety
        const { data, error: rpcError } = await supabase.rpc('complete_short_term_investment', {
          p_investment_id: inv.id,
          p_user_phone: inv.user_phone,
          p_payout_amount: inv.totalReturn
        })

        if (rpcError) throw rpcError
        results.push({ id: inv.id, status: 'success' })
      } catch (err) {
        results.push({ id: inv.id, status: 'error', error: err.message })
      }
    }

    return res.status(200).json({ 
      processed: expired.length,
      results 
    })
  } catch (error) {
    console.error('Cron Error:', error)
    return res.status(500).json({ error: error.message })
  }
}
