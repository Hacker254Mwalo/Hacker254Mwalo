/**
 * Vercel Serverless Function: PayKit M-Pesa STK Push Callback
 *
 * PayKit posts to this URL after the user completes (or cancels) the M-Pesa prompt.
 * This function logs the callback for admin review but does NOT automatically update balances.
 * Admin must manually approve deposits in the admin panel.
 */

export default async function handler(req, res) {
  // PayKit sends POST; respond 200 quickly so PayKit doesn't retry
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body || {}
    const callback = body?.Body?.stkCallback

    if (!callback) {
      console.log('stk-callback: received non-standard callback format', JSON.stringify(body))
      return res.status(200).json({ received: true })
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback

    // ── Log callback for admin review ──────────────────────────────────────
    if (ResultCode === 0) {
      // Payment succeeded on M-Pesa side
      const items = CallbackMetadata?.Item || []
      const getItem = (name) => items.find((i) => i.Name === name)?.Value
      const mpesaReceipt = String(getItem('MpesaReceiptNumber') || '')
      const amount = getItem('Amount')

      console.log(`✅ STK Callback Success: CheckoutRequestID=${CheckoutRequestID}, Amount=${amount}, Receipt=${mpesaReceipt}`)
      console.log(`   Admin must manually approve this deposit in the admin panel.`)
    } else {
      // Payment failed or cancelled
      console.log(`❌ STK Callback Failed: CheckoutRequestID=${CheckoutRequestID}, ResultCode=${ResultCode}, ResultDesc=${ResultDesc}`)
    }

    // Always return 200 so PayKit doesn't retry
    return res.status(200).json({ received: true, message: 'Callback logged for admin review' })
  } catch (err) {
    console.error('stk-callback error:', err)
    // Always return 200 to prevent PayKit from retrying with bad data
    return res.status(200).json({ received: true })
  }
}
