/**
 * Vercel Serverless Function: M-Pesa STK Push via PayKit
 * Optimized: sb-forwarded-for header set per-request to bypass auth rate limits.
 *
 * Required environment variables in Vercel:
 *   PAYKIT_CONSUMER_KEY, PAYKIT_CONSUMER_SECRET, PAYKIT_PASSKEY, PAYKIT_SHORTCODE
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { getServerClient } from '../src/lib/supabase.js'

// PayKit OAuth token cache (50 min TTL, refresh at 45 min)
let paykitToken = null
let paykitTokenExpiresAt = 0

async function getPayKitToken(authUrl, consumerKey, consumerSecret) {
  const now = Date.now()
  if (paykitToken && now < paykitTokenExpiresAt) return paykitToken
  const authToken = Buffer.from(consumerKey + ':' + consumerSecret).toString('base64')
  const authRes = await fetch(authUrl, {
    headers: { Authorization: 'Basic ' + authToken },
  })
  const authData = await authRes.json()
  if (!authData.access_token) throw new Error('PayKit token fetch failed')
  paykitToken = authData.access_token
  paykitTokenExpiresAt = now + 45 * 60 * 1000
  return paykitToken
}

// In-memory rate limiter
const rateLimitMap = new Map()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

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

  const { phone, amount, userPhone } = req.body || {}

  if (!phone || !amount || !userPhone) {
    return res.status(400).json({ error: 'phone, amount, and userPhone are required' })
  }

  let normalPhone = String(phone).replace(/\s/g, '')
  if (normalPhone.startsWith('+')) normalPhone = normalPhone.slice(1)
  if (normalPhone.startsWith('0')) normalPhone = '254' + normalPhone.slice(1)

  if (!/^2547\d{8}$|^2541\d{8}$/.test(normalPhone)) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number' })
  }

  const numAmount = Math.ceil(Number(amount))
  if (!Number.isFinite(numAmount) || numAmount < 400 || numAmount > 150000) {
    return res.status(400).json({ error: 'Amount must be between KSh 400 and KSh 150,000' })
  }

  if (isRateLimited(normalPhone)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' })
  }

  const consumerKey = process.env.PAYKIT_CONSUMER_KEY
  const consumerSecret = process.env.PAYKIT_CONSUMER_SECRET
  const passkey = process.env.PAYKIT_PASSKEY
  const shortcode = process.env.PAYKIT_SHORTCODE || '174379'
  const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.sandbox.paykit.africa'
  const authUrl = process.env.PAYKIT_AUTH_URL || `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`
  const stkUrl = process.env.PAYKIT_STK_URL || `${baseUrl}/v1/collection/stkpush`

  if (!consumerKey || !consumerSecret || !passkey) {
    return res.status(500).json({
      error: 'PayKit credentials not configured. Set PAYKIT_CONSUMER_KEY, PAYKIT_CONSUMER_SECRET, PAYKIT_PASSKEY in Vercel environment variables.',
    })
  }

  // Create per-request client with sb-forwarded-for to bypass auth rate limits
  const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    const accessToken = await getPayKitToken(authUrl, consumerKey, consumerSecret)
    if (!accessToken) {
      return res.status(500).json({ error: 'Failed to get access token from PayKit' })
    }

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14)
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64')

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
      const { data: deposit, error: depositError } = await supabase
        .rpc('insert_deposit', {
          p_user_phone: userPhone,
          p_amount: numAmount,
          p_checkout_id: stkData.CheckoutRequestID,
          p_method: 'stk',
        })

      if (depositError) {
        console.error('Failed to save deposit to Supabase:', depositError)
        return res.status(500).json({ error: 'Failed to save deposit request' })
      }

      return res.status(200).json({
        success: true,
        checkoutRequestId: stkData.CheckoutRequestID,
        depositId: deposit?.deposit?.id,
        message: 'STK Push sent to your phone. Enter your M-Pesa PIN to complete. Deposit awaiting admin approval.',
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
