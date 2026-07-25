export const DAILY_RATE = 0.03 // 3% daily
export const DURATION_DAYS = 90
export const LOGIN_BONUS = 50
export const WITHDRAWAL_FEE = 0.08
export const REF_L1 = 0.10
export const REF_L2 = 0.04
export const MPESA_PAYBILL = '4091165'

export const PLANS = [
  { id: 'starter',  name: '⚡ Micro-AI Node (V1)',           amount: 200,   once: true,  color: 'from-gray-600 to-gray-700',   icon: '⚡' },
  { id: 'basic',    name: '🚀 Cloud GPU Rig (RTX 4090)',     amount: 500,   once: true,  color: 'from-blue-700 to-blue-800',   icon: '🚀' },
  { id: 'silver',   name: '💻 AI Server Cluster (A100)',     amount: 1000,  once: false, color: 'from-gray-400 to-gray-600',   icon: '💻' },
  { id: 'gold',     name: '🔥 Neural Network Array (H100)',  amount: 2000,  once: false, color: 'from-yellow-500 to-yellow-700', icon: '🔥' },
  { id: 'platinum', name: '🌐 Deep Learning Center',         amount: 4000,  once: false, color: 'from-cyan-500 to-cyan-700',   icon: '🌐' },
  { id: 'diamond',  name: '⚡ Quantum-AI Gateway',           amount: 7000,  once: false, color: 'from-indigo-400 to-purple-600', icon: '⚡' },
  { id: 'ruby',     name: '🏗️ DataCenter Pod V1',            amount: 10000, once: false, color: 'from-red-500 to-red-700',     icon: '🏗️' },
  { id: 'emerald',  name: '🛡️ Sovereign AI Rig',             amount: 20000, once: false, color: 'from-green-500 to-emerald-700', icon: '🛡️' },
  { id: 'sapphire', name: '🚀 HyperScale AI Grid',           amount: 35000, once: false, color: 'from-blue-400 to-blue-600',   icon: '🚀' },
  { id: 'vip',      name: '👑 Enterprise Compute Matrix',    amount: 45000, once: false, color: 'from-red-500 to-pink-600',    icon: '👑' },
]

export function getDailyReturn(amount) {
  return Math.floor(amount * DAILY_RATE)
}

export function getTotalReturn(amount) {
  return Math.floor(amount * DAILY_RATE * DURATION_DAYS)
}
