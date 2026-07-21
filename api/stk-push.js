/**
 * Vercel Serverless Function: M-Pesa STK Push via PayKit (Official Spec)
 *
 * Vercel Environment Variables:
 *   PAYKIT_CONSUMER_KEY      — PayKit Client ID
 *   PAYKIT_CONSUMER_SECRET   — PayKit Secret Key
 *   PAYKIT_BASE_URL          — https://api.paykit.co.ke
 *   PAYKIT_CALLBACK_URL      — https://<your-domain>/api/stk-callback
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { getServerClient } from '../src/lib/supabase.js'

// PayKit OAuth token cache
let paykitToken = null
let paykitTokenExpiresAt = 0

async function getPayKitToken() {
  const now = Date.now()
  if (paykitToken && now < paykitTokenExpiresAt) return paykitToken

  const consumerKey = process.env.PAYKIT_CONSUMER_KEY
  const consumerSecret = process.env.PAYKIT_CONSUMER_SECRET
  const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.paykit.co.ke'
  const authUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`

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

function normalizePhone(phone) {
  let p = String(phone).replace(/\s/g, '')
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('0')) p = '254' + p.slice(1)
  // Ensure exactly 12 digits starting with 254
  if (!/^254\d{9}$/.test(p)) return null
  return p
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { phone, amount, userPhone } = req.body || {}

  if (!phone || !amount || !userPhone) {
    return res.status(400).json({ error: 'phone, amount, and userPhone are required' })
  }

  const normalPhone = normalizePhone(phone)
  if (!normalPhone) {
    return res.status(400).json({ error: 'Invalid phone. Use 12-digit format starting with 254 (e.g. 254712345678)' })
  }

  const numAmount = Math.ceil(Number(amount))
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive integer' })
  }

  if (isRateLimited(normalPhone)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' })
  }

  const consumerKey = process.env.PAYKIT_CONSUMER_KEY
  const consumerSecret = process.env.PAYKIT_CONSUMER_SECRET

  if (!consumerKey || !consumerSecret) {
    return res.status(500).json({ error: 'PAYKIT_CONSUMER_KEY and PAYKIT_CONSUMER_SECRET must be set in Vercel environment variables.' })
  }

  // Create per-request client with sb-forwarded-for
  const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    const accessToken = await getPayKitToken()
    if (!accessToken) {
      return res.status(500).json({ error: 'Failed to authenticate with PayKit' })
    }

    const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.paykit.co.ke'
    const stkUrl = `${baseUrl}/v1/collection/stkpush`
    const callbackUrl = process.env.PAYKIT_CALLBACK_URL || ('https://' + (process.env.VERCEL_URL || 'localhost:3000') + '/api/stk-callback')

    const stkRes = await fetch(stkUrl, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
        'X-Client-Id': consumerKey,
      },
      body: JSON.stringify({
        PhoneNumber: normalPhone,
        Amount: numAmount,
        CallBackURL: callbackUrl,
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
        console.error('Failed to save deposit:', depositError)
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
