/**
 * Vercel Serverless Function: M-Pesa STK Push Collection via PayKit
 *
 * OAuth2 Token Flow:
 *   POST {PAYKIT_BASE_URL}/v1/oauth/token
 *   grant_type=client_credentials&client_id={PAYKIT_CLIENT_ID}&client_secret={PAYKIT_CLIENT_SECRET}
 *
 * STK Push Collection:
 *   POST {PAYKIT_BASE_URL}/v1/collection/stkpush
 *   Authorization: Bearer {access_token}
 *
 * Vercel Env Vars:
 *   PAYKIT_CLIENT_ID           — OAuth2 client_id
 *   PAYKIT_CLIENT_SECRET       — OAuth2 client_secret
 *   PAYKIT_BASE_URL            — https://api.sandbox.paykit.africa (or production)
 *   PAYKIT_CALLBACK_URL        — Full public URL of /api/stk-callback
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { getServerClient } from '../src/lib/supabase.js'

// ── In-memory token cache (per Vercel instance) ──────────────────────────────
let paykitToken = null
let paykitTokenExpiresAt = 0

async function getPayKitToken() {
  const now = Date.now()
  // Refresh 60s before expiry to avoid race conditions
  if (paykitToken && now < paykitTokenExpiresAt - 60_000) return paykitToken

  // ── TEMP DEBUG: verify env vars are loading (DO NOT REMOVE LINE — check Vercel logs, then remove) ──
  console.log('[DEBUG-env] PAYKIT_CLIENT_ID:', !!process.env.PAYKIT_CLIENT_ID)
  console.log('[DEBUG-env] PAYKIT_CLIENT_SECRET:', !!process.env.PAYKIT_CLIENT_SECRET)
  console.log('[DEBUG-env] PAYKIT_BASE_URL:', !!process.env.PAYKIT_BASE_URL)
  console.log('[DEBUG-env] PAYKIT_CALLBACK_URL:', !!process.env.PAYKIT_CALLBACK_URL)
  // ── END TEMP DEBUG ──

  const clientId = process.env.PAYKIT_CLIENT_ID
  const clientSecret = process.env.PAYKIT_CLIENT_SECRET
  const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.sandbox.paykit.africa'

  if (!clientId || !clientSecret) {
    throw new Error('PAYKIT_CLIENT_ID and PAYKIT_CLIENT_SECRET are required')
  }

  const tokenUrl = `${baseUrl}/v1/oauth/token`

  const authRes = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  const authData = await authRes.json()

  if (!authRes.ok) {
    console.error('PayKit token error:', authRes.status, authData)
    throw new Error(`PayKit OAuth2 failed: ${authData?.error || authRes.statusText}`)
  }

  if (!authData.access_token) {
    console.error('PayKit auth response missing access_token:', authData)
    throw new Error('PayKit token fetch failed: no access_token in response')
  }

  paykitToken = authData.access_token
  // PayKit tokens expire in ~900s; cache for 840s to refresh safely early
  paykitTokenExpiresAt = now + (authData.expires_in ? authData.expires_in * 1000 : 840_000)
  return paykitToken
}

// ── Rate limiting ────────────────────────────────────────────────────────────
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

// ── Phone normalization ──────────────────────────────────────────────────────
function normalizePhone(phone) {
  let p = String(phone).replace(/\s/g, '')
  if (p.startsWith('+')) p = p.slice(1)
  if (p.startsWith('0')) p = '254' + p.slice(1)
  return /^254\d{9}$/.test(p) ? p : null
}

// ── Error response helper ────────────────────────────────────────────────────
function paykitErrorResponse(res, status, paykitError) {
  const message = paykitError?.error || paykitError?.message || paykitError?.detail || `PayKit error: HTTP ${status}`
  return res.status(status).json({ success: false, message })
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phone, amount, userPhone, requestId } = req.body || {}
  if (!phone || !amount || !userPhone) {
    return res.status(400).json({ error: 'phone, amount, and userPhone required' })
  }

  const normalPhone = normalizePhone(phone)
  if (!normalPhone) {
    return res.status(400).json({ error: 'Invalid phone. Use 12 digits starting with 254.' })
  }

  const numAmount = Math.ceil(Number(amount))
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive integer' })
  }

  if (isRateLimited(normalPhone)) {
    return res.status(429).json({ error: 'Too many requests. Wait a minute.' })
  }

  const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)

  try {
    // 1. Get OAuth2 access token
    const accessToken = await getPayKitToken()
    if (!accessToken) {
      return res.status(500).json({ error: 'PayKit authentication failed' })
    }

    // 2. Build the STK push request body per PayKit spec
    const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.sandbox.paykit.africa'
    const callbackUrl = process.env.PAYKIT_CALLBACK_URL ||
      ('https://' + (process.env.VERCEL_URL || 'localhost:3000') + '/api/stk-callback')

    const request_id = requestId || crypto.randomUUID()

    const stkBody = {
      collection_channel: 'Mpesa',
      amount: numAmount,
      phone_number: normalPhone,
      account_reference: 'DUMIROPAY',      // max 12 chars
      remarks: 'Dumiropay Deposit',        // max 13 chars
      callback_url: callbackUrl,
      request_id: request_id,
    }

    const stkUrl = `${baseUrl}/v1/collection/stkpush`

    // 3. Send STK push
    const stkRes = await fetch(stkUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(stkBody),
    })

    const stkData = await stkRes.json()

    console.log('PayKit STK Response:', stkRes.status, JSON.stringify(stkData))

    // 4. Handle PayKit error responses
    if (!stkRes.ok) {
      console.error('PayKit STK error:', stkRes.status, stkData)

      // 401 = token expired or invalid — retry token fetch once
      if (stkRes.status === 401) {
        paykitToken = null
        paykitTokenExpiresAt = 0
        const retryToken = await getPayKitToken()
        if (retryToken) {
          const retryRes = await fetch(stkUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${retryToken}`,
            },
            body: JSON.stringify(stkBody),
          })
          const retryData = await retryRes.json()
          if (retryRes.ok) {
            return handleSuccess(res, supabase, stkBody, userPhone, retryData)
          }
        }
      }

      if (stkRes.status === 409) {
        // Duplicate request_id — retry with new UUID
        const newBody = { ...stkBody, request_id: crypto.randomUUID() }
        const retryRes = await fetch(stkUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(newBody),
        })
        const retryData = await retryRes.json()
        if (retryRes.ok) {
          return handleSuccess(res, supabase, newBody, userPhone, retryData)
        }
      }

      return paykitErrorResponse(res, stkRes.status, stkData)
    }

    // 5. Handle success (201 Created, status: INITIATED)
    return handleSuccess(res, supabase, stkBody, userPhone, stkData)

  } catch (err) {
    console.error('STK Push error:', err.message, err.stack)
    return res.status(500).json({
      success: false,
      message: 'STK Push failed. Please try again.',
    })
  }
}

// ── Success handler ──────────────────────────────────────────────────────────
async function handleSuccess(res, supabase, stkBody, userPhone, stkData) {
  // PayKit returns 201 with status: "INITIATED" on success
  // We use request_id as the primary tracker (not CheckoutRequestID)
  const requestId = stkBody.request_id

  // Save deposit record for tracking
  const { data: deposit, error: depositError } = await supabase
    .rpc('insert_deposit', {
      p_user_phone: userPhone,
      p_amount: stkBody.amount,
      p_checkout_id: requestId,          // store request_id as checkout_id
      p_method: 'stk',
    })

  if (depositError) {
    console.error('Deposit save failed:', depositError)
    // Don't fail the response — STK was sent, just log the DB issue
  }

  return res.status(200).json({
    success: true,
    requestId: requestId,
    checkoutRequestId: stkData?.data?.request_id || requestId,
    depositId: deposit?.deposit?.id,
    message: 'STK Push sent. Enter M-Pesa PIN on your phone.',
  })
}
