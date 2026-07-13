export const DAILY_RATE = 0.03 // 3% daily
export const DURATION_DAYS = 90
export const LOGIN_BONUS = 50
export const WITHDRAWAL_FEE = 0.08
export const REF_L1 = 0.10
export const REF_L2 = 0.04
export const MPESA_PAYBILL = '4091165'

export const PLANS = [
  { id: 'starter',  name: 'Starter',  amount: 200,   once: true,  color: 'from-gray-600 to-gray-700',   icon: '🌱' },
  { id: 'basic',    name: 'Basic',    amount: 500,   once: true,  color: 'from-blue-700 to-blue-800',   icon: '💎' },
  { id: 'silver',   name: 'Silver',   amount: 1000,  once: false, color: 'from-gray-400 to-gray-600',   icon: '🥈' },
  { id: 'gold',     name: 'Gold',     amount: 2000,  once: false, color: 'from-yellow-500 to-yellow-700', icon: '🥇' },
  { id: 'platinum', name: 'Platinum', amount: 4000,  once: false, color: 'from-cyan-500 to-cyan-700',   icon: '💠' },
  { id: 'diamond',  name: 'Diamond',  amount: 7000,  once: false, color: 'from-indigo-400 to-purple-600', icon: '💎' },
  { id: 'ruby',     name: 'Ruby',     amount: 10000, once: false, color: 'from-red-500 to-red-700',     icon: '🔴' },
  { id: 'emerald',  name: 'Emerald',  amount: 20000, once: false, color: 'from-green-500 to-emerald-700', icon: '💚' },
  { id: 'sapphire', name: 'Sapphire', amount: 35000, once: false, color: 'from-blue-400 to-blue-600',   icon: '🔵' },
  { id: 'vip',      name: 'VIP',      amount: 45000, once: false, color: 'from-red-500 to-pink-600',    icon: '👑' },
]

export function getDailyReturn(amount) {
  return Math.floor(amount * DAILY_RATE)
}

export function getTotalReturn(amount) {
  return Math.floor(amount * DAILY_RATE * DURATION_DAYS)
}
