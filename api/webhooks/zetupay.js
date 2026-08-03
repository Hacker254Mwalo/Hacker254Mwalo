/**
 * Vercel Serverless Function: Zetu Pay Webhook Callback
 *
 * Zetu Pay sends a POST to this endpoint with the final transaction result.
 * Authentication is via the `x-zetupay-secret` header containing the private key.
 *
 * Expected Zetu Pay webhook body format:
 *   {
 *     "event": "payment.success" | "payment.failed" | "payment.cancelled",
 *     "signature": "...",
 *     "data": {
 *       "amount": 1500,
 *       "gross": 1500,
 *       "fee": 22.5,
 *       "net": 1477.5,
 *       "phoneNumber": "254712345678",
 *       "receiptNumber": "RHS98JJK3",
 *       "transactionDate": "12.07.2026 15:12:02",
 *       "status": "success",
 *       "paymentMethod": "M-Pesa STK",
 *       "waveTransactionId": "WP-ZETU94A-B84D",
 *       "checkoutRequestId": "ws_CO_12072026151037_10948",
 *       "merchantRequestId": "10492-2947-194",
 *       "mpesaResultCode": 0,
 *       "reference": "<your reference from initiate>",
 *       "identifier": "<your identifier>",
 *       "real": true
 *     }
 *   }
 *
 * This handler:
 *   1. Verifies x-zetupay-secret header matches ZETUPAY_SECRET_KEY
 *   2. Returns 200 OK immediately (required by Zetu Pay)
 *   3. Deduplicates using waveTransactionId
 *   4. Verifies the callback matches a PENDING deposit (prevents spoofed/duplicate callbacks)
 *   5. On payment.success: calls atomic_approve_deposit to credit balance atomically
 *   6. On payment.failed: marks deposit as failed — no balance credit
 *   7. On payment.cancelled: marks deposit as cancelled — no balance credit
 *
 * Vercel Env Vars:
 *   ZETUPAY_SECRET_KEY              — API private key for webhook verification
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { getServerClient } from '../../src/lib/supabase.js'

// In-memory dedupe set (per Vercel instance; also rely on DB-level check)
const processedTransactions = new Set()

export default async function handler(req, res) {
  // 1. Always respond 200 immediately to Zetu Pay
  res.status(200).json({ received: true })

  try {
    console.log('zetupay-webhook raw body:', JSON.stringify(req.body))

    // ── Verify authenticity ──────────────────────────────────────────────────
    const secret = req.headers['x-zetupay-secret']
    if (!secret || secret !== process.env.ZETUPAY_SECRET_KEY) {
      console.warn('zetupay-webhook: invalid or missing x-zetupay-secret header')
      return
    }

    const body = req.body || {}
    const { event, data } = body

    if (!event || !data) {
      console.warn('zetupay-webhook: missing event or data fields')
      return
    }

    const {
      waveTransactionId,
      reference,
      amount,
      receiptNumber,
      phoneNumber,
      status: zetupayStatus,
      real,
    } = data

    console.log(`Zetu Pay webhook: event=${event}, tx=${waveTransactionId}, ref=${reference}, status=${zetupayStatus}`)

    // ── Only process real (non-sandbox) transactions ─────────────────────────
    // In production, you may want to gate this behind env check instead
    // For now we process all webhooks (sandbox webhooks have real=false)
    if (real === false) {
      console.log('zetupay-webhook: sandbox transaction skipped (real=false)')
      return
    }

    // ── Deduplicate by waveTransactionId ─────────────────────────────────────
    const dedupeKey = waveTransactionId || reference
    if (!dedupeKey) {
      console.warn('zetupay-webhook: no waveTransactionId or reference found')
      return
    }

    if (processedTransactions.has(dedupeKey)) {
      console.log(`zetupay-webhook: duplicate detected for ${dedupeKey}, skipping`)
      return
    }
    processedTransactions.add(dedupeKey)

    // ── Get Supabase client ──────────────────────────────────────────────────
    const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // ── Handle by event ──────────────────────────────────────────────────────
    switch (event) {
      case 'payment.success': {
        console.log(
          `Zetu Pay Success: tx=${waveTransactionId}, ref=${reference}, receipt=${receiptNumber}, amount=${amount}, phone=${phoneNumber}`
        )

        // VERIFY: Find a PENDING deposit matching this webhook
        // Match by reference (which is the same value stored as checkout_id)
        const { data: pendingDeposit, error: findError } = await supabase
          .from('deposits')
          .select('id, user_phone, amount, status')
          .eq('checkout_id', reference)
          .eq('status', 'pending')
          .single()

        if (findError || !pendingDeposit) {
          console.error('Webhook verification failed: no matching PENDING deposit found', findError?.message)
          // Don't credit balance — no valid pending deposit to approve
          break
        }

        // Verify amount matches (prevents spoofed callbacks)
        if (Number(pendingDeposit.amount) !== Number(amount)) {
          console.error(
            `Amount mismatch: deposit=${pendingDeposit.amount}, webhook=${amount}. Skipping.`
          )
          break
        }

        console.log(`Verified deposit: id=${pendingDeposit.id}, phone=${pendingDeposit.user_phone}, amount=${pendingDeposit.amount}`)

        // Atomically: approve deposit + credit balance + insert transaction
        const { error: approveError } = await supabase.rpc('atomic_approve_deposit', {
          p_deposit_id: pendingDeposit.id,
          p_user_phone: pendingDeposit.user_phone,
          p_amount: Number(pendingDeposit.amount),
        })

        if (approveError) {
          console.error('atomic_approve_deposit failed:', approveError.message)
        } else {
          console.log(`Deposit approved & balance credited: deposit_id=${pendingDeposit.id}`)
        }

        // Also save the M-Pesa receipt and Zetu Pay metadata
        await supabase
          .from('deposits')
          .update({
            mpesa_receipt: receiptNumber || waveTransactionId,
            status: 'approved',
          })
          .eq('id', pendingDeposit.id)
          .eq('status', 'approved')  // double-check: atomic_approve_deposit already set it
          .is('mpesa_receipt', null)

        break
      }

      case 'payment.failed': {
        console.log(`Zetu Pay Failed: tx=${waveTransactionId}, ref=${reference}`)

        // Mark the pending deposit as failed — no balance credit
        const { error: updateError } = await supabase
          .from('deposits')
          .update({
            status: 'failed',
            mpesa_receipt: `Failed: ${waveTransactionId || reference}`,
          })
          .eq('checkout_id', reference)
          .eq('status', 'pending')

        if (updateError) {
          console.error('Failed deposit update error:', updateError.message)
        }
        break
      }

      case 'payment.cancelled': {
        console.log(`Zetu Pay Cancelled: tx=${waveTransactionId}, ref=${reference}`)

        // Mark the pending deposit as cancelled — no balance credit
        const { error: updateError } = await supabase
          .from('deposits')
          .update({
            status: 'cancelled',
            mpesa_receipt: `Cancelled: ${waveTransactionId || reference}`,
          })
          .eq('checkout_id', reference)
          .eq('status', 'pending')

        if (updateError) {
          console.error('Cancelled deposit update error:', updateError.message)
        }
        break
      }

      default:
        console.warn(`zetupay-webhook: unknown event "${event}" for tx=${waveTransactionId}`)
        break
    }

  } catch (err) {
    console.error('zetupay-webhook error:', err.message, err.stack)
  }
}
