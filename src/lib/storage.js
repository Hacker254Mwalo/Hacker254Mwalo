// LocalStorage-based data helpers for Dumiropay demo

export function getUsers() {
  try { return JSON.parse(localStorage.getItem('dp_users') || '{}') } catch { return {} }
}

export function saveUsers(users) {
  localStorage.setItem('dp_users', JSON.stringify(users))
}

export function getUser(phone) {
  return getUsers()[phone] || null
}

export function saveUser(phone, data) {
  const users = getUsers()
  users[phone] = { ...users[phone], ...data }
  saveUsers(users)
  return users[phone]
}

export function getInvestments(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('dp_investments') || '{}')
    return all[userId] || []
  } catch { return [] }
}

export function addInvestment(userId, investment) {
  const all = JSON.parse(localStorage.getItem('dp_investments') || '{}')
  if (!all[userId]) all[userId] = []
  const inv = { ...investment, id: Date.now(), date: new Date().toISOString() }
  all[userId].unshift(inv)
  localStorage.setItem('dp_investments', JSON.stringify(all))
  return inv
}

export function getReferrals(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('dp_referrals') || '{}')
    return all[userId] || []
  } catch { return [] }
}

export function addReferral(referrerId, referralData) {
  const all = JSON.parse(localStorage.getItem('dp_referrals') || '{}')
  if (!all[referrerId]) all[referrerId] = []
  all[referrerId].push({ ...referralData, date: new Date().toISOString() })
  localStorage.setItem('dp_referrals', JSON.stringify(all))
}

export function getWithdrawals(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('dp_withdrawals') || '{}')
    return all[userId] || []
  } catch { return [] }
}

export function addWithdrawal(userId, withdrawal) {
  const all = JSON.parse(localStorage.getItem('dp_withdrawals') || '{}')
  if (!all[userId]) all[userId] = []
  const w = { ...withdrawal, id: Date.now().toString(), date: new Date().toISOString() }
  all[userId].unshift(w)
  localStorage.setItem('dp_withdrawals', JSON.stringify(all))
  return w
}

export function getDeposits(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('dp_deposits') || '{}')
    return all[userId] || []
  } catch { return [] }
}

export function addDeposit(userId, deposit) {
  const all = JSON.parse(localStorage.getItem('dp_deposits') || '{}')
  if (!all[userId]) all[userId] = []
  const d = { ...deposit, id: Date.now().toString(), date: new Date().toISOString() }
  all[userId].unshift(d)
  localStorage.setItem('dp_deposits', JSON.stringify(all))
  return d
}

export function getAllDeposits() {
  try {
    const all = JSON.parse(localStorage.getItem('dp_deposits') || '{}')
    const result = []
    Object.entries(all).forEach(([userId, deposits]) => {
      deposits.forEach(d => result.push({ ...d, user_phone: userId, created_at: d.date || d.created_at }))
    })
    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } catch { return [] }
}

export function updateDepositStatus(depositId, status) {
  const all = JSON.parse(localStorage.getItem('dp_deposits') || '{}')
  Object.keys(all).forEach(userId => {
    all[userId] = all[userId].map(d => d.id === depositId ? { ...d, status } : d)
  })
  localStorage.setItem('dp_deposits', JSON.stringify(all))
}

export function getAllWithdrawals() {
  try {
    const all = JSON.parse(localStorage.getItem('dp_withdrawals') || '{}')
    const result = []
    Object.entries(all).forEach(([userId, withdrawals]) => {
      withdrawals.forEach(w => result.push({ ...w, user_phone: userId, created_at: w.date || w.created_at }))
    })
    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  } catch { return [] }
}

export function updateWithdrawalStatus(withdrawalId, status) {
  const all = JSON.parse(localStorage.getItem('dp_withdrawals') || '{}')
  Object.keys(all).forEach(userId => {
    all[userId] = all[userId].map(w => w.id === withdrawalId ? { ...w, status } : w)
  })
  localStorage.setItem('dp_withdrawals', JSON.stringify(all))
}

export function getLastLoginBonus(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('dp_login_bonus') || '{}')
    return all[userId] || null
  } catch { return null }
}

export function setLastLoginBonus(userId) {
  const all = JSON.parse(localStorage.getItem('dp_login_bonus') || '{}')
  all[userId] = new Date().toISOString()
  localStorage.setItem('dp_login_bonus', JSON.stringify(all))
}

export function canClaimLoginBonus(userId) {
  const last = getLastLoginBonus(userId)
  if (!last) return true
  const lastDate = new Date(last)
  const now = new Date()
  return lastDate.toDateString() !== now.toDateString()
}

export function isSpinDay() {
  const day = new Date().getDay() // 0=Sun,1=Mon,...,5=Fri
  return day === 1 || day === 5
}

