# PayKit M-Pesa STK Push Integration — Changes Summary

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `api/stk-push.js` | **Rewritten** | OAuth2 token flow + PayKit collection/stkpush body format |
| `api/stk-callback.js` | **Rewritten** | PayKit callback format parsing + dedupe by transaction_id |
| `api/stk-status.js` | **New** | Status polling endpoint for fallback/verification |
| `.env.example` | **Updated** | Removed PAYKIT_PASSKEY/PAYKIT_SHORTCODE, renamed to PAYKIT_CLIENT_ID/PAYKIT_CLIENT_SECRET |

---

## Key Changes Detail

### 1. `api/stk-push.js` — Complete Rewrite

**Before (Safaricom-style):**
- Auth: Basic auth with `PAYKIT_CONSUMER_KEY`/`PAYKIT_CONSUMER_SECRET` via Base64
- Auth URL: `{baseUrl}/oauth/v1/generate?grant_type=client_credentials`
- STK Body: `{ PhoneNumber, Amount, CallBackURL, AccountReference, TransactionDesc }`
- Success check: `ResponseCode === '0' || CheckoutRequestID`
- No `request_id` (idempotency key)

**After (PayKit-compliant):**
- Auth: OAuth2 POST to `{baseUrl}/v1/oauth/token` with `grant_type=client_credentials&client_id={PAYKIT_CLIENT_ID}&client_secret={PAYKIT_CLIENT_SECRET}`
- Token cached in memory, refreshed 60s before expiry (tokens expire ~900s)
- Auth URL: `{baseUrl}/v1/oauth/token` (POST, form-encoded)
- STK Body:
  ```json
  {
    "collection_channel": "Mpesa",
    "amount": 500,
    "phone_number": "254712345678",
    "account_reference": "DUMIROPAY",
    "remarks": "Dumiropay Deposit",
    "callback_url": "https://...",
    "request_id": "uuid-4"
  }
  ```
- Authorization: `Bearer {access_token}`
- Success check: HTTP 201 with `status: "INITIATED"`
- Request ID: UUID per request for idempotency
- Error handling: 401 retry with token refresh, 409 retry with new UUID, 400/500 pass through

**Env vars changed:**
| Old (removed) | New |
|---------------|-----|
| `PAYKIT_CONSUMER_KEY` | `PAYKIT_CLIENT_ID` |
| `PAYKIT_CONSUMER_SECRET` | `PAYKIT_CLIENT_SECRET` |
| `PAYKIT_PASSKEY` | _(removed — not needed)_ |
| `PAYKIT_SHORTCODE` | _(removed — not needed)_ |

### 2. `api/stk-callback.js` — Complete Rewrite

**Before (Safaricom format):**
- Parsed `body.Body.stkCallback.CheckoutRequestID`, `ResultCode`, `CallbackMetadata.Item`
- Checked `ResultCode === 0` for success

**After (PayKit format with legacy fallback):**
- Detects PayKit format: `body.service_code`, `body.transaction_id`, `body.status`
- Handles statuses: `SUCCESS`, `FAILED`, `PROCESSING`, `PENDING`
- Dedupes by `transaction_id` (in-memory Set + DB-level null check)
- On `SUCCESS`: stores `mpesa_receipt`, sets status `mpesa_confirmed`
- On `FAILED`: sets status `failed`
- On `PROCESSING`/`PENDING`: logs only (no status change)
- Legacy Safaricom format still handled gracefully for backward compat
- Always returns 200 OK immediately (required by PayKit)

### 3. `api/stk-status.js` — New File

- `POST /api/stk-status` with `{ "requestId": "<request_id>" }`
- Calls `POST {PAYKIT_BASE_URL}/v1/collection/stkpush/status`
- Authorization: `Bearer {access_token}`
- Body: `{ "request_id": "<request_id>" }`
- Token auto-refresh on 401
- Returns PayKit's status response to the client

### 4. `.env.example` — Updated

Removed lines referencing `PAYKIT_PASSKEY` and `PAYKIT_SHORTCODE`.
Renamed `PAYKIT_CONSUMER_KEY` → `PAYKIT_CLIENT_ID` and `PAYKIT_CONSUMER_SECRET` → `PAYKIT_CLIENT_SECRET`.
Removed outdated derived URL comments (auth/callback URLs are no longer derived — they're hardcoded per PayKit spec).

---

## Flags: Existing Code Still Assuming Passkey/Shortcode

1. **Frontend `src/pages/ProfilePage.jsx`** — The `initiateStkPush()` function at line 16 calls `/api/stk-push` with `{ phone, amount, userPhone }`. The API now expects the same fields plus optional `requestId`. The frontend call shape is compatible.

2. **`MPESA_PAYBILL` constant** in `src/lib/plans.js` — Still exports `4091165` for the manual paybill fallback. This is a user-facing reference shown when STK fails and the user must pay manually. This is correct behavior and should remain.

3. **`src/lib/db.js`** — The `addDeposit` helper stores `checkout_id`, `mpesa_receipt`, `status`, `method`. The API now stores `request_id` as `checkout_id`, which is compatible with the existing schema.

4. **`supabase-schema.sql`** — The `deposits` table has no `method`, `request_id`, or `transaction_id` columns defined in the schema file, but the app code already uses `method` via the `insert_deposit` RPC. No schema changes needed for this update.

5. **`vercel.json`** — No changes needed. The `/api/stk-status` route is automatically served by Vercel serverless functions from the `api/` directory.

---

## Vercel Environment Variables Required

| Variable | Value | Notes |
|----------|-------|-------|
| `PAYKIT_CLIENT_ID` | From PayKit dashboard | OAuth2 client ID |
| `PAYKIT_CLIENT_SECRET` | From PayKit dashboard | OAuth2 client secret |
| `PAYKIT_BASE_URL` | `https://api.sandbox.paykit.africa` | Or production URL |
| `PAYKIT_CALLBACK_URL` | `https://your-app.vercel.app/api/stk-callback` | Full public URL |

**Remove from Vercel:** `PAYKIT_PASSKEY`, `PAYKIT_SHORTCODE`, `PAYKIT_CONSUMER_KEY`, `PAYKIT_CONSUMER_SECRET`

---

## Error Handling Summary

| HTTP Status | Meaning | Handling |
|-------------|---------|----------|
| 201 | INITIATED | Success — return requestId to client |
| 400 | Bad request | Pass through PayKit's `{ "error": "..." }` |
| 401 | Unauthorized | Auto-retry with fresh token (once) |
| 409 | Duplicate request_id | Retry with new UUID (once) |
| 500 | Internal error | Generic error message to client |
