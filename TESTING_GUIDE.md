# STK Push & Transaction Visibility Fix - Testing Guide

## Overview
This document outlines the fixes applied to resolve two critical issues:
1. **STK Push Not Working** - The missing `insert_deposit` RPC prevented deposit records from being created
2. **Admin Transaction Visibility** - The missing `transactions` table prevented the admin from seeing transaction records

## What Was Fixed

### Issue 1: STK Push Failure
**Root Cause:** The `stk-push.js` API handler called a non-existent RPC function `insert_deposit()`.

**Solution:** 
- Created the `insert_deposit()` RPC function in `20260721130100_add_insert_deposit_rpc.sql`
- This RPC now creates a pending deposit record when STK push is initiated
- Also creates a corresponding transaction record for audit trail

**Files Modified:**
- `supabase/migrations/20260721130100_add_insert_deposit_rpc.sql` (new)

### Issue 2: Admin Transaction Visibility
**Root Cause:** The `transactions` table was never created in the schema, and RPC functions were trying to insert into a non-existent table.

**Solution:**
- Created the `transactions` table in `supabase-schema.sql` with proper schema:
  - `id` (uuid, primary key)
  - `phone_number` (text, required)
  - `user_phone` (text, optional for normalization)
  - `type` (text: deposit, withdrawal, profit, investment)
  - `amount` (numeric)
  - `status` (text: completed, pending, failed)
  - `reference` (text: checkout_id, withdrawal_id, etc.)
  - `description` (text: human-readable description)
  - `created_at` (timestamptz)
- Added proper indexes for performance
- Updated all RPC functions to populate full transaction metadata

**Files Modified:**
- `supabase-schema.sql` (updated)
- `supabase/migrations/20260721130000_fix_stk_push_and_transactions.sql` (new)
- `supabase/migrations/20260721130200_update_rpcs_for_transactions.sql` (new)

## Testing Steps

### Step 1: Apply Migrations to Supabase
1. Go to your Supabase Dashboard → SQL Editor
2. Run `supabase-schema.sql` to create the transactions table
3. Run each migration file in order:
   - `20260721130000_fix_stk_push_and_transactions.sql`
   - `20260721130100_add_insert_deposit_rpc.sql`
   - `20260721130200_update_rpcs_for_transactions.sql`

### Step 2: Test STK Push Flow
1. **User initiates deposit:**
   - Go to Profile → Deposit via M-Pesa
   - Enter amount (min KSh 400)
   - Click "Pay Now"

2. **Verify deposit record created:**
   - Check Supabase Dashboard → deposits table
   - Should see a new row with:
     - `status: 'pending'`
     - `method: 'stk'`
     - `checkout_id: <UUID from PayKit>`

3. **Verify transaction record created:**
   - Check Supabase Dashboard → transactions table
   - Should see a new row with:
     - `type: 'deposit'`
     - `status: 'pending'`
     - `description: 'STK Push Initiated'`
     - `reference: <checkout_id>`

4. **Complete M-Pesa payment:**
   - Enter M-Pesa PIN on phone
   - Payment should succeed

5. **Verify callback processed:**
   - Check deposits table: status should change to `'approved'`
   - Check transactions table: should see new row with `status: 'completed'` and M-Pesa receipt

### Step 3: Test Admin Transaction Visibility
1. **Login as admin**
2. **Navigate to Admin Panel → Transactions tab**
3. **Verify transactions are visible:**
   - Should see all transactions (deposits, withdrawals, profits, investments)
   - Each transaction should show:
     - User phone number
     - Transaction type (deposit/withdrawal/profit/investment)
     - Amount
     - Status
     - Date/time
     - Reference code (if applicable)

4. **Test transaction filtering:**
   - Transactions should be sortable by date
   - Should be able to delete individual transactions (for testing)

### Step 4: Test Other Balance-Changing Operations
1. **Investment Creation:**
   - User invests in a plan
   - Check transactions table: should see `type: 'investment'` record

2. **Daily Profits:**
   - Wait for daily profit calculation (or manually trigger via `/api/daily-profits`)
   - Check transactions table: should see `type: 'profit'` records

3. **Withdrawal:**
   - User requests withdrawal
   - Check transactions table: should see `type: 'withdrawal'` record with pending status
   - Admin approves withdrawal
   - Transaction status should remain 'pending' (withdrawal not yet sent)

## Verification Checklist

- [ ] `transactions` table exists in Supabase with all required columns
- [ ] `insert_deposit` RPC function is callable
- [ ] STK push creates deposit records with `method: 'stk'`
- [ ] STK push creates transaction records with `type: 'deposit'`
- [ ] Admin can see all transactions in the Transactions tab
- [ ] Transactions show complete metadata (type, user_phone, reference, description)
- [ ] Daily profit calculation creates transaction records
- [ ] Investment creation creates transaction records
- [ ] Withdrawal creation creates transaction records
- [ ] All transaction records have proper timestamps

## Rollback Instructions (if needed)
If you need to rollback these changes:

1. Delete the three new migration files:
   - `supabase/migrations/20260721130000_fix_stk_push_and_transactions.sql`
   - `supabase/migrations/20260721130100_add_insert_deposit_rpc.sql`
   - `supabase/migrations/20260721130200_update_rpcs_for_transactions.sql`

2. Revert `supabase-schema.sql` to its previous version

3. In Supabase Dashboard, drop the `transactions` table and `insert_deposit` RPC function

## Additional Notes

### Transaction Audit Trail
The `transactions` table now serves as a complete audit trail for all balance-changing operations. Each transaction includes:
- **phone_number / user_phone**: Who the transaction affects
- **type**: What kind of transaction (deposit, withdrawal, profit, investment)
- **amount**: How much was involved
- **status**: Current state (completed, pending, failed)
- **reference**: Link to the source record (deposit_id, withdrawal_id, investment_id, etc.)
- **description**: Human-readable explanation
- **created_at**: When it happened

### Performance Optimization
Indexes have been added on:
- `phone_number` - for querying user's transactions
- `user_phone` - for normalized lookups
- `status` - for filtering by status
- `created_at` - for sorting by date

## Support
If you encounter any issues:
1. Check the Supabase logs for RPC execution errors
2. Verify all migration files were applied successfully
3. Ensure the `transactions` table schema matches the documentation
4. Check that the `insert_deposit` RPC function exists and is callable
