/**
 * Vercel Serverless Function: M-Pesa STK Push via PayKit
 *
 * Vercel Env Vars:
 *   PAYKIT_CONSUMER_KEY      — Client-ID
 *   PAYKIT_CONSUMER_SECRET   — Secret-Key
 *   PAYKIT_BASE_URL          — https://api.paykit.co.ke
 *   PAYKIT_CALLBACK_URL      — https://dumiropay.space/api/stk-callback
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { getServerClient } from '../src/lib/supabase.js'

let paykitToken = null
let paykitTokenExpiresAt = 0

async function getPayKitToken() {
  const now = Date.now()
  if (paykitToken && now < paykitTokenExpiresAt) return paykitToken

  const clientKey = process.env.PAYKIT_CONSUMER_KEY
  const clientSecret = process.env.PAYKIT_CONSUMER_SECRET
  const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.paykit.co.ke'
  const authUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`

  const authToken = Buffer.from(`${clientKey}:${clientSecret}`).toString('base64')
  const authRes = await fetch(authUrl, {
    headers: { Authorization: 'Basic ' + authToken },
  })
  const authData = await authRes.json()
  if (!authData.access_token) {
    console.error('PayKit auth failed:', authData)
    throw new Error('PayKit token fetch failed')
  }
  paykitToken = authData.access_token
  paykitTokenExpiresAt = now + 45 * 60 * 1000
  return paykitToken
}

const rateLimitMap = new Map()

function isRateLimited(phone) {
  const now = Date.now()
  const entry = rateLimitMap.get(phone) || { count: 0, start: now }
  if (now - entry.start > 60_000) {
    rateLimitMap.set(phone, { count: 1, start: now })
    return false
  }
  if (entry.count >= 5) return true
  rateLimitMap.set(phone, { count: entry.count + 1, start: entry.start })
  return false
}

function normalizePhone(phone) {
  let p = String(phone).replace(/\s/g, '')
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('0')) p = '254' + p.slice(1)
  return /^254\d{9}$/.test(p) ? p : null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phone, amount, userPhone } = req.body || {}
  if (!phone || !amount || !userPhone) return res.status(400).json({ error: 'phone, amount, and userPhone required' })

  const normalPhone = normalizePhone(phone)
  if (!normalPhone) return res.status(400).json({ error: 'Invalid phone. Use 12 digits starting with 254.' })

  const numAmount = Math.ceil(Number(amount))
  if (!Number.isFinite(numAmount) || numAmount <= 0) return res.status(400).json({ error: 'Amount must be a positive integer' })

  if (isRateLimited(normalPhone)) return res.status(429).json({ error: 'Too many requests. Wait a minute.' })

  const clientKey = process.env.PAYKIT_CONSUMER_KEY
  const clientSecret = process.env.PAYKIT_CONSUMER_SECRET
  if (!clientKey || !clientSecret) return res.status(500).json({ error: 'PAYKIT_CONSUMER_KEY and PAYKIT_CONSUMER_SECRET required.' })

  const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    const accessToken = await getPayKitToken()
    if (!accessToken) return res.status(500).json({ error: 'PayKit auth failed' })

    const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.paykit.co.ke'
    const stkUrl = `${baseUrl}/collection/stkpush`
    const callbackUrl = process.env.PAYKIT_CALLBACK_URL || ('https://' + (process.env.VERCEL_URL || 'localhost:3000') + '/api/stk-callback')

    const stkRes = await fetch(stkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': clientKey,
        'Secret-Key': clientSecret,
      },
      body: JSON.stringify({
        PhoneNumber: normalPhone,
        Amount: numAmount,
        CallBackURL: callbackUrl,
        AccountReference: 'DUMIROPAY',
        TransactionDesc: 'Dumiropay Deposit',
      }),
    })

    const responseHeaders = Object.fromEntries(stkRes.headers.entries())
    console.log('PayKit STK Response Headers:', JSON.stringify(responseHeaders))
    console.log('PayKit STK Status:', stkRes.status, stkRes.statusText)

    const stkData = await stkRes.json()
    console.log('PayKit STK Response Body:', JSON.stringify(stkData))

    if (!stkRes.ok) {
      console.error('PayKit STK Error:', stkRes.status, stkData)
      return res.status(400).json({
        success: false,
        message: stkData.message || stkData.ResponseDescription || `PayKit error: HTTP ${stkRes.status}`,
      })
    }

    if (stkData.ResponseCode === '0' || stkData.CheckoutRequestID) {
      const { data: deposit, error: depositError } = await supabase
        .rpc('insert_deposit', {
          p_user_phone: userPhone,
          p_amount: numAmount,
          p_checkout_id: stkData.CheckoutRequestID,
          p_method: 'stk',
        })

      if (depositError) {
        console.error('Deposit save failed:', depositError)
        return res.status(500).json({ error: 'Failed to save deposit' })
      }

      return res.status(200).json({
        success: true,
        checkoutRequestId: stkData.CheckoutRequestID,
        depositId: deposit?.deposit?.id,
        message: 'STK Push sent. Enter M-Pesa PIN. Deposit awaiting admin approval.',
      })
    }

    return res.status(400).json({
      success: false,
      message: stkData.message || stkData.ResponseDescription || 'STK Push failed.',
    })
  } catch (err) {
    console.error('STK Push error:', err.message, err.stack)
    return res.status(500).json({ error: 'STK Push failed. Please try again.' })
  }
}
