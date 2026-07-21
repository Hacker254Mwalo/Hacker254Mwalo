/**
 * PayKit STK Collection Callback
 *
 * PayKit sends a POST to this endpoint with the final transaction result.
 *
 * Expected PayKit callback body format:
 *   {
 *     "service_code": "PC2B",            // collections
 *     "transaction_id": "<unique>",       // PayKit transaction ID
 *     "request_id": "<your request_id>",  // idempotency key you sent
 *     "status": "SUCCESS | FAILED | PROCESSING | PENDING",
 *     "amount": 500,
 *     "phone_number": "254XXXXXXXXX",
 *     "mpesa_receipt": "SGR7ABCDEF",
 *     "account_reference": "DUMIROPAY",
 *     "remarks": "Dumiropay Deposit",
 *     "collection_channel": "Mpesa"
 *   }
 *
 * This handler:
 *   1. Returns 200 OK immediately (required by PayKit)
 *   2. Deduplicates using transaction_id
 *   3. Verifies the callback matches a PENDING deposit (prevents spoofed/duplicate callbacks)
 *   4. On SUCCESS: calls atomic_approve_deposit to credit balance atomically
 *   5. On FAILED: marks deposit as failed — no balance credit
 *   6. On PROCESSING/PENDING: no action needed
 */

import { getServerClient } from '../src/lib/supabase.js'

// In-memory dedupe set (per Vercel instance; also rely on DB-level check)
const processedTransactions = new Set()

export default async function handler(req, res) {
  // 1. Always respond 200 immediately to PayKit
  res.status(200).json({ received: true })

  try {
    console.log('stk-callback raw body:', JSON.stringify(req.body))

    const body = req.body || {}

    // ── PayKit format detection ──────────────────────────────────────────────
    // PayKit sends: { service_code, transaction_id, request_id, status, ... }
    // Safaricom-style sends: { Body: { stkCallback: { ... } } }
    const isPayKitFormat = body.service_code || body.transaction_id

    let transactionId, requestId, status, mpesaReceipt, amount, phoneNumber

    if (isPayKitFormat) {
      // PayKit format
      transactionId = body.transaction_id
      requestId = body.request_id
      status = body.status
      mpesaReceipt = body.mpesa_receipt || null
      amount = body.amount
      phoneNumber = body.phone_number

      console.log(`PayKit callback: tx=${transactionId}, req=${requestId}, status=${status}`)
    } else {
      // Legacy Safaricom format — still handle gracefully for backward compat
      const callback = body?.Body?.stkCallback
      if (!callback) {
        console.log('stk-callback: unrecognized format, full body:', JSON.stringify(body))
        return
      }
      const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = callback
      requestId = CheckoutRequestID
      status = ResultCode === 0 ? 'SUCCESS' : 'FAILED'
      const items = CallbackMetadata?.Item || []
      const getItem = (name) => items.find((i) => i.Name === name)?.Value
      mpesaReceipt = String(getItem('MpesaReceiptNumber') || '')
      amount = getItem('Amount')
      phoneNumber = String(getItem('PhoneNumber') || '')
      transactionId = CheckoutRequestID

      console.log(`Legacy callback: checkout=${CheckoutRequestID}, ResultCode=${ResultCode}, status=${status}`)
    }

    // ── Deduplicate by transaction_id ────────────────────────────────────────
    const dedupeKey = transactionId || requestId
    if (!dedupeKey) {
      console.warn('stk-callback: no transaction_id or request_id found')
      return
    }

    if (processedTransactions.has(dedupeKey)) {
      console.log(`stk-callback: duplicate detected for ${dedupeKey}, skipping`)
      return
    }
    processedTransactions.add(dedupeKey)

    // ── Get Supabase client ──────────────────────────────────────────────────
    const supabase = getServerClient(req.headers, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // ── Handle by status ─────────────────────────────────────────────────────
    switch (status) {
      case 'SUCCESS': {
        console.log(`STK Success: tx=${transactionId}, receipt=${mpesaReceipt}, amount=${amount}, phone=${phoneNumber}`)

        // VERIFY: Find a PENDING deposit matching this callback
        const { data: pendingDeposit, error: findError } = await supabase
          .from('deposits')
          .select('id, user_phone, amount, status')
          .eq('checkout_id', requestId || transactionId)
          .eq('status', 'pending')
          .single()

        if (findError || !pendingDeposit) {
          console.error('Callback verification failed: no matching PENDING deposit found', findError?.message)
          // Don't credit balance — no valid pending deposit to approve
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

        // Also save the M-Pesa receipt
        await supabase
          .from('deposits')
          .update({ mpesa_receipt: mpesaReceipt || transactionId })
          .eq('id', pendingDeposit.id)
          .is('mpesa_receipt', null)

        break
      }

      case 'FAILED': {
        console.log(`STK Failed: tx=${transactionId}, req=${requestId}`)

        // Mark the pending deposit as failed — no balance credit
        const { error: updateError } = await supabase
          .from('deposits')
          .update({
            status: 'failed',
            mpesa_receipt: `Failed: ${transactionId || requestId}`,
          })
          .eq('checkout_id', requestId || transactionId)
          .eq('status', 'pending')

        if (updateError) {
          console.error('Failed deposit update error:', updateError.message)
        }
        break
      }

      case 'PROCESSING':
        console.log(`STK Processing: tx=${transactionId}, req=${requestId}`)
        // Transaction is still being processed — no status change needed
        break

      case 'PENDING':
        console.log(`STK Pending: tx=${transactionId}, req=${requestId}`)
        // User hasn't responded yet — keep as pending
        break

      default:
        console.warn(`stk-callback: unknown status "${status}" for tx=${transactionId}`)
        break
    }

  } catch (err) {
    console.error('stk-callback error:', err.message, err.stack)
  }
}
