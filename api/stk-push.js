/**
 * Vercel Serverless Function: M-Pesa STK Push via PayKit Sandbox
 *
 * Required environment variables in Vercel:
 *   PAYKIT_CONSUMER_KEY      — from PayKit dashboard
 *   PAYKIT_CONSUMER_SECRET   — from PayKit dashboard
 *   PAYKIT_PASSKEY           — from PayKit dashboard
 *   PAYKIT_SHORTCODE         — Sandbox: 174379  |  Production: your Paybill (e.g. 4091165)
 *   PAYKIT_BASE_URL          — Sandbox: https://api.sandbox.paykit.africa
 *                              Production: https://api.paykit.co.ke
 *
 * OAuth endpoint  : {PAYKIT_BASE_URL}/oauth/v1/generate?grant_type=client_credentials
 * STK Push endpoint: {PAYKIT_BASE_URL}/v1/collection/stkpush
 */

// Simple in-memory rate limiter (resets on cold start — sufficient for serverless)
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 5 // max 5 STK pushes per phone per minute

function isRateLimited(phone) {
  const now = Date.now()
  const entry = rateLimitMap.get(phone) || { count: 0, start: now }
  if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(phone, { count: 1, start: now })
    return false
  }
  if (entry.count >= RATE_LIMIT_MAX) return true
  rateLimitMap.set(phone, { count: entry.count + 1, start: entry.start })
  return false
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, amount } = req.body || {}

  // ── Input validation ──────────────────────────────────────────────────────
  if (!phone || !amount) {
    return res.status(400).json({ error: 'phone and amount are required' })
  }

  // Normalize phone before rate-limit check
  let normalPhone = String(phone).replace(/\s/g, '')
  if (normalPhone.startsWith('+')) normalPhone = normalPhone.slice(1)
  if (normalPhone.startsWith('0')) normalPhone = '254' + normalPhone.slice(1)

  if (!/^2547\d{8}$|^2541\d{8}$/.test(normalPhone)) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number' })
  }

  const numAmount = Math.ceil(Number(amount))
  if (!Number.isFinite(numAmount) || numAmount < 400 || numAmount > 150000) {
    return res.status(400).json({ error: 'Amount must be between KSh 400 and KSh 150,000 (minimum deposit is KSh 400)' })
  }

  if (isRateLimited(normalPhone)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' })
  }

  // ── Credentials check ─────────────────────────────────────────────────────
  const consumerKey    = process.env.PAYKIT_CONSUMER_KEY
  const consumerSecret = process.env.PAYKIT_CONSUMER_SECRET
  const passkey        = process.env.PAYKIT_PASSKEY
  const shortcode      = process.env.PAYKIT_SHORTCODE || '174379'

  // Support both legacy PAYKIT_AUTH_URL/PAYKIT_STK_URL and new PAYKIT_BASE_URL
  const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.sandbox.paykit.africa'
  const authUrl = process.env.PAYKIT_AUTH_URL  || `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`
  const stkUrl  = process.env.PAYKIT_STK_URL   || `${baseUrl}/v1/collection/stkpush`

  if (!consumerKey || !consumerSecret || !passkey) {
    return res.status(500).json({
      error: 'PayKit credentials not configured. Set PAYKIT_CONSUMER_KEY, PAYKIT_CONSUMER_SECRET, PAYKIT_PASSKEY in Vercel environment variables.',
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
      return res.status(500).json({ error: 'Failed to get access token from Paykit' })
    }

    // Step 2: Generate STK password (Base64 of shortcode + passkey + timestamp)
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64')

    // Step 3: Initiate STK Push
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
        Amount: numAmount,
        PartyA: normalPhone,
        PartyB: shortcode,
        PhoneNumber: normalPhone,
        CallBackURL: process.env.PAYKIT_CALLBACK_URL || ('https://' + (process.env.VERCEL_URL || 'localhost:3000') + '/api/stk-callback'),
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
    return res.status(500).json({ error: 'STK Push failed. Please try again.' })
  }
}
