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
    status: row.status,
    date: row.created_at,
  }
}

async function getUserRaw(phone) {
  if (!isSupabaseConfigured) return local.getUser(phone)
  const { data, error } = await supabase
    .from('users')
    .select('*')
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
    .select()
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
    .select('*')
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
  const { error } = await supabase.from('users').update({ balance }).eq('phone', phone)
  if (error) throw error
}

export async function findUserByReferralCode(code) {
  if (!isSupabaseConfigured) return local.findUserByReferralCode(code)
  const { data, error } = await supabase
    .from('users')
    .select('*')
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
    .select('*')
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
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDeposits(userPhone) {
  if (!isSupabaseConfigured) return local.getDeposits(userPhone)
  const { data, error } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getAllDeposits() {
  if (!isSupabaseConfigured) return local.getAllDeposits()
  const { data, error } = await supabase
    .from('deposits')
    .select('*, users!user_phone(name, phone)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
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
  const { data, error } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_phone', userPhone)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(r => ({
    referredName: r.referred_name,
    level: r.level,
    commission: Number(r.commission),
    planName: r.plan_name,
    date: r.created_at,
  }))
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
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*, users!user_phone(name, phone)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getWithdrawals(userPhone) {
  if (!isSupabaseConfigured) return local.getWithdrawals(userPhone)
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*')
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
  const { data, error } = await supabase
    .from('loans')
    .select('*, users!user_phone(name, phone)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getUserLoans(userPhone) {
  if (!isSupabaseConfigured) {
    const all = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    return all.filter(l => l.user_phone === userPhone)
  }
  const { data, error } = await supabase
    .from('loans')
    .select('*')
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
  if (u) await supabase.from('users').update({ balance: Number(u.balance) + Number(amount) }).eq('phone', userPhone)
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
  if (!isSupabaseConfigured) { local.deleteUser(phone); return }
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
  const { error } = await supabase.from('users').update({ balance }).eq('phone', phone)
  if (error) throw error
}

export async function adminSetBonusBalance(phone, bonusBalance) {
  if (!isSupabaseConfigured) { local.saveUser(phone, { bonus_balance: bonusBalance }); return }
  const { error } = await supabase.from('users').update({ bonus_balance: bonusBalance }).eq('phone', phone)
  if (error) throw error
}

// ── Keywords (Promo Codes) ────────────────────────────────────────────────────
export async function getKeywords() {
  if (!isSupabaseConfigured) {
    return JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
  }
  const { data, error } = await supabase.from('keywords').select('*').order('created_at', { ascending: false })
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
    .select().single()
  if (error) throw error
  return data
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
  const { error: balErr } = await supabase.from('users').update({ balance: newBalance }).eq('phone', userPhone)
  if (balErr) throw balErr
  return { success: true, balance: newBalance }
}

export async function claimDailyLoginBonus(userPhone) {
  if (!isSupabaseConfigured) return claimBonus(userPhone, 'login_bonus', 10)
  const { data, error } = await supabase.rpc('claim_daily_login_bonus', {
    p_user_phone: userPhone,
    p_amount: 10,
  })
  if (error) throw error
  return data
}

export async function claimLuckySpin(userPhone) {
  if (!isSupabaseConfigured) {
    const investments = local.getInvestments(userPhone).filter(i => i.status === 'active' && Number(i.dailyReturn || 0) > 0)
    if (!investments.length) return { success: false, code: 'NO_ACTIVE_INVESTMENT', message: 'An active investment is required. Please deposit and invest first.' }
    const selected = investments[Math.floor(Math.random() * investments.length)]
    const reward = Math.round(Number(selected.dailyReturn) * 0.03 * 100) / 100
    const result = await claimBonus(userPhone, 'spin', reward)
    return { ...result, amount: reward, daily_profit: Number(selected.dailyReturn), plan_name: selected.planName }
  }
  const { data, error } = await supabase.rpc('claim_lucky_spin', { p_user_phone: userPhone })
  if (error) throw error
  return data
}

// ── Support / Live Chat ───────────────────────────────────────────────────────
export async function getSupportMessages(userPhone) {
  if (!isSupabaseConfigured) return local.getSupportMessages(userPhone)
  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
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
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getPasswordResetRequestsByPhone(userPhone) {
  if (!isSupabaseConfigured) return local.getPasswordResetRequestsByPhone(userPhone)
  const { data, error } = await supabase
    .from('password_reset_requests')
    .select('*')
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
  const { error } = await supabase
    .from('users')
    .update({ must_change_password: false })
    .eq('phone', userPhone)
  if (error) throw error
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
