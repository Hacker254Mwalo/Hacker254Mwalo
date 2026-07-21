/**
 * Vercel Serverless Function: PayKit M-Pesa STK Push Callback
 *
 * On success: updates the deposit record with M-Pesa receipt and sets status
 * to 'mpesa_confirmed' — triggers the existing admin approval workflow.
 * Admin manually approves in the admin panel to credit the user's balance.
 *
 * Always returns HTTP 200 OK to PayKit immediately.
 */

import { getServerClient } from '../src/lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Respond 200 immediately to PayKit, then process async
  res.status(200).json({ received: true })

  try {
    const body = req.body || {}
    const callback = body?.Body?.stkCallback

    if (!callback) {
      console.log('stk-callback: non-standard format', JSON.stringify(body))
      return
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback

    if (ResultCode !== 0) {
      console.log(`STK Callback Failed: CheckoutRequestID=${CheckoutRequestID}, ResultCode=${ResultCode}, ResultDesc=${ResultDesc}`)
      // Update deposit status to 'failed' so admin sees it
      const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)
      await supabase
        .from('deposits')
        .update({ status: 'failed', mpesa_receipt: ResultDesc || null })
        .eq('checkout_id', CheckoutRequestID)
      return
    }

    // Payment succeeded — extract receipt details
    const items = CallbackMetadata?.Item || []
    const getItem = (name) => items.find((i) => i.Name === name)?.Value
    const mpesaReceipt = String(getItem('MpesaReceiptNumber') || '')
    const amount = getItem('Amount')
    const phoneNumber = String(getItem('PhoneNumber') || '')

    console.log(`STK Callback Success: CheckoutRequestID=${CheckoutRequestID}, Amount=${amount}, Receipt=${mpesaReceipt}, Phone=${phoneNumber}`)

    // Update deposit record with receipt details and admin-approval-triggering status
    const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)
    await supabase
      .from('deposits')
      .update({
        mpesa_receipt: mpesaReceipt,
        status: 'mpesa_confirmed',
      })
      .eq('checkout_id', CheckoutRequestID)
      .is('mpesa_receipt', null) // only update if receipt not already set
  } catch (err) {
    console.error('stk-callback error:', err)
  }
}
