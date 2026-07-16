/**
 * db.js — Dumiropay data layer
 * Uses Supabase when configured, falls back to localStorage for demo mode.
 */
import { supabase, isSupabaseConfigured } from './supabase'
import * as local from './storage'

// ── PIN Hashing (SHA-256 via Web Crypto, no extra dependencies) ─────────────
async function hashPin(pin) {
  try {
    const data = new TextEncoder().encode('dumiropay:' + pin)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return pin // fallback — should not happen in modern browsers
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
    balance: Number(row.balance),
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    createdAt: row.created_at,
    must_change_password: row.must_change_password || false,
  }
}

function dbInvToApp(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    amount: Number(row.amount),
    dailyReturn: Number(row.daily_return),
    totalReturn: Number(row.total_return), // ✅ fixed: was row.totalReturn (wrong key)
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
    return row
  }
  const pinHash = await hashPin(userData.pin)
  const row = {
    phone: userData.phone,
    name: userData.name,
    pin_hash: pinHash,
    balance: 0,
    referral_code: userData.referralCode,
    referred_by: userData.referredBy || null,
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
    return u
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
  return dbUserToApp(data)
}

export async function updateUserBalance(phone, balance) {
  if (!isSupabaseConfigured) {
    local.saveUser(phone, { balance })
    return
  }
  await supabase.from('users').update({ balance }).eq('phone', phone)
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
  const { data } = await supabase
    .from('investments')
    .select('*')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  return (data || []).map(dbInvToApp)
}

export async function addInvestment(userPhone, investment) {
  if (!isSupabaseConfigured) return local.addInvestment(userPhone, investment)
  const row = {
    user_phone: userPhone,
    plan_id: investment.planId,
    plan_name: investment.planName,
    amount: investment.amount,
    daily_return: investment.dailyReturn,
    total_return: investment.totalReturn,
    status: 'active',
  }
  const { data, error } = await supabase
    .from('investments')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return dbInvToApp(data)
}

