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
