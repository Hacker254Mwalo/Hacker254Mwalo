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

function dbUserToApp(row) {
  return {
    id: row.phone,
    phone: row.phone,
    name: row.name,
    balance: Number(row.balance),
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    createdAt: row.created_at,
  }
}

function dbInvToApp(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    planName: row.plan_name,
    amount: Number(row.amount),
    dailyReturn: Number(row.daily_return),
    totalReturn: Number(row.total_return),
    status: row.status,
    date: row.created_at,
  }
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function getUser(phone) {
  if (!isSupabaseConfigured) return local.getUser(phone)
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single()
  return data ? dbUserToApp(data) : null
}

export async function createUser(userData) {
  if (!isSupabaseConfigured) {
    local.saveUser(userData.phone, userData)
    return userData
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
    if (u.pin !== pin) return null
    return u
  }
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single()
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
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('referral_code', code)
    .single()
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
export async function addDeposit(userPhone, { amount, checkoutId }) {
  if (!isSupabaseConfigured) {
    return { id: Date.now(), user_phone: userPhone, amount, status: 'pending', created_at: new Date().toISOString() }
  }
  const { data, error } = await supabase
    .from('deposits')
    .insert({ user_phone: userPhone, amount, checkout_id: checkoutId || null, status: 'pending' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getDeposits(userPhone) {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase
    .from('deposits')
    .select('*')
    .eq('user_phone', userPhone)
    .order('created_at', { ascending: false })
  return data || []
}

export async function getAllDeposits() {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase
    .from('deposits')
    .select('*, users!user_phone(name, phone)')
    .order('created_at', { ascending: false })
  return data || []
}

export async function approveDeposit(depositId, userPhone, amount) {
  if (!isSupabaseConfigured) return
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
  if (!isSupabaseConfigured) return
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
  const { data: referrer } = await supabase
    .from('users')
    .select('balance')
    .eq('phone', referrerPhone)
    .single()
  if (referrer) {
    await supabase
      .from('users')
      .update({ balance: Number(referrer.balance) + commission })
      .eq('phone', referrerPhone)
  }
}
