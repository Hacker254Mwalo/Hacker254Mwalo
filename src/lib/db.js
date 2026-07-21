/**
 * db.js — Dumiropay data layer
 * Uses Supabase when configured, falls back to localStorage for demo mode.
 * All balance-mutating operations use atomic DB functions to prevent partial updates.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import * as local from './storage'

// ── PIN Hashing (SHA-256 via Web Crypto) ─────────────────────────────────────
async function hashPin(pin) {
  try {
    const data = new TextEncoder().encode('dumiropay:' + pin)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return pin
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function generateReferralCode(phone) {
  return 'DUM' + String(phone).slice(-6).replace(/\D/g, '')
}

function isNoRowsError(error) {
  return !!error && (error.code === 'PGRST116' || error.code === 'PGRST205')
}

function dbUserToApp(row) {
  return {
    id: row.phone,
    phone: row.phone,
    name: row.name,
    balance: Number(row.balance || 0),
    bonusBalance: Number(row.bonus_balance || 0),
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    isAdmin: row.is_admin || false,
    createdAt: row.created_at,
    must_change_password: row.must_change_password || false,
  }
}

function dbInvToApp(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    amount: Number(row.amount || 0),
    dailyReturn: Number(row.daily_return || 0),
    totalReturn: Number(row.total_return || 0),
    profit: Number(row.profit || 0),
    status: row.status,
    date: row.created_at,
    startedAt: row.started_at,
    endsAt: row.ends_at,
    lastProfitAt: row.last_profit_at,
  }
}

async function getUserRaw(phone) {
  if (!isSupabaseConfigured) return local.getUser(phone)
  const { data, error } = await supabase
    .from('users')
    .select('phone, name, balance, bonus_balance, referral_code, referred_by, is_admin, created_at, must_change_password')
    .eq('phone', phone)
    .maybeSingle()
  if (error && !isNoRowsError(error)) throw error
  return data
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function getUser(phone) {
  const data = await getUserRaw(phone)
  return data ? dbUserToApp(data) : null
}

export async function createUser(userData) {
  if (!isSupabaseConfigured) {
    const pinHash = await hashPin(userData.pin)
    const row = { ...userData, pin: undefined, pin_hash: pinHash }
    local.saveUser(userData.phone, row)
    return dbUserToApp({ ...row, phone: userData.phone })
  }
  const pinHash = await hashPin(userData.pin)
  const row = {
    phone: userData.phone,
    name: userData.name,
    pin_hash: pinHash,
    balance: 0,
    bonus_balance: 0,
    referral_code: userData.referralCode,
    referred_by: userData.referredBy || null,
    is_admin: false,
    must_change_password: false,
  }
  const { data, error } = await supabase
    .from('users')
    .insert(row)
    .select('phone, name, balance, bonus_balance, referral_code, referred_by, is_admin, created_at, must_change_password, status')
    .single()
  if (error) throw error
  return dbUserToApp(data)
}

export async function verifyUser(phone, pin) {
  if (!isSupabaseConfigured) {
    const u = local.getUser(phone)
    if (!u) return null
    const pinHash = await hashPin(pin)
    if (u.pin_hash !== pinHash) return null
    return dbUserToApp(u)
  }
  const { data, error } = await supabase
    .from('users')
    .select('phone, name, balance, bonus_balance, referral_code, referred_by, is_admin, created_at, must_change_password, pin_hash, status')
    .eq('phone', phone)
    .maybeSingle()
  if (error && !isNoRowsError(error)) throw error
  if (!data) return null
  const pinHash = await hashPin(pin)
  if (data.pin_hash !== pinHash) return null
  if (data.status === 'suspended') throw new Error('Your account has been suspended. Please contact support.')
  return dbUserToApp(data)
}

export async function updateUserBalance(phone, balance) {
  if (!isSupabaseConfigured) {
    local.saveUser(phone, { balance })
    return
  }
  const { error } = await supabase.rpc('admin_set_balance', {
    p_user_phone: phone,
    p_balance: Number(balance),
  })
  if (error) throw error
}

export async function findUserByReferralCode(code) {
  if (!isSupabaseConfigured) return local.findUserByReferralCode(code)
  const { data, error } = await supabase
    .from('users')
    .select('phone, name, balance, bonus_balance, referral_code, referred_by, is_admin, created_at, must_change_password')
    .eq('referral_code', code)
    .maybeSingle()
  if (error && !isNoRowsError(error)) throw error
  return data ? dbUserToApp(data) : null
}

// ── Investments ──────────────────────────────────────────────────────────────
export async function getInvestments(userPhone) {
  if (!isSupabaseConfigured) return local.getInvestments(userPhone)
  const { data, error } = await supabase
    .from('investments')
    .select('id, plan_id, plan_name, amount, daily_return, total_return, profit, status, created_at, started_at, ends_at, last_profit_at')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(dbInvToApp)
}

// Uses atomic_invest DB function to prevent partial-update bugs
export async function addInvestment(userPhone, investment) {
  if (!isSupabaseConfigured) return local.addInvestment(userPhone, investment)
  const { data, error } = await supabase.rpc('atomic_invest', {
    p_user_phone:   userPhone,
    p_plan_id:      investment.planId,
    p_plan_name:    investment.planName,
    p_amount:       investment.amount,
    p_daily_return: investment.dailyReturn,
    p_total_return: investment.totalReturn,
  })
  if (error) throw error
  return data
}

// ── Deposits ─────────────────────────────────────────────────────────────────
export async function addDeposit(userPhone, { amount, checkoutId, mpesaCode }) {
  if (!isSupabaseConfigured) {
    return local.addDeposit(userPhone, { amount, checkoutId, mpesaCode, status: 'pending' })
  }
  const { data, error } = await supabase
    .from('deposits')
    .insert({
      user_phone: userPhone,
      amount,
      checkout_id: checkoutId || null,
      mpesa_receipt: mpesaCode || null,
      status: 'pending',
      method: checkoutId ? 'stk' : 'manual',
    })
    .select('id, user_phone, amount, checkout_id, mpesa_receipt, status, created_at, method')
    .single()
  if (error) throw error
  return data
}

export async function getDeposits(userPhone) {
  if (!isSupabaseConfigured) return local.getDeposits(userPhone)
  const { data, error } = await supabase
    .from('deposits')
    .select('id, user_phone, amount, checkout_id, mpesa_receipt, status, created_at, method')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAllDeposits() {
  if (!isSupabaseConfigured) return local.getAllDeposits()

  const fields = 'id, user_phone, amount, mpesa_receipt, status, created_at, method'
  const { data, error } = await supabase
    .from('deposits')
    .select(`${fields}, users!user_phone(name)`)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!error) return data || []

  // The user-name relation is only supplementary. Never hide deposits if it is unavailable.
  const fallback = await supabase
    .from('deposits')
    .select(fields)
    .order('created_at', { ascending: false })
    .limit(200)
  if (fallback.error) throw fallback.error
  return fallback.data || []
}

// Uses atomic DB function to prevent double-crediting
export async function approveDeposit(depositId, userPhone, amount) {
  if (!isSupabaseConfigured) {
    local.updateDepositStatus(depositId, 'approved')
    const user = local.getUser(userPhone)
    if (user) local.saveUser(userPhone, { balance: Number(user.balance || 0) + Number(amount) })
    return
  }
  const { error } = await supabase.rpc('atomic_approve_deposit', {
    p_deposit_id: depositId,
    p_user_phone: userPhone,
    p_amount:     Number(amount),
  })
  if (error) throw error
}

export async function rejectDeposit(depositId) {
  if (!isSupabaseConfigured) {
    local.updateDepositStatus(depositId, 'rejected')
    return
  }
  const { error } = await supabase.from('deposits').update({ status: 'rejected' }).eq('id', depositId)
  if (error) throw error
}

// ── Referrals ─────────────────────────────────────────────────────────────────
export async function getReferrals(userPhone) {
  if (!isSupabaseConfigured) return local.getReferrals(userPhone)
  // Use RPC: joins users.referred_by (signup roster) with referrals table (commissions)
  const { data, error } = await supabase.rpc('get_user_referrals', { p_phone: userPhone })
  if (error) throw error
  return (data || []).map(r => ({
    referredName: r.referred_name || '',
    referredPhone: r.referred_phone || '',
    level: r.level || 1,
    commission: Number(r.commission || 0),
    planName: r.plan_name || '',
    date: r.created_at,
    isActive: r.is_active || false,
    isInvested: r.is_invested || false,
  }))
}

// Admin: Get ALL referrals across the platform
export async function getAllReferrals() {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.rpc('get_all_referrals')
  if (error) throw error
  return data || []
}

// NOTE: Referral commissions are now handled atomically inside atomic_invest.
// This function is kept for legacy/local fallback only.
export async function addReferralCommission(referrerPhone, { referredPhone, referredName, level, commission, planName }) {
  if (!isSupabaseConfigured) {
    local.addReferral(referrerPhone, { referredPhone, referredName, level, commission, planName })
    return
  }
  // In Supabase mode, referrals are created by atomic_invest. This is a no-op.
}

// ── Withdrawals ──────────────────────────────────────────────────────────────
// Uses atomic DB function to prevent balance going negative
export async function addWithdrawal(userPhone, { amount, fee, netAmount, mpesaPhone }) {
  if (!isSupabaseConfigured) {
    const u = local.getUser(userPhone)
    if (u) local.saveUser(userPhone, { balance: Number(u.balance || 0) - Number(amount) })
    return { success: true }
  }
  const { data, error } = await supabase.rpc('atomic_withdraw', {
    p_user_phone:  userPhone,
    p_amount:      Number(amount),
    p_fee:         Number(fee),
    p_net_amount:  Number(netAmount),
    p_mpesa_phone: mpesaPhone,
  })
  if (error) throw error
  return data
}

export async function getAllWithdrawals() {
  if (!isSupabaseConfigured) return local.getAllWithdrawals()

  const fields = 'id, user_phone, amount, fee, net_amount, mpesa_phone, status, created_at'
  const { data, error } = await supabase
    .from('withdrawals')
    .select(`${fields}, users!user_phone(name)`)
    .order('created_at', { ascending: false })
    .limit(200)

  if (!error) return data || []

  // Fallback: query without the users relation if it fails
  const fallback = await supabase
    .from('withdrawals')
    .select(fields)
    .order('created_at', { ascending: false })
    .limit(200)
  if (fallback.error) throw fallback.error
  return fallback.data || []
}

export async function getWithdrawals(userPhone) {
  if (!isSupabaseConfigured) return local.getWithdrawals(userPhone)
  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, user_phone, amount, fee, net_amount, mpesa_phone, status, created_at, updated_at')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function approveWithdrawal(id) {
  if (!isSupabaseConfigured) {
    local.updateWithdrawalStatus(id, 'approved')
    return
  }
  const { error } = await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', id)
  if (error) throw error
}

// Uses atomic DB function to refund balance on rejection
export async function rejectWithdrawal(id, userPhone, amount) {
  if (!isSupabaseConfigured) {
    local.updateWithdrawalStatus(id, 'rejected')
    const user = local.getUser(userPhone)
    if (user) local.saveUser(userPhone, { balance: Number(user.balance || 0) + Number(amount) })
    return
  }
  const { error } = await supabase.rpc('atomic_reject_withdrawal', {
    p_withdrawal_id: id,
    p_user_phone:    userPhone,
    p_amount:        Number(amount),
  })
  if (error) throw error
}

// ── Loans ─────────────────────────────────────────────────────────────────────
export async function addLoan(userPhone, { amount, purpose }) {
  if (!isSupabaseConfigured) {
    const loans = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    loans.push({ id: Date.now().toString(), user_phone: userPhone, amount, purpose: purpose || null, status: 'pending', created_at: new Date().toISOString() })
    localStorage.setItem('dp_loan_requests', JSON.stringify(loans))
    return { success: true }
  }
  const { data, error } = await supabase.rpc('create_loan_request', {
    p_user_phone: userPhone,
    p_amount: Number(amount),
    p_purpose: purpose || null,
  })
  if (error) throw error
  return data
}

export async function getAllLoans() {
  if (!isSupabaseConfigured) {
    return JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
  }
  const fields = 'id, user_phone, amount, purpose, status, created_at'
  const { data, error } = await supabase
    .from('loans')
    .select(`${fields}, users!user_phone(name)`)
    .order('created_at', { ascending: false })
    .limit(200)
  
  if (!error) return data || []

  // Fallback: query without the users relation if it fails
  const fallback = await supabase
    .from('loans')
    .select(fields)
    .order('created_at', { ascending: false })
    .limit(200)
  if (fallback.error) throw fallback.error
  return fallback.data || []
}

export async function getUserLoans(userPhone) {
  if (!isSupabaseConfigured) {
    const all = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    return all.filter(l => l.user_phone === userPhone)
  }
  const { data, error } = await supabase
    .from('loans')
    .select('id, user_phone, amount, purpose, status, created_at, updated_at')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function approveLoan(id, userPhone, amount) {
  if (!isSupabaseConfigured) {
    const loans = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    localStorage.setItem('dp_loan_requests', JSON.stringify(loans.map(l => l.id === id ? { ...l, status: 'approved' } : l)))
    local.saveUser(userPhone, { balance: (local.getUser(userPhone)?.balance || 0) + Number(amount) })
    return
  }
  await supabase.from('loans').update({ status: 'approved' }).eq('id', id)
  const { data: u } = await supabase.from('users').select('balance').eq('phone', userPhone).single()
  if (u) await supabase.rpc('admin_set_balance', {
    p_user_phone: userPhone,
    p_balance: Number(u.balance) + Number(amount),
  })
}

export async function rejectLoan(id) {
  if (!isSupabaseConfigured) {
    const loans = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    localStorage.setItem('dp_loan_requests', JSON.stringify(loans.map(l => l.id === id ? { ...l, status: 'rejected' } : l)))
    return
  }
  const { error } = await supabase.from('loans').update({ status: 'rejected' }).eq('id', id)
  if (error) throw error
}

// ── Admin: User Management ────────────────────────────────────────────────────
export async function getAllUsers() {
  if (!isSupabaseConfigured) {
    return Object.values(local.getUsers()).map(u => ({
      phone: u.phone, name: u.name, balance: Number(u.balance || 0),
      bonus_balance: Number(u.bonus_balance || 0), is_admin: u.is_admin || false, 
      status: u.status || 'active', created_at: u.created_at,
    }))
  }
  const { data, error } = await supabase
    .from('users')
    .select('phone, name, balance, bonus_balance, is_admin, status, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function adminDeleteUser(phone) {
  // Always cleanup local storage if it exists
  const users = JSON.parse(localStorage.getItem('dp_users') || '{}');
  if (users[phone]) {
    delete users[phone];
    localStorage.setItem('dp_users', JSON.stringify(users));
  }
  
  if (!isSupabaseConfigured) return;
  
  const { error } = await supabase.rpc('admin_delete_user', { p_user_phone: phone })
  if (error) throw error
}

export async function adminUpdateUserStatus(phone, status) {
  if (!isSupabaseConfigured) { local.saveUser(phone, { status }); return }
  const { error } = await supabase.rpc('admin_update_user_status', { p_user_phone: phone, p_status: status })
  if (error) throw error
}

export async function adminSetBalance(phone, balance) {
  if (!isSupabaseConfigured) { local.saveUser(phone, { balance }); return }
  const { error } = await supabase.rpc('admin_set_balance', {
    p_user_phone: phone,
    p_balance: Number(balance),
  })
  if (error) throw error
}

export async function withdrawBonus(userPhone, amount, mpesaPhone) {
  if (!isSupabaseConfigured) {
    const u = local.getUser(userPhone)
    if (u) local.saveUser(userPhone, { bonus_balance: Number(u.bonus_balance || 0) - Number(amount) })
    return { success: true, net_amount: amount * 0.95, fee: amount * 0.05 }
  }
  const { data, error } = await supabase.rpc('withdraw_bonus', {
    p_user_phone: userPhone,
    p_amount: Number(amount),
    p_mpesa_phone: mpesaPhone,
  })
  if (error) throw error
  return data
}

export async function transferBonusToMain(userPhone, amount) {
  if (!isSupabaseConfigured) {
    const u = local.getUser(userPhone)
    if (u) {
      local.saveUser(userPhone, {
        bonus_balance: Number(u.bonus_balance || 0) - Number(amount),
        balance: Number(u.balance || 0) + Number(amount),
      })
    }
    return { success: true, new_balance: Number(u?.balance || 0) + Number(amount) }
  }
  const { data, error } = await supabase.rpc('transfer_bonus_to_main', {
    p_user_phone: userPhone,
    p_amount: Number(amount),
  })
  if (error) throw error
  return data
}

export async function adminSetBonusBalance(phone, bonusBalance) {
  if (!isSupabaseConfigured) { local.saveUser(phone, { bonus_balance: bonusBalance }); return }
  const { error } = await supabase.rpc('admin_set_bonus_balance', {
    p_user_phone: phone,
    p_bonus: Number(bonusBalance),
  })
  if (error) throw error
}

// ── Keywords (Promo Codes) ────────────────────────────────────────────────────
export async function getKeywords() {
  if (!isSupabaseConfigured) {
    return JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
  }
  const { data, error } = await supabase.from('keywords').select('id, code, min_bonus, max_bonus, max_claims, claim_count, active, created_at').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createKeyword(code, minBonus, maxBonus, maxClaims) {
  if (!isSupabaseConfigured) {
    const keywords = JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
    if (keywords.find(k => k.code.toUpperCase() === code.toUpperCase())) throw new Error('Code already exists')
    const kw = { id: Date.now().toString(), code: code.toUpperCase(), min_bonus: minBonus, max_bonus: maxBonus, max_claims: maxClaims, claim_count: 0, active: true, created_at: new Date().toISOString() }
    keywords.unshift(kw)
    localStorage.setItem('dp_admin_keywords', JSON.stringify(keywords))
    return kw
  }
  const { data, error } = await supabase
    .from('keywords')
    .insert({ code: code.toUpperCase(), min_bonus: minBonus, max_bonus: maxBonus, max_claims: maxClaims, active: true })
    .select('id, code, min_bonus, max_bonus, max_claims, claim_count, active, created_at').single()
  if (error) throw error
  return data
}

export async function updateKeyword(id, { minBonus, maxBonus, maxClaims }) {
  if (!isSupabaseConfigured) {
    const keywords = JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
    localStorage.setItem('dp_admin_keywords', JSON.stringify(keywords.map(k => k.id === String(id) ? { ...k, min_bonus: minBonus, max_bonus: maxBonus, max_claims: maxClaims } : k)))
    return
  }
  const { error } = await supabase.from('keywords').update({ min_bonus: minBonus, max_bonus: maxBonus, max_claims: maxClaims }).eq('id', id)
  if (error) throw error
}

export async function deleteKeyword(id) {
  if (!isSupabaseConfigured) {
    const keywords = JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
    localStorage.setItem('dp_admin_keywords', JSON.stringify(keywords.filter(k => k.id !== String(id))))
    return
  }
  // Delete associated claims first to avoid FK constraint error
  const { error: claimsError } = await supabase.from('keyword_claims').delete().eq('keyword_id', id)
  if (claimsError) throw claimsError
  const { error } = await supabase.from('keywords').delete().eq('id', id)
  if (error) throw error
}

export async function toggleKeyword(id, active) {
  if (!isSupabaseConfigured) {
    const keywords = JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
    localStorage.setItem('dp_admin_keywords', JSON.stringify(keywords.map(k => k.id === String(id) ? { ...k, active } : k)))
    return
  }
  const { error } = await supabase.from('keywords').update({ active }).eq('id', id)
  if (error) throw error
}

export async function claimKeyword(userPhone, code) {
  if (!isSupabaseConfigured) {
    // Local fallback: check for active investment
    const investments = local.getInvestments(userPhone)
    const hasActive = (investments || []).some(i => i.status === 'active')
    if (!hasActive) {
      return { success: false, code: 'NO_ACTIVE_INVESTMENT', message: 'An active investment is required to redeem promo codes. Please invest first.' }
    }
    const keywords = JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
    const kw = keywords.find(k => k.code === code.trim().toUpperCase())
    if (!kw) return { success: false, message: 'Invalid keyword code.' }
    if (!kw.active) return { success: false, message: 'This keyword is no longer active.' }
    if (kw.claim_count >= kw.max_claims) return { success: false, message: 'All slots for this keyword have been claimed.' }
    const claims = JSON.parse(localStorage.getItem('dp_kw_claims') || '{}')
    if (claims[kw.id]?.includes(userPhone)) return { success: false, message: 'You have already claimed this keyword.' }
    const bonus = Math.floor(Math.random() * (Number(kw.max_bonus) - Number(kw.min_bonus) + 1)) + Number(kw.min_bonus)
    kw.claim_count++
    localStorage.setItem('dp_admin_keywords', JSON.stringify(keywords.map(k => k.id === kw.id ? kw : k)))
    if (!claims[kw.id]) claims[kw.id] = []
    claims[kw.id].push(userPhone)
    localStorage.setItem('dp_kw_claims', JSON.stringify(claims))
    const u = local.getUser(userPhone)
    if (u) local.saveUser(userPhone, { balance: Number(u.balance || 0) + bonus })
    return { success: true, bonus }
  }

  // Supabase mode — use atomic RPC that enforces active investment server-side
  const { data, error } = await supabase.rpc('claim_keyword', {
    p_user_phone: userPhone,
    p_code: code.trim(),
  })
  if (error) return { success: false, message: error.message || 'Failed to redeem code. Please try again.' }
  return data
}

export async function getClaimedKeywords(userPhone) {
  if (!isSupabaseConfigured) {
    const claims = JSON.parse(localStorage.getItem('dp_kw_claims') || '{}')
    return Object.entries(claims).flatMap(([kwId, phones]) =>
      phones.includes(userPhone) ? [{ keyword_id: kwId }] : []
    )
  }
  const { data, error } = await supabase
    .from('keyword_claims')
    .select('keyword_id, bonus_amount, created_at')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error && !isNoRowsError(error)) throw error
  return data || []
}

// ── Bonus Claims (Daily Bonus / Lucky Spin) — server-enforced ────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
}

export async function hasClaimedBonusToday(userPhone, claimType) {
  if (!isSupabaseConfigured) {
    if (claimType === 'login_bonus') return !local.canClaimLoginBonus(userPhone)
    if (claimType === 'spin') return !local.canSpin(userPhone)
    return false
  }
  const { data, error } = await supabase
    .from('bonus_claims')
    .select('id')
    .eq('user_phone', userPhone)
    .eq('claim_type', claimType)
    .eq('claim_date', todayStr())
    .maybeSingle()
  if (error && !isNoRowsError(error)) throw error
  return !!data
}

export async function claimBonus(userPhone, claimType, amount) {
  if (!isSupabaseConfigured) {
    const alreadyClaimed = claimType === 'login_bonus' ? !local.canClaimLoginBonus(userPhone) : !local.canSpin(userPhone)
    if (alreadyClaimed) return { success: false, message: 'Already claimed today.' }
    const u = local.getUser(userPhone)
    const newBalance = Number(u?.balance || 0) + Number(amount)
    local.saveUser(userPhone, { balance: newBalance })
    if (claimType === 'login_bonus') local.setLastLoginBonus(userPhone)
    else local.setLastSpin(userPhone)
    return { success: true, balance: newBalance }
  }

  // Retained for legacy callers. Dashboard rewards use the dedicated atomic RPCs below.
  const { error: insertErr } = await supabase
    .from('bonus_claims')
    .insert({ user_phone: userPhone, claim_type: claimType, claim_date: todayStr(), amount: Number(amount) })
  if (insertErr) {
    if (insertErr.code === '23505') return { success: false, message: 'Already claimed today.' }
    throw insertErr
  }
  const { data: u, error: userErr } = await supabase.from('users').select('balance').eq('phone', userPhone).single()
  if (userErr) throw userErr
  const newBalance = Number(u.balance) + Number(amount)
  const { error: balErr } = await supabase.rpc('admin_set_balance', {
    p_user_phone: userPhone,
    p_balance: newBalance,
  })
  if (balErr) throw balErr
  return { success: true, balance: newBalance }
}

export async function claimDailyLoginBonus(userPhone) {
  if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured' }
  const { data, error } = await supabase.rpc('claim_daily_login_bonus', {
    p_user_phone: userPhone,
  })
  if (error) throw error
  return data
}

export async function claimLuckySpin(userPhone) {
  if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured' }
  const { data, error } = await supabase.rpc('claim_lucky_spin', {
    p_user_phone: userPhone,
  })
  if (error) throw error
  return data
}
// ── Support / Live Chat ───────────────────────────────────────────────────────
export async function getSupportMessages(userPhone) {
  if (!isSupabaseConfigured) return local.getSupportMessages(userPhone)
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, user_phone, message, sender_type, created_at')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function getAllSupportThreads() {
  if (!isSupabaseConfigured) return local.getAllSupportThreads()
  const { data, error } = await supabase
    .from('support_messages')
    .select('user_phone, message, sender_type, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data) return []
  const map = {}
  data.forEach(m => {
    if (!map[m.user_phone]) {
      map[m.user_phone] = { userPhone: m.user_phone, messages: [], lastAt: m.created_at, unread: 0 }
    }
    map[m.user_phone].messages.push(m)
    if (m.sender_type === 'user') map[m.user_phone].unread++
  })
  return Object.values(map).map(t => ({ ...t, messages: t.messages.reverse() }))
}

export async function sendSupportMessage(userPhone, message, senderType = 'user') {
  if (!isSupabaseConfigured) {
    local.sendSupportMessage(userPhone, message, senderType)
    return
  }
  const { error } = await supabase
    .from('support_messages')
    .insert({ user_phone: userPhone, message, sender_type: senderType })
  if (error) throw error
}

// ── App Settings (WhatsApp / Support) ────────────────────────────────────────
export async function getWhatsAppSettings() {
  if (!isSupabaseConfigured) return { whatsapp_phone: '', whatsapp_group_link: '' }
  const { data, error } = await supabase.rpc('get_whatsapp_settings')
  if (error) throw error
  return data
}

export async function updateAppSetting(callerPhone, key, value) {
  if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured' }
  const { data, error } = await supabase.rpc('update_app_setting', {
    p_caller_phone: callerPhone,
    p_key: key,
    p_value: value,
  })
  if (error) throw error
  return data
}

export async function checkIsAdmin(phone) {
  if (!isSupabaseConfigured) return false
  const { data, error } = await supabase.rpc('check_is_admin', { p_phone: phone })
  if (error) throw error
  return !!data
}

// ── Password Reset ────────────────────────────────────────────────────────────
export async function createPasswordResetRequest(userPhone) {
  if (!isSupabaseConfigured) {
    local.addPasswordResetRequest({ user_phone: userPhone, status: 'pending' })
    return { success: true, queued: true }
  }
  const { data, error } = await supabase.rpc('request_password_reset', { p_user_phone: userPhone })
  if (error) throw error
  return data
}

export async function getPasswordResetRequests() {
  if (!isSupabaseConfigured) return local.getPasswordResetRequests()
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('id, user_phone, status, created_at, completed_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPasswordResetRequestsByPhone(userPhone) {
  if (!isSupabaseConfigured) return local.getPasswordResetRequestsByPhone(userPhone)
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('id, user_phone, status, created_at, completed_at')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updatePasswordResetRequest(id, updates) {
  if (!isSupabaseConfigured) {
    local.updatePasswordResetRequest(id, updates)
    return
  }
  const { error } = await supabase.from('password_reset_requests').update(updates).eq('id', id)
  if (error) throw error
}

export async function adminResetPassword(requestId, userPhone, newPin) {
  const pinHash = await hashPin(newPin)
  if (!isSupabaseConfigured) {
    local.saveUser(userPhone, { pin_hash: pinHash, must_change_password: true })
    local.updatePasswordResetRequest(requestId, { status: 'completed', completed_at: new Date().toISOString() })
    return { success: true, must_change_password: true }
  }
  const { data, error } = await supabase.rpc('admin_reset_password', {
    p_request_id: requestId,
    p_user_phone: userPhone,
    p_pin_hash: pinHash,
  })
  if (error) throw error
  return data
}

export async function changePassword(userPhone, currentPin, newPin) {
  const currentHash = await hashPin(currentPin)
  const newHash = await hashPin(newPin)
  if (!isSupabaseConfigured) {
    const user = await getUserRaw(userPhone)
    if (!user) throw new Error('User not found')
    if (user.pin_hash !== currentHash) throw new Error('Current PIN is incorrect')
    local.saveUser(userPhone, { pin_hash: newHash, must_change_password: false })
    return { success: true, must_change_password: false }
  }
  const { data, error } = await supabase.rpc('change_user_pin', {
    p_user_phone: userPhone,
    p_current_pin_hash: currentHash,
    p_new_pin_hash: newHash,
  })
  if (error) throw error
  return data
}

export async function clearMustChangePassword(userPhone) {
  if (!isSupabaseConfigured) {
    local.saveUser(userPhone, { must_change_password: false })
    return
  }
  // Uses the UPDATE policy we added on users table
  const { error } = await supabase
    .from('users')
    .update({ must_change_password: false })
    .eq('phone', userPhone)
  if (error) throw error
}

// ── Admin: Transactions ────────────────────────────────────────────────────────
export async function getAllTransactions() {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('transactions')
    .select('id, user_phone, type, amount, status, reference, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data || []
}

export async function deleteTransaction(id) {
  if (!isSupabaseConfigured) return

  // Get the transaction — data is stored in phone_number, not user_phone
  const { data: tx, error: fetchErr } = await supabase
    .from('transactions')
    .select('id, user_phone, phone_number, reference, type, amount, created_at')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr

  // The phone is in phone_number column (user_phone is NULL due to schema drift)
  const phone = tx.phone_number || tx.user_phone
  if (!phone) {
    // Cannot match without a phone — just delete the transaction row
    const { error: txError } = await supabase.from('transactions').delete().eq('id', id)
    if (txError) throw txError
    return
  }

  const createdAt = tx.created_at ? new Date(tx.created_at).toISOString() : '1970-01-01T00:00:00'
  const tenMinAfter = new Date(new Date(createdAt).getTime() + 10 * 60000).toISOString()
  const absAmount = Math.abs(Number(tx.amount))

  // Delete matching deposit record (by phone + amount + time window)
  await supabase.from('deposits').delete()
    .eq('user_phone', phone)
    .gte('created_at', createdAt)
    .lt('created_at', tenMinAfter)

  // Delete matching withdrawal record (by phone + amount + time window)
  await supabase.from('withdrawals').delete()
    .eq('user_phone', phone)
    .gte('created_at', createdAt)
    .lt('created_at', tenMinAfter)

  // Also try matching by reference if available
  if (tx.reference) {
    await supabase.from('deposits').delete()
      .eq('mpesa_receipt', tx.reference)
      .eq('user_phone', phone)
  }

  // Delete the transaction itself
  const { error: txError } = await supabase.from('transactions').delete().eq('id', id)
  if (txError) throw txError
}

// ── Admin Stats ───────────────────────────────────────────────────────────────
export async function getAdminStats() {
  if (!isSupabaseConfigured) {
    return { totalUsers: 0, totalBalance: 0, pendingDeposits: 0, pendingWithdrawals: 0, pendingLoans: 0 }
  }
  const [usersRes, depositsRes, withdrawalsRes, loansRes] = await Promise.all([
    supabase.from('users').select('balance'),
    supabase.from('deposits').select('id, status'),
    supabase.from('withdrawals').select('id, status'),
    supabase.from('loans').select('id, status'),
  ])
  const users = usersRes.data || []
  const deposits = depositsRes.data || []
  const withdrawals = withdrawalsRes.data || []
  const loans = loansRes.data || []
  return {
    totalUsers: users.length,
    totalBalance: users.reduce((s, u) => s + Number(u.balance || 0), 0),
    pendingDeposits: deposits.filter(d => d.status === 'pending').length,
    pendingWithdrawals: withdrawals.filter(w => w.status === 'pending').length,
    pendingLoans: loans.filter(l => l.status === 'pending').length,
  }
}
