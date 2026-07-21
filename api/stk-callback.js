/**
 * PayKit STK Callback — always returns 200 immediately.
 * Updates deposits table to trigger existing admin approval workflow.
 */

import { getServerClient } from '../src/lib/supabase.js'

export default async function handler(req, res) {
  // Always 200 immediately
  res.status(200).json({ received: true })

  try {
    console.log('stk-callback raw body:', JSON.stringify(req.body))

    const body = req.body || {}
    const callback = body?.Body?.stkCallback

    if (!callback) {
      console.log('stk-callback: non-standard format, full body:', JSON.stringify(body))
      return
    }

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback
    console.log(`Callback: CheckoutRequestID=${CheckoutRequestID}, ResultCode=${ResultCode}, ResultDesc=${ResultDesc}`)

    const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)

    if (ResultCode !== 0) {
      console.log(`STK Failed: ${ResultDesc}`)
      await supabase
        .from('deposits')
        .update({ status: 'failed', mpesa_receipt: ResultDesc || null })
        .eq('checkout_id', CheckoutRequestID)
      return
    }

    const items = CallbackMetadata?.Item || []
    const getItem = (name) => items.find((i) => i.Name === name)?.Value
    const mpesaReceipt = String(getItem('MpesaReceiptNumber') || '')
    const amount = getItem('Amount')
    const phoneNumber = String(getItem('PhoneNumber') || '')

    console.log(`STK Success: Amount=${amount}, Receipt=${mpesaReceipt}, Phone=${phoneNumber}`)

    await supabase
      .from('deposits')
      .update({
        mpesa_receipt: mpesaReceipt,
        status: 'mpesa_confirmed',
      })
      .eq('checkout_id', CheckoutRequestID)
      .is('mpesa_receipt', null)
  } catch (err) {
    console.error('stk-callback error:', err.message, err.stack)
  }
}
