/**
 * Vercel Serverless Function: M-Pesa STK Push via Paykit
 *
 * Required environment variables in Vercel:
 *   PAYKIT_CONSUMER_KEY      — from Paykit dashboard
 *   PAYKIT_CONSUMER_SECRET   — from Paykit dashboard
 *   PAYKIT_PASSKEY           — from Paykit dashboard
 *   PAYKIT_SHORTCODE         — your M-Pesa Paybill/Till number (e.g. 4091165)
 *   PAYKIT_AUTH_URL          — Paykit OAuth token URL (get from Paykit docs)
 *   PAYKIT_STK_URL           — Paykit STK push URL (get from Paykit docs)
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, amount } = req.body || {}
  if (!phone || !amount) {
    return res.status(400).json({ error: 'phone and amount are required' })
  }

  const consumerKey = process.env.PAYKIT_CONSUMER_KEY
  const consumerSecret = process.env.PAYKIT_CONSUMER_SECRET
  const passkey = process.env.PAYKIT_PASSKEY
  const shortcode = process.env.PAYKIT_SHORTCODE || '4091165'
  const authUrl = process.env.PAYKIT_AUTH_URL
  const stkUrl = process.env.PAYKIT_STK_URL

  if (!consumerKey || !consumerSecret || !passkey || !authUrl || !stkUrl) {
    return res.status(500).json({
      error: 'Paykit credentials not configured. Set PAYKIT_CONSUMER_KEY, PAYKIT_CONSUMER_SECRET, PAYKIT_PASSKEY, PAYKIT_AUTH_URL, PAYKIT_STK_URL in Vercel environment variables.',
    })
  }

  try {
    // Step 1: Get access token from Paykit
    const authToken = Buffer.from(consumerKey + ':' + consumerSecret).toString('base64')
    const authRes = await fetch(authUrl, {
      headers: { Authorization: 'Basic ' + authToken },
    })
    const authData = await authRes.json()
    const accessToken = authData.access_token

    if (!accessToken) {
      return res.status(500).json({ error: 'Failed to get access token from Paykit', detail: authData })
    }

    // Step 2: Generate STK password (Base64 of shortcode + passkey + timestamp)
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64')

    // Step 3: Normalize phone to 254XXXXXXXXX
    let normalPhone = String(phone).replace(/\s/g, '')
    if (normalPhone.startsWith('+')) normalPhone = normalPhone.slice(1)
    if (normalPhone.startsWith('0')) normalPhone = '254' + normalPhone.slice(1)

    // Step 4: Initiate STK Push
    const stkRes = await fetch(stkUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.ceil(Number(amount)),
        PartyA: normalPhone,
        PartyB: shortcode,
        PhoneNumber: normalPhone,
        CallBackURL: 'https://' + (process.env.VERCEL_URL || 'localhost:3000') + '/api/stk-callback',
        AccountReference: 'DUMIROPAY',
        TransactionDesc: 'Dumiropay Deposit',
      }),
    })

    const stkData = await stkRes.json()

    if (stkData.ResponseCode === '0' || stkData.CheckoutRequestID) {
      return res.status(200).json({
        success: true,
        checkoutRequestId: stkData.CheckoutRequestID,
        message: 'STK Push sent to your phone. Enter your M-Pesa PIN to complete.',
      })
    }

    return res.status(400).json({
      success: false,
      message: stkData.errorMessage || stkData.ResponseDescription || 'STK Push failed. Please try again.',
    })
  } catch (err) {
    console.error('STK Push error:', err)
    return res.status(500).json({ error: 'STK Push failed: ' + err.message })
  }
}