// ── Deposits ─────────────────────────────────────────────────────────────────
export async function addDeposit(userPhone, { amount, checkoutId, mpesaCode }) {
  if (!isSupabaseConfigured) {
    return local.addDeposit(userPhone, { amount, checkoutId, mpesaCode, status: 'pending' })
  }
  const { data, error } = await supabase
    .from('deposits')
    .insert({ user_phone: userPhone, amount, checkout_id: checkoutId || null, mpesa_receipt: mpesaCode || null, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDeposits(userPhone) {
  if (!isSupabaseConfigured) return local.getDeposits(userPhone)
  const { data } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getAllDeposits() {
  if (!isSupabaseConfigured) return local.getAllDeposits()
  const { data } = await supabase
    .from('deposits')
    .select('*, users!user_phone(name, phone)')
    .order('created_at', { ascending: false })
  return data || []
}

export async function approveDeposit(depositId, userPhone, amount) {
  if (!isSupabaseConfigured) {
    local.updateDepositStatus(depositId, 'approved')
    const user = local.getUser(userPhone)
    if (user) {
      local.saveUser(userPhone, { balance: Number(user.balance || 0) + Number(amount) })
    }
    return
  }
  await supabase.from('deposits').update({ status: 'approved' }).eq('id', depositId)
  const { data: u } = await supabase
    .from('users')
    .select('balance')
    .eq('phone', userPhone)
    .single()
  if (u) {
    await supabase
      .from('users')
      .update({ balance: Number(u.balance) + Number(amount) })
      .eq('phone', userPhone)
  }
}

export async function rejectDeposit(depositId) {
  if (!isSupabaseConfigured) {
    local.updateDepositStatus(depositId, 'rejected')
    return
  }
  await supabase.from('deposits').update({ status: 'rejected' }).eq('id', depositId)
}

// ── Referrals ─────────────────────────────────────────────────────────────────
export async function getReferrals(userPhone) {
  if (!isSupabaseConfigured) return local.getReferrals(userPhone)
  const { data } = await supabase
    .from('referrals')
    .select('*')
    .eq('referrer_phone', userPhone)
    .order('created_at', { ascending: false })
  return (data || []).map(r => ({
    referredName: r.referred_name,
    level: r.level,
    commission: Number(r.commission),
    planName: r.plan_name,
    date: r.created_at,
  }))
}

export async function addReferralCommission(referrerPhone, { referredPhone, referredName, level, commission, planName }) {
  if (!isSupabaseConfigured) {
    local.addReferral(referrerPhone, { referredPhone, referredName, level, commission, planName })
    return
  }
  await supabase.from('referrals').insert({
    referrer_phone: referrerPhone,
    referred_phone: referredPhone,
    referred_name: referredName,
    level,
    commission,
    plan_name: planName,
  })
  const { data: referrer } = await supabase.from('users').select('balance').eq('phone', referrerPhone).single()
  if (referrer) {
    await supabase.from('users').update({ balance: Number(referrer.balance) + commission }).eq('phone', referrerPhone)
  }
}

// ── Withdrawals ──────────────────────────────────────────────────────────────
export async function addWithdrawal(userPhone, { amount, fee, netAmount, mpesaPhone }) {
  if (!isSupabaseConfigured) return
  const { data, error } = await supabase
    .from('withdrawals')
    .insert({ user_phone: userPhone, amount, fee, net_amount: netAmount, mpesa_phone: mpesaPhone, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllWithdrawals() {
  if (!isSupabaseConfigured) return local.getAllWithdrawals()
  const { data } = await supabase
    .from('withdrawals')
    .select('*, users!user_phone(name, phone)')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getWithdrawals(userPhone) {
  if (!isSupabaseConfigured) return local.getWithdrawals(userPhone)
  const { data } = await supabase
    .from('withdrawals')
    .select('*')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  return data || []
}

export async function approveWithdrawal(id) {
  if (!isSupabaseConfigured) {
    local.updateWithdrawalStatus(id, 'approved')
    return
  }
  await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', id)
}

export async function rejectWithdrawal(id, userPhone, amount) {
  if (!isSupabaseConfigured) {
    local.updateWithdrawalStatus(id, 'rejected')
    const user = local.getUser(userPhone)
    if (user) {
      local.saveUser(userPhone, { balance: Number(user.balance || 0) + Number(amount) })
    }
    return
  }
  await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', id)
  const { data: u } = await supabase.from('users').select('balance').eq('phone', userPhone).single()
  if (u) {
    await supabase.from('users').update({ balance: Number(u.balance) + Number(amount) }).eq('phone', userPhone)
  }
}

// ── Loans ─────────────────────────────────────────────────────────────────────
export async function addLoan(userPhone, { amount, purpose }) {
  if (!isSupabaseConfigured) {
    const loans = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    loans.push({ id: Date.now().toString(), user_phone: userPhone, amount, purpose: purpose || null, status: 'pending', created_at: new Date().toISOString() })
    localStorage.setItem('dp_loan_requests', JSON.stringify(loans))
    return
  }
  const { data, error } = await supabase
    .from('loans')
    .insert({ user_phone: userPhone, amount, purpose: purpose || null, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getAllLoans() {
  if (!isSupabaseConfigured) {
    return JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
  }
  const { data } = await supabase
    .from('loans')
    .select('*, users!user_phone(name, phone)')
    .order('created_at', { ascending: false })
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
  if (u) {
    await supabase.from('users').update({ balance: Number(u.balance) + Number(amount) }).eq('phone', userPhone)
  }
}

export async function rejectLoan(id) {
  if (!isSupabaseConfigured) {
    const loans = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    localStorage.setItem('dp_loan_requests', JSON.stringify(loans.map(l => l.id === id ? { ...l, status: 'rejected' } : l)))
    return
  }
  await supabase.from('loans').update({ status: 'rejected' }).eq('id', id)
}

// ── Admin: User Management ────────────────────────────────────────────────────
export async function getAllUsers() {
  if (!isSupabaseConfigured) {
    return Object.values(local.getUsers()).map(u => ({
      phone: u.phone, name: u.name, balance: Number(u.balance || 0),
      bonus_balance: Number(u.bonus_balance || 0), created_at: u.created_at,
    }))
  }
  const { data } = await supabase
    .from('users')
    .select('phone, name, balance, bonus_balance, is_admin, created_at')
    .order('created_at', { ascending: false })
  return data || []
}

export async function adminSetBalance(phone, balance) {
  if (!isSupabaseConfigured) { local.saveUser(phone, { balance }); return }
  await supabase.from('users').update({ balance }).eq('phone', phone)
}

export async function adminSetBonusBalance(phone, bonusBalance) {
  if (!isSupabaseConfigured) { local.saveUser(phone, { bonus_balance: bonusBalance }); return }
  await supabase.from('users').update({ bonus_balance: bonusBalance }).eq('phone', phone)
}

// ── Keywords ──────────────────────────────────────────────────────────────────
export async function getKeywords() {
  if (!isSupabaseConfigured) {
    return JSON.parse(localStorage.getItem('dp_admin_keywords') || '[]')
  }
  const { data } = await supabase.from('keywords').select('*').order('created_at', { ascending: false })
  return data || []
}

export async function createKeyword({ code, minBonus, maxBonus, maxClaims }) {
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
  await supabase.from('keywords').update({ active }).eq('id', id)
}

export async function claimKeyword(userPhone, code) {
  // Returns { success: bool, bonus?: number, message?: string }
  if (!isSupabaseConfigured) {
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
  const { data: kw, error: kwErr } = await supabase.from('keywords').select('*').ilike('code', code.trim()).single()
  if (kwErr || !kw) return { success: false, message: 'Invalid keyword code.' }
  if (!kw.active) return { success: false, message: 'This keyword is no longer active.' }
  if (kw.claim_count >= kw.max_claims) return { success: false, message: 'All slots for this keyword have been claimed.' }
  const { data: existing } = await supabase.from('keyword_claims').select('id').eq('keyword_id', kw.id).eq('user_phone', userPhone).maybeSingle()
  if (existing) return { success: false, message: 'You have already claimed this keyword.' }
  const bonus = Math.floor(Math.random() * (Number(kw.max_bonus) - Number(kw.min_bonus) + 1)) + Number(kw.min_bonus)
  const { error: claimErr } = await supabase.from('keyword_claims').insert({ keyword_id: kw.id, user_phone: userPhone, bonus_amount: bonus })
  if (claimErr) return { success: false, message: 'Failed to record claim. Please try again.' }
  await supabase.from('keywords').update({ claim_count: kw.claim_count + 1 }).eq('id', kw.id)
  const { data: u } = await supabase.from('users').select('balance').eq('phone', userPhone).single()
  if (u) await supabase.from('users').update({ balance: Number(u.balance) + bonus }).eq('phone', userPhone)
  return { success: true, bonus }
}

// ── Support / Live Chat ───────────────────────────────────────────────────────
export async function getSupportMessages(userPhone) {
  if (!isSupabaseConfigured) return local.getSupportMessages(userPhone)
  const { data } = await supabase
    .from('support_messages')
    .select('*')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: true })
  return data || []
}

export async function getAllSupportThreads() {
  if (!isSupabaseConfigured) return local.getAllSupportThreads()
  const { data } = await supabase
    .from('support_messages')
    .select('user_phone, message, sender_type, created_at')
    .order('created_at', { ascending: false })
  if (!data) return []
  const map = {}
  data.forEach(m => {
    if (!map[m.user_phone]) map[m.user_phone] = { userPhone: m.user_phone, messages: [], lastAt: m.created_at }
    map[m.user_phone].messages.push(m)
  })
  return Object.values(map).map(t => ({ ...t, messages: t.messages.reverse() }))
}

export async function sendSupportMessage(userPhone, message, senderType = 'user') {
  if (!isSupabaseConfigured) { local.sendSupportMessage(userPhone, message, senderType); return }
  await supabase.from('support_messages').insert({ user_phone: userPhone, message, sender_type: senderType })
}

// ── Password Reset ────────────────────────────────────────────────────────────
export async function createPasswordResetRequest(userPhone) {
  if (!isSupabaseConfigured) {
    local.addPasswordResetRequest({ user_phone: userPhone, status: 'pending' })
    return { success: true }
  }
  const { data, error } = await supabase
    .from('password_reset_requests')
    .insert({ user_phone: userPhone, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPasswordResetRequests() {
  if (!isSupabaseConfigured) return local.getPasswordResetRequests()
  const { data } = await supabase
    .from('password_reset_requests')
    .select('*')
    .order('created_at', { ascending: false })
  return data || []
}

export async function getPasswordResetRequestsByPhone(userPhone) {
  if (!isSupabaseConfigured) return local.getPasswordResetRequestsByPhone(userPhone)
  const { data } = await supabase
    .from('password_reset_requests')
    .select('*')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  return data || []
}

export async function updatePasswordResetRequest(id, updates) {
  if (!isSupabaseConfigured) {
    local.updatePasswordResetRequest(id, updates)
    return
  }
  await supabase.from('password_reset_requests').update(updates).eq('id', id)
}

export async function adminResetPassword(userPhone, newPin) {
  const pinHash = await hashPin(newPin)
  if (!isSupabaseConfigured) {
    local.saveUser(userPhone, { pin_hash: pinHash, must_change_password: true })
    return
  }
  await supabase.from('users').update({ pin_hash: pinHash, must_change_password: true }).eq('phone', userPhone)
}

export async function changePassword(userPhone, currentPin, newPin) {
  const user = await getUserRaw(userPhone)
  if (!user) throw new Error('User not found')
  const currentHash = await hashPin(currentPin)
  if (user.pin_hash !== currentHash) throw new Error('Current PIN is incorrect')
  const newHash = await hashPin(newPin)
  if (!isSupabaseConfigured) {
    local.saveUser(userPhone, { pin_hash: newHash, must_change_password: false })
    return
  }
  await supabase.from('users').update({ pin_hash: newHash, must_change_password: false }).eq('phone', userPhone)
}

export async function clearMustChangePassword(userPhone) {
  if (!isSupabaseConfigured) {
    local.saveUser(userPhone, { must_change_password: false })
    return
  }
  await supabase.from('users').update({ must_change_password: false }).eq('phone', userPhone)
}