export function getLastSpin(userId) {
  try {
    const all = JSON.parse(localStorage.getItem('dp_spins') || '{}')
    return all[userId] || null
  } catch { return null }
}

export function setLastSpin(userId) {
  const all = JSON.parse(localStorage.getItem('dp_spins') || '{}')
  all[userId] = new Date().toISOString()
  localStorage.setItem('dp_spins', JSON.stringify(all))
}

export function canSpin(userId) {
  if (!isSpinDay()) return false
  const last = getLastSpin(userId)
  if (!last) return true
  const lastDate = new Date(last)
  const now = new Date()
  return lastDate.toDateString() !== now.toDateString()
}

export function generateReferralCode(phone) {
  return 'DUM' + phone.slice(-6).replace(/\D/g, '')
}

export function findUserByReferralCode(code) {
  const users = getUsers()
  return Object.values(users).find(u => u.referralCode === code) || null
}

// ── Support / Live Chat ───────────────────────────────────────────────────────
export function getSupportMessages(userPhone) {
  try {
    const all = JSON.parse(localStorage.getItem('dp_support_messages') || '{}')
    return (all[userPhone] || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } catch { return [] }
}

export function getAllSupportThreads() {
  try {
    const all = JSON.parse(localStorage.getItem('dp_support_messages') || '{}')
    const threads = []
    Object.entries(all).forEach(([userPhone, messages]) => {
      if (messages.length === 0) return
      const sorted = messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      threads.push({ userPhone, messages: sorted, lastAt: sorted[sorted.length - 1].created_at })
    })
    return threads.sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
  } catch { return [] }
}

export function sendSupportMessage(userPhone, message, senderType = 'user') {
  const all = JSON.parse(localStorage.getItem('dp_support_messages') || '{}')
  if (!all[userPhone]) all[userPhone] = []
  all[userPhone].push({
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    user_phone: userPhone,
    message,
    sender_type: senderType,
    created_at: new Date().toISOString(),
  })
  localStorage.setItem('dp_support_messages', JSON.stringify(all))
}

// ── Password Reset ────────────────────────────────────────────────────────────
export function getPasswordResetRequests() {
  try { return JSON.parse(localStorage.getItem('dp_password_resets') || '[]') } catch { return [] }
}

export function addPasswordResetRequest(request) {
  const requests = getPasswordResetRequests()
  requests.push({ ...request, id: Date.now().toString(), created_at: new Date().toISOString() })
  localStorage.setItem('dp_password_resets', JSON.stringify(requests))
}

export function updatePasswordResetRequest(id, updates) {
  const requests = getPasswordResetRequests()
  const idx = requests.findIndex(r => r.id === id)
  if (idx >= 0) {
    requests[idx] = { ...requests[idx], ...updates }
    localStorage.setItem('dp_password_resets', JSON.stringify(requests))
  }
}

export function getPasswordResetRequestsByPhone(phone) {
  return getPasswordResetRequests().filter(r => r.user_phone === phone)
}

export function getPasswordResetRateLimitKey(phone) {
  return `dp_pw_reset_${phone}`
}

export function canRequestPasswordReset(phone) {
  const key = getPasswordResetRateLimitKey(phone)
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"resetAt":0}')
    const now = Date.now()
    if (now > data.resetAt) return { allowed: true, remaining: 3 }
    const remaining = 3 - data.count
    return { allowed: remaining > 0, remaining }
  } catch { return { allowed: true, remaining: 3 } }
}

export function recordPasswordResetRequest(phone) {
  const key = getPasswordResetRateLimitKey(phone)
  const hour = 3600000
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"resetAt":0}')
    const now = Date.now()
    if (now > data.resetAt) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetAt: now + hour }))
    } else {
      data.count += 1
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch { }
}

export function getPasswordChangeRateLimitKey(phone) {
  return `dp_pw_change_${phone}`
}

export function canChangePassword(phone) {
  const key = getPasswordChangeRateLimitKey(phone)
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"resetAt":0}')
    const now = Date.now()
    if (now > data.resetAt) return { allowed: true, remaining: 5 }
    const remaining = 5 - data.count
    return { allowed: remaining > 0, remaining }
  } catch { return { allowed: true, remaining: 5 } }
}

export function recordPasswordChangeAttempt(phone) {
  const key = getPasswordChangeRateLimitKey(phone)
  const fifteenMinutes = 900000
  try {
    const data = JSON.parse(localStorage.getItem(key) || '{"count":0,"resetAt":0}')
    const now = Date.now()
    if (now > data.resetAt) {
      localStorage.setItem(key, JSON.stringify({ count: 1, resetAt: now + fifteenMinutes }))
    } else {
      data.count += 1
      localStorage.setItem(key, JSON.stringify(data))
    }
  } catch { }
}
