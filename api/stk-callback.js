/**
 * Vercel Serverless Function: PayKit M-Pesa STK Push Callback
 *
 * PayKit posts to this URL after the user completes (or cancels) the M-Pesa
 * prompt.  On success (ResultCode === 0) the deposit is automatically approved
 * and the user's balance is credited — no manual admin action needed.
 *
 * Required environment variables (same project, set in Vercel):
 *   VITE_SUPABASE_URL             — or SUPABASE_URL (server-side alias)
 *   SUPABASE_SERVICE_ROLE_KEY     — preferred (bypasses RLS)
 *   VITE_SUPABASE_ANON_KEY        — fallback if service role key not set
 */

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // PayKit sends POST; respond 200 quickly so PayKit doesn't retry
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const callback = body?.Body?.stkCallback

    if (!callback) {
      console.error('stk-callback: invalid payload', JSON.stringify(body))
      return res.status(400).json({ error: 'Invalid callback format' })
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback

    // ── Initialise Supabase ────────────────────────────────────────────────
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.warn('stk-callback: Supabase not configured — cannot update deposit')
      return res.status(200).json({ received: true })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // ── Payment failed or cancelled ────────────────────────────────────────
    if (ResultCode !== 0) {
      console.log(`stk-callback: payment failed — ${ResultDesc} (${CheckoutRequestID})`)
      if (CheckoutRequestID) {
        await supabase
          .from('deposits')
          .update({ status: 'rejected' })
          .eq('checkout_id', CheckoutRequestID)
          .eq('status', 'pending')
      }
      return res.status(200).json({ received: true, success: false, message: ResultDesc })
    }

    // ── Payment succeeded ──────────────────────────────────────────────────
    // NOTE: Payment was successful on M-Pesa side, but we keep the deposit
    // in 'pending' status for manual admin approval. The admin will review
    // and approve/reject in the admin panel.
    const items       = CallbackMetadata?.Item || []
    const getItem     = (name) => items.find((i) => i.Name === name)?.Value
    const mpesaReceipt = String(getItem('MpesaReceiptNumber') || '')

    if (!CheckoutRequestID) {
      console.error('stk-callback: missing CheckoutRequestID in success callback')
      return res.status(200).json({ received: true })
    }

    // Find the pending deposit
    const { data: deposit, error: fetchErr } = await supabase
      .from('deposits')
      .select('id, user_phone, amount, status')
      .eq('checkout_id', CheckoutRequestID)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchErr) {
      console.error('stk-callback: deposit lookup error', fetchErr.message)
      return res.status(200).json({ received: true })
    }

    if (!deposit) {
      // Already processed or not found — still return 200 so PayKit doesn't retry
      console.warn(`stk-callback: no pending deposit for CheckoutRequestID ${CheckoutRequestID}`)
      return res.status(200).json({ received: true })
    }

    // Store M-Pesa receipt but keep status as 'pending' for admin approval
    await supabase
      .from('deposits')
      .update({ mpesa_receipt: mpesaReceipt || null })
      .eq('id', deposit.id)

    console.log(
      `stk-callback: M-Pesa payment confirmed for deposit ${deposit.id} — KSh ${deposit.amount} from ${deposit.user_phone} (receipt: ${mpesaReceipt}). Awaiting admin approval.`
    )

    return res.status(200).json({ received: true, success: true, message: 'Payment confirmed. Awaiting admin approval.' })
  } catch (err) {
    console.error('stk-callback error:', err)
    // Always return 200 to prevent PayKit from retrying with bad data
    return res.status(200).json({ received: true })
  }
}
