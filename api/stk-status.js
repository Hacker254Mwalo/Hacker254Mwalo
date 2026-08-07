/**
 * Vercel Serverless Function: PayKit STK Push Status Check
 *
 * Polls PayKit for the status of an initiated STK push collection.
 * Useful as a fallback when the callback hasn't arrived.
 *
 * POST {PAYKIT_BASE_URL}/v1/collection/stkpush/status
 * Body: { "request_id": "<your request_id>" }
 * Headers: Authorization: Bearer {access_token}
 *
 * Usage:
 *   POST /api/stk-status
 *   { "requestId": "<request_id from STK push response>" }
 *
 * Vercel Env Vars:
 *   PAYKIT_CLIENT_ID
 *   PAYKIT_CLIENT_SECRET
 *   PAYKIT_BASE_URL
 */

import { isIpRateLimited, rejectSuspiciousRequest, setNoStore } from './_lib/requestSecurity.js'

// ── In-memory token cache (shared with stk-push.js pattern) ─────────────────
let paykitToken = null
let paykitTokenExpiresAt = 0

async function getPayKitToken() {
  const now = Date.now()
  if (paykitToken && now < paykitTokenExpiresAt - 60_000) return paykitToken

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
    throw new Error('PayKit token fetch failed: no access_token in response')
  }

  paykitToken = authData.access_token
  paykitTokenExpiresAt = now + (authData.expires_in ? authData.expires_in * 1000 : 840_000)
  return paykitToken
}

// ── Error response helper ────────────────────────────────────────────────────
function paykitErrorResponse(res, status, paykitError) {
  const message = paykitError?.error || paykitError?.message || paykitError?.detail || `PayKit error: HTTP ${status}`
  return res.status(status).json({ success: false, message })
}

// ── Main handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  setNoStore(res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (rejectSuspiciousRequest(req, res)) return
  if (isIpRateLimited(req, 'stk-status', 30, 60_000)) {
    return res.status(429).json({ error: 'Too many requests. Wait a minute.' })
  }

  const { requestId } = req.body || {}
  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required' })
  }

  try {
    const accessToken = await getPayKitToken()
    if (!accessToken) {
      return res.status(500).json({ error: 'PayKit authentication failed' })
    }

    const baseUrl = process.env.PAYKIT_BASE_URL || 'https://api.sandbox.paykit.africa'
    const statusUrl = `${baseUrl}/v1/collection/stkpush/status`

    const statusRes = await fetch(statusUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ request_id: requestId }),
    })

    const statusData = await statusRes.json()

    console.log('PayKit STK Status:', statusRes.status, JSON.stringify(statusData))

    // Handle errors
    if (!statusRes.ok) {
      console.error('PayKit status check error:', statusRes.status, statusData)

      // Retry once on 401 (token refresh)
      if (statusRes.status === 401) {
        paykitToken = null
        paykitTokenExpiresAt = 0
        const retryToken = await getPayKitToken()
        if (retryToken) {
          const retryRes = await fetch(statusUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${retryToken}`,
            },
            body: JSON.stringify({ request_id: requestId }),
          })
          const retryData = await retryRes.json()
          if (retryRes.ok) {
            return res.status(200).json({ success: true, data: retryData })
          }
        }
      }

      return paykitErrorResponse(res, statusRes.status, statusData)
    }

    // Success — return the PayKit status response
    return res.status(200).json({
      success: true,
      data: statusData,
      status: statusData?.data?.status || statusData?.status || 'UNKNOWN',
    })

  } catch (err) {
    console.error('STK status check error:', err.message, err.stack)
    return res.status(500).json({
      success: false,
      message: 'Status check failed. Please try again.',
    })
  }
}
