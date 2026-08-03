/**
 * Vercel Serverless Function: M-Pesa STK Push Collection via Zetu Pay
 *
 * Zetu Pay Authentication (per-request, no OAuth):
 *   authorizationKey = base64({ publicKey, privateKey, amount, walletId, timestamp })
 *
 * STK Push:
 *   POST https://pay.zetupay.co.ke/api/v1/payment/initiate
 *   Body: { authorizationKey, amount, phoneNumber, reference, redirectUrl, identifier, real }
 *
 * Vercel Env Vars:
 *   ZETUPAY_PUBLIC_KEY            — API public key (pk_live_... or pk_test_...)
 *   ZETUPAY_SECRET_KEY            — API private key (sk_live_... or sk_test_...)
 *   ZETUPAY_WALLET_ID             — Merchant application appId
 *   ZETUPAY_BASE_URL              — https://pay.zetupay.co.ke/api/v1 (default)
 *   ZETUPAY_REDIRECT_URL          — Fully-qualified redirect URL after checkout
 *   ZETUPAY_CALLBACK_URL          — Full public URL of /api/webhooks/zetupay
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { getServerClient } from '../src/lib/supabase.js'

// ── Zetu Pay authorization key helper ────────────────────────────────────────
function createAuthorizationKey(amount, walletId) {
  const publicKey = process.env.ZETUPAY_PUBLIC_KEY
  const privateKey = process.env.ZETUPAY_SECRET_KEY

  if (!publicKey || !privateKey) {
    throw new Error('ZETUPAY_PUBLIC_KEY and ZETUPAY_SECRET_KEY are required')
  }

  const payload = {
    publicKey,
    privateKey,
    amount,
    walletId,
    timestamp: Date.now(),
  }

  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64')
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

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { phone, amount, userPhone } = req.body || {}
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
    const walletId = process.env.ZETUPAY_WALLET_ID
    if (!walletId) {
      throw new Error('ZETUPAY_WALLET_ID is required')
    }

    const baseUrl = process.env.ZETUPAY_BASE_URL || 'https://pay.zetupay.co.ke/api/v1'
    const redirectUrl = process.env.ZETUPAY_REDIRECT_URL ||
      ('https://' + (process.env.VERCEL_URL || 'localhost:3000'))
    const callbackUrl = process.env.ZETUPAY_CALLBACK_URL ||
      ('https://' + (process.env.VERCEL_URL || 'localhost:3000') + '/api/webhooks/zetupay')

    // Generate a unique reference (maps to PayKit request_id)
    const reference = crypto.randomUUID()

    // 1. Build authorization key (must be generated per-request)
    const authorizationKey = createAuthorizationKey(numAmount, walletId)

    // 2. Build the STK push request body per Zetu Pay spec
    const initBody = {
      authorizationKey,
      amount: numAmount,
      phoneNumber: normalPhone,
      reference,
      redirectUrl,
      currency: 'KES',
      identifier: userPhone,
      real: true,
    }

    const initUrl = `${baseUrl}/payment/initiate`

    // 3. Send STK push
    const initRes = await fetch(initUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initBody),
    })

    const initData = await initRes.json()

    console.log('Zetu Pay STK Response:', initRes.status, JSON.stringify(initData))

    // 4. Handle Zetu Pay error responses
    if (!initRes.ok || !initData?.success) {
      console.error('Zetu Pay STK error:', initRes.status, initData)

      const errorMessage = initData?.error || initData?.message || `Zetu Pay error: HTTP ${initRes.status}`

      return res.status(initRes.status || 500).json({
        success: false,
        message: errorMessage,
      })
    }

    // 5. Handle success (201 Created, status: "pending")
    return handleSuccess(res, supabase, initBody, initData, userPhone, reference)

  } catch (err) {
    console.error('STK Push error:', err.message, err.stack)
    return res.status(500).json({
      success: false,
      message: 'STK Push failed. Please try again.',
    })
  }
}

// ── Success handler ──────────────────────────────────────────────────────────
async function handleSuccess(res, supabase, initBody, initData, userPhone, reference) {
  const { paymentKey, waveTransactionId, checkoutUrl } = initData?.data || {}

  // Use reference as checkout_id (maps to PayKit request_id)
  const requestId = reference

  // Save deposit record for tracking
  const { data: deposit, error: depositError } = await supabase
    .rpc('insert_deposit', {
      p_user_phone: userPhone,
      p_amount: initBody.amount,
      p_checkout_id: requestId,
      p_method: 'stk',
    })

  if (depositError) {
    console.error('Deposit save failed:', depositError)
    // Don't fail the response — STK was sent, just log the DB issue
  }

  return res.status(200).json({
    success: true,
    requestId,
    checkoutRequestId: paymentKey || waveTransactionId || requestId,
    depositId: deposit?.deposit?.id,
    checkoutUrl,
    message: 'STK Push sent. Enter M-Pesa PIN on your phone.',
  })
}
