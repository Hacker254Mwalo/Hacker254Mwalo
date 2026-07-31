import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInvestments, addInvestment, getUser, getShortTermInvestments } from '../lib/db'
import {
  PLANS, DAILY_RATE, DURATION_DAYS,
  WORKLOAD_MULTIPLIERS,
  getWorkloadYield, getWorkloadTotalReturn,
} from '../lib/plans'
import PlanCertifications from '../components/PlanCertifications'
import DataCenterInfo from '../components/DataCenterInfo'
import { hasClaimedBonusToday, claimDailyLoginBonus, claimLuckySpin } from '../lib/db'

const PLAN_IMAGES = {
  starter: '/icons/starter.webp',
  basic: '/icons/basic.webp',
  silver: '/icons/silver.webp',
  gold: '/icons/gold.webp',
  platinum: '/icons/platinum.webp',
  diamond: '/icons/diamond.webp',
  ruby: '/icons/ruby.webp',
  emerald: '/icons/emerald.webp',
  sapphire: '/icons/sapphire.webp',
  vip: '/icons/vip.webp',
}

/* ── Loading Ritual ──────────────────────────────────────────────────── */
function LoadingRitual({ onComplete }) {
  const [stage, setStage] = useState(0)
  const messages = [
    'Connecting to GPU cluster...',
    '14 nodes active · Demand: 94.2%',
    'Your session: secure',
  ]

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 350)
    const t2 = setTimeout(() => setStage(2), 700)
    const t3 = setTimeout(() => onComplete(), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #030712 0%, #0a0e1a 100%)' }}>
      <div className="scan-line" />
      <div className="mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, rgba(0,180,255,0.15), rgba(0,180,255,0.05))', border: '1px solid rgba(0,180,255,0.3)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00B4FF" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="3" />
            <path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7zM13 13h4v4h-4z" />
          </svg>
        </div>
      </div>
      <div className="space-y-2 text-center">
        {messages.map((msg, i) => (
          <p key={i} className={`text-sm transition-all duration-300 ${
            i <= stage ? 'text-green-400 opacity-100' : 'text-gray-700 opacity-30'
          }`}>
            {i <= stage && '✓ '}{msg}
          </p>
        ))}
      </div>
      <div className="mt-6 w-48 h-1 rounded-full bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(stage + 1) * 33}%`, background: 'linear-gradient(90deg, #00B4FF, #34D399)' }} />
      </div>
    </div>
  )
}

/* ── Global Compute Demand Bar ─────────────────────────────────────────── */
function GlobalDemandBar() {
  const [demand, setDemand] = useState(87)
  const [trend, setTrend] = useState('up')

  useEffect(() => {
    const tick = () => {
      setDemand(prev => {
        const delta = (Math.random() - 0.5) * 3
        const next = Math.max(60, Math.min(99, prev + delta))
        setTrend(delta > 0 ? 'up' : 'down')
        return parseFloat(next.toFixed(1))
      })
    }
    const id = setInterval(tick, 4000)
    return () => clearInterval(id)
  }, [])

  const tier = demand >= 90 ? { label: 'Critical', color: '#ef4444' }
    : demand >= 75 ? { label: 'High', color: '#facc15' }
    : { label: 'Moderate', color: '#34d399' }

  return (
    <div className="rounded-xl px-4 py-3 mb-6 flex items-center justify-between"
      style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(0,180,255,0.12)' }}>
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-3 h-3 rounded-full" style={{ background: tier.color, boxShadow: `0 0 10px ${tier.color}` }} />
          <div className="absolute inset-0 w-3 h-3 rounded-full animate-ping" style={{ background: tier.color, opacity: 0.4 }} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#00B4FF' }}>Global Compute Demand</p>
          <p className="text-lg font-black" style={{ color: tier.color }}>{demand}% — {tier.label}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(148,163,184,0.6)' }}>Enterprise demand driving</p>
        <p className="text-xs font-semibold" style={{ color: tier.color }}>
          {demand > 85 ? 'Premium node payouts' : demand > 70 ? 'Elevated yields active' : 'Standard yields'}
        </p>
      </div>
    </div>
  )
}

/* ── Haptic Touch Wrapper ────────────────────────────────────────────── */
function HapticButton({ children, onClick, className, disabled, style }) {
  const [shaking, setShaking] = useState(false)
  const handleClick = () => {
    if (disabled) return
    setShaking(true)
    onClick()
    setTimeout(() => setShaking(false), 350)
  }
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${className || ''} ${shaking ? 'haptic-shake' : ''}`}
      style={style}
    >
      {children}
    </button>
  )
}

/* ── Market Pulse ────────────────────────────────────────────────────── */
function MarketPulse() {
  const [metrics, setMetrics] = useState([
    { label: 'H100 Rate', value: 25.40, unit: '$/hr', trend: 'up', base: 25.40, variance: 1.2 },
    { label: 'AI Demand', value: 94.2, unit: '', trend: 'up', base: 94.2, variance: 2.0 },
    { label: 'KE Utilization', value: 87.1, unit: '%', trend: 'stable', base: 87.1, variance: 1.5 },
    { label: 'Training Jobs', value: 2.42, unit: 'M/day', trend: 'up', base: 2.42, variance: 0.08 },
  ])

  useEffect(() => {
    const tick = () => {
      setMetrics(prev => prev.map(m => {
        const delta = (Math.random() - 0.48) * m.variance
        const next = parseFloat(Math.max(m.base * 0.92, Math.min(m.base * 1.08, m.value + delta)).toFixed(m.unit === '$/hr' ? 2 : m.unit === 'M/day' ? 2 : 1))
        return {
          ...m,
          value: next,
          trend: delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'stable',
        }
      }))
    }
    const id = setInterval(tick, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="rounded-xl px-4 py-3 mb-4 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(0,180,255,0.08)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#00B4FF' }}>Market Pulse</p>
        <p className="text-[9px] ml-auto" style={{ color: 'var(--text-muted)' }}>Live · Updates every 4s</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="rounded-lg px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
            <div className="flex items-center justify-center gap-1">
              <p className="text-sm font-black" style={{ color: m.trend === 'up' ? '#34d399' : m.trend === 'down' ? '#f87171' : '#e2e8f0' }}>
                {m.unit === '$/hr' ? '$' : ''}{m.value}{m.unit !== '$/hr' && m.unit !== 'M/day' ? '' : ''}
              </p>
              <span className="text-[10px]">
                {m.trend === 'up' ? '↑' : m.trend === 'down' ? '↓' : '→'}
              </span>
            </div>
            {m.unit === '$/hr' && <p className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.unit}</p>}
            {m.unit === 'M/day' && <p className="text-[8px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.unit}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Number Wall Row ─────────────────────────────────────────────────── */
function NumberWallRow({ plan, workload, onClick, isCritical, slots }) {
  const daily = getWorkloadYield(plan.amount, workload)
  const total = getWorkloadTotalReturn(plan.amount, workload)
  const roi = Math.round((total / plan.amount - 1) * 100)
  const planImage = PLAN_IMAGES[plan.id]

  return (
    <tr
      onClick={() => onClick(plan, workload)}
      className={`transition-all duration-200 ${isCritical ? 'demand-critical' : ''}`}
      style={{ borderBottom: '1px solid rgba(31,41,55,0.4)' }}
    >
      {/* Plan Name */}
      <td className="pr-2">
        <div className="flex items-center gap-2">
          {planImage && (
            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
              <img src={planImage} alt={plan.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-white">{plan.name}</p>
            <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
              {plan.specs || 'AI Compute'}
            </p>
          </div>
        </div>
      </td>

      {/* Cost */}
      <td className="text-center">
        <p className="text-sm font-black text-white">KSh {plan.amount.toLocaleString()}</p>
        <p className="text-[9px] text-gray-500">{plan.once ? 'One-time' : 'Repeatable'}</p>
      </td>

      {/* Daily Yield */}
      <td className="text-center">
        <p className="num-glow-green font-bold text-sm">KSh {daily.toLocaleString()}</p>
        <p className="text-[9px] text-gray-500">per day</p>
      </td>

      {/* 60-Day Total */}
      <td className="text-center">
        <p className="num-glow-gold font-bold text-sm">KSh {total.toLocaleString()}</p>
        <p className="text-[9px] text-gray-500">60-day</p>
      </td>

      {/* ROI */}
      <td className="text-center">
        <p className="text-cyan-400 font-bold text-sm">{roi}%</p>
      </td>

      {/* Available */}
      <td className="text-center">
        <p className={`font-bold text-sm ${isCritical ? 'num-pulse-red' : 'text-gray-300'}`}>
          {isCritical ? '🔴' : '🟢'} {slots}
        </p>
      </td>
    </tr>
  )
}

/* ── Confirm Modal ─────────────────────────────────────────────────────── */
function ConfirmModal({ plan, workload, balance, onConfirm, onClose, confirming, onDeposit, amount, investments }) {
  if (!plan) return null
  // For short-term plans use the user-entered amount; for standard plans use plan.amount
  const isShortTerm = plan.id && ['st1', 'st2', 'st3'].includes(plan.id)
  const numAmount = isShortTerm ? (parseFloat(amount) || 0) : (plan.amount || 0)
  const enough = balance >= numAmount
  const baseAmount = numAmount
  const daily = getWorkloadYield(baseAmount, workload)
  const total = getWorkloadTotalReturn(baseAmount, workload)
  const roi = baseAmount > 0 ? Math.round((total / baseAmount - 1) * 100) : 0
  const planImage = PLAN_IMAGES[plan.id]
  const w = WORKLOAD_MULTIPLIERS[workload] || { multiplier: 1, icon: '⚡', name: 'Standard' }
  const alreadyUsed = plan.once && investments?.some(i => i.planId === plan.id)


  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
          {planImage && (
            <img src={planImage} alt={plan.name} className="w-8 h-8 rounded-lg object-cover border border-white/20" />
          )}
          Deploy Node
        </h3>
        <p className="text-[10px] mb-4 uppercase tracking-widest" style={{ color: '#00B4FF' }}>
          Workload: {w.icon} {w.name}
        </p>

        <div className="rounded-xl p-4 space-y-2 mb-4" style={{ background: 'var(--bg-elevated)' }}>
          {[
            ['Plan', plan.name, ''],
            ['Workload', `${w.icon} ${w.name}`, 'text-cyan-400'],
            ['Multiplier', `${w.multiplier >= 1 ? '+' : ''}${Math.round((w.multiplier - 1) * 100)}%`, w.multiplier >= 1 ? 'text-green-400' : 'text-yellow-400'],
            ['Share Worth', `KSh ${numAmount.toLocaleString()}`, 'text-red-400'],
            ['24h Compute Yield', `KSh ${daily.toLocaleString()}`, 'text-green-400'],
            ['Total Payout', `KSh ${(numAmount * (1 + parseFloat(plan.rate || 0) / 100)).toLocaleString()}`, 'text-yellow-400'],
            ['ROI', `${roi}%`, 'text-cyan-400'],
          ].map(([label, value, cls]) => (
            <div key={label} className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className={`font-semibold ${cls}`}>{value}</span>
            </div>
          ))}
          <hr style={{ borderColor: 'var(--border)' }} />
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>Your Balance</span>
            <span className={`font-semibold ${enough ? 'text-green-400' : 'text-red-400'}`}>
              KSh {balance.toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-xs mb-4 px-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {plan.description}
        </p>

        {alreadyUsed && (
          <div className="bg-yellow-900/40 border border-yellow-700 text-yellow-300 text-sm rounded-lg px-4 py-3 mb-4">
            <p className="font-semibold">Already Deployed</p>
            <p className="text-xs">This is a one-time node. You already own it and it's earning daily.</p>
          </div>
        )}

        {!enough && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            <p className="font-semibold mb-2">Insufficient balance</p>
            <p className="text-xs mb-3">You need KSh {(numAmount - balance).toLocaleString()} more. Top up via M-Pesa to continue.</p>
            <button
              onClick={onDeposit}
              className="w-full bg-red-700 hover:bg-red-600 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              💰 Top Up Now (Min KSh 100)
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={!enough || confirming || alreadyUsed} className="btn-primary flex-1">
            {confirming ? 'Processing...' : 'Confirm & Deploy'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Quick Actions Strip ────────────────────────────────────────────────── */
function QuickActions({ user, showToast }) {
  const navigate = useNavigate()
  const [bonusLoading, setBonusLoading] = useState(false)
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [spinLoading, setSpinLoading] = useState(false)

  useEffect(() => {
    if (!user?.phone) return
    hasClaimedBonusToday(user.phone, 'login_bonus').then(setBonusClaimed).catch(() => {})
  }, [user?.phone])

  async function handleClaimBonus() {
    if (!user?.phone || bonusLoading || bonusClaimed) return
    setBonusLoading(true)
    try {
      const result = await claimDailyLoginBonus(user.phone)
      if (result?.success) {
        showToast(`✅ Claimed KSh ${(result.amount || 50).toLocaleString()} login bonus!`, 'success')
        setBonusClaimed(true)
      } else {
        showToast(result?.message || 'Already claimed today', 'error')
      }
    } catch (e) {
      showToast('Claim failed. Try again.', 'error')
    }
    setBonusLoading(false)
  }

  async function handleSpin() {
    if (!user?.phone || spinLoading) return
    setSpinLoading(true)
    try {
      const result = await claimLuckySpin(user.phone)
      if (result?.success) {
        showToast(`🎉 Won KSh ${(result.amount || 0).toLocaleString()} from Lucky Spin!`, 'success')
      } else {
        showToast(result?.message || 'Not available right now', 'error')
      }
    } catch (e) {
      showToast('Spin failed. Try again.', 'error')
    }
    setSpinLoading(false)
  }

  const actions = [
    { icon: '🎁', label: 'Claim Bonus', onClick: handleClaimBonus, disabled: bonusLoading || bonusClaimed, loading: bonusLoading, badge: bonusClaimed ? 'Done' : null },
    { icon: '🎰', label: 'Lucky Spin', onClick: handleSpin, disabled: spinLoading, loading: spinLoading, badge: null },
    { icon: '💰', label: 'Top Up', onClick: () => navigate('/profile?deposit=1'), disabled: false, loading: false, badge: null },
    { icon: '👥', label: 'Refer', onClick: () => navigate('/profile'), disabled: false, loading: false, badge: null },
    { icon: '🔑', label: 'Promo Code', onClick: () => navigate('/dashboard'), disabled: false, loading: false, badge: null },
  ]

  return (
    <div className="mb-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {actions.map(a => (
          <HapticButton
            key={a.label}
            onClick={a.onClick}
            disabled={a.disabled}
            className="relative flex-shrink-0 flex flex-col items-center gap-1 px-4 py-3 rounded-xl transition-all active:scale-95 hover:scale-105"
            style={{
              background: a.disabled
                ? 'var(--bg-elevated)'
                : 'linear-gradient(135deg, rgba(0,180,255,0.08), rgba(0,180,255,0.02))',
              border: a.disabled ? '1px solid var(--border)' : '1px solid rgba(0,180,255,0.15)',
            }}
          >
            <span className="text-xl">{a.icon}</span>
            <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: a.disabled ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
              {a.loading ? '...' : a.label}
            </span>
            {a.badge && (
              <span className="absolute top-1 right-1 text-[8px] px-1 py-0.5 rounded-full bg-green-600 text-white">
                {a.badge}
              </span>
            )}
          </HapticButton>
        ))}
      </div>
    </div>
  )
}

/* ── Main Plans Page ──────────────────────────────────────────────────── */
export default function PlansPage() {
  const { user, updateUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [selectedWorkload, setSelectedWorkload] = useState('finance')
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [confirming, setConfirming] = useState(false)
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('standard')
  const [shortTermAmounts, setShortTermAmounts] = useState({
    st1: '',
    st2: '',
    st3: '',
  }) // 'standard' or 'short-term'

  useEffect(() => {
    if (!user) return
    getInvestments(user.phone || user.id).then(setInvestments).catch(() => {})
  }, [user])

  const handleLoadingComplete = useCallback(() => {
    setLoading(false)
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500)
  }

  const handleShortTermInvest = (durationHours, amount) => {
    const plan = [
      { id: 'st1', name: '24h Rapid Inference', duration: 24, rate: '3%', color: 'blue', desc: 'Optimized for real-time AI inference and high-frequency data validation.', resource: 'NVIDIA H100' },
      { id: 'st2', name: '3D Neural Cluster', duration: 72, rate: '8%', color: 'indigo', desc: 'Scalable multi-node environment for deep learning model validation and testing.', resource: 'Multi-GPU Cluster' },
      { id: 'st3', name: '7D Enterprise Backbone', duration: 168, rate: '18%', color: 'purple', desc: 'Dedicated infrastructure for large-scale model training and high-availability datasets.', resource: 'Bare Metal Node' },
    ].find(p => p.duration === durationHours)
    
    if (plan) {
      setSelectedPlan(plan)
    }
  }

    const confirmShortTermInvest = async () => {
    const amount = parseFloat(shortTermAmounts[selectedPlan.id])
    if (!amount || amount <= 0) {
      showToast('Please enter a valid amount.', 'error')
      return
    }
    if (amount < 3500) {
      showToast('Minimum amount is KSh 3,500.', 'error')
      return
    }
    if (amount > 75000) {
      showToast('Maximum amount is KSh 75,000.', 'error')
      return
    }
    if ((user?.balance || 0) < amount) {
      showToast('Insufficient balance for this node.', 'error')
      return
    }
    setConfirming(true)
    try {
      const { supabase } = await import('../lib/supabase')
      const { data, error } = await supabase.rpc('create_short_term_investment', {
        p_user_phone: user.phone || user.id,
        p_duration_hours: selectedPlan.duration,
        p_amount: amount
      })
      if (error) throw new Error(error.message)
      // Update balance from RPC response
      if (data?.new_balance !== undefined) {
        updateUser({ balance: data.new_balance })
      } else if (refreshUser) {
        await refreshUser()
      }
      showToast('AI Node Deployed Successfully!', 'success')
      setTimeout(() => {
        setSelectedPlan(null)
        navigate('/dashboard')
      }, 1500)
    } catch (err) {
      const msg = err.message || 'Deployment failed'
      showToast(msg, 'error')
      setConfirming(false)
      // Do NOT close modal on error — keep user on the page
    } finally {
      setConfirming(false)
    }
  }

  async function confirmInvest() {
    const plan = selectedPlan
    if (!plan || !user || confirming) return
    setConfirming(true)

    const userPhone = user.phone || user.id

    try {
      const result = await addInvestment(userPhone, {
        planId: plan.id,
        planName: plan.name,
        amount: plan.amount,
        dailyReturn: getWorkloadYield(plan.amount, selectedWorkload),
        totalReturn: getWorkloadTotalReturn(plan.amount, selectedWorkload),
      })

      if (result?.new_balance !== undefined) {
        updateUser({ balance: result.new_balance })
      } else {
        const fresh = await getUser(userPhone)
        if (fresh) updateUser({ balance: fresh.balance })
      }

      const freshInvs = await getInvestments(userPhone)
      setInvestments(freshInvs)
      setSelectedPlan(null)
      showToast(`✅ Invested KSh ${plan.amount.toLocaleString()} in ${plan.name} (${selectedWorkload})!`)
    } catch (err) {
      console.error('Investment error:', err)
      showToast(`❌ ${err.message || 'Investment failed. Please try again.'}`, 'error')
    }
    setConfirming(false)
  }

  function isOnceUsed(plan) {
    if (!plan.once) return false
    return investments.some(i => i.planId === plan.id)
  }

  // Simulate slot availability (fewer slots = more urgency)
  function getSlots(plan) {
    const seed = plan.amount % 7
    return Math.max(2, 12 - seed - Math.floor(Math.random() * 3))
  }

  if (loading) {
    return <LoadingRitual onComplete={handleLoadingComplete} />
  }

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast.msg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-900 border-red-700 text-red-100'
            : 'bg-green-800 border-green-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}

      {selectedPlan && (
        <ConfirmModal
          plan={selectedPlan}
          workload={selectedWorkload}
          balance={user?.balance || 0}
          onConfirm={['st1', 'st2', 'st3'].includes(selectedPlan.id) ? confirmShortTermInvest : confirmInvest}
          onClose={() => setSelectedPlan(null)}
          confirming={confirming}
          onDeposit={() => { setSelectedPlan(null); navigate("/profile?deposit=1") }}
          amount={['st1', 'st2', 'st3'].includes(selectedPlan.id) ? shortTermAmounts[selectedPlan.id] : selectedPlan.amount}
          investments={investments}
        />
      )}

      {/* Quick Actions Strip */}
      <QuickActions user={user} showToast={showToast} />

      <div className="mb-6">
        <h2 className="text-2xl font-black">AI Compute Nodes</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Deploy enterprise GPU infrastructure and earn AI compute yields
        </p>
      </div>

      {/* Market Pulse */}
      <MarketPulse />

      {/* Global Demand Bar */}
      <GlobalDemandBar />

      {/* Tab Toggle */}
      <div className="flex p-1 bg-gray-900/50 rounded-xl mb-6 border border-white/5">
        <button 
          onClick={() => setActiveTab('standard')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'standard' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-gray-500 hover:text-gray-300'}`}
        >
          AI Nodes — 60D Earn
        </button>
        <button 
          onClick={() => setActiveTab('short-term')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'short-term' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Quick Returns — 24h to 7D Earn
        </button>
      </div>

      {/* Certifications */}
      <PlanCertifications />

      {/* Data Center Status */}
      <DataCenterInfo />

      {/* Balance */}
      <div className="balance-gradient rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs">Available Balance</p>
          <p className="text-2xl font-black">KSh {(user?.balance || 0).toLocaleString()}</p>
        </div>
        <span className="text-3xl">💰</span>
      </div>

      <div className="mb-4 text-xs text-gray-400 text-center">
        <p>All plans run on enterprise-grade infrastructure with 24/7 monitoring</p>
      </div>

      {/* Plans Content */}
      {activeTab === 'standard' ? (
        <div className="rounded-xl overflow-hidden mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(0,180,255,0.12)' }}>
          
          {/* Table Header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,180,255,0.12)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#00B4FF' }}>
                Live Node Market
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Tap any row to deploy
              </p>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="number-wall-table">
              <thead>
                <tr>
                  <th className="text-left">Plan</th>
                  <th>Cost</th>
                  <th>Daily Yield</th>
                  <th>60-Day Total</th>
                  <th>ROI</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map(plan => (
                  <NumberWallRow
                    key={plan.id}
                    plan={plan}
                    workload={selectedWorkload}
                    onClick={(p) => { setSelectedPlan(p); setSelectedWorkload('finance') }}
                    isCritical={plan.amount >= 15000}
                    slots={getSlots(plan)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (compact number wall style) */}
          <div className="md:hidden divide-y" style={{ borderColor: 'rgba(31,41,55,0.4)' }}>
            {PLANS.map(plan => {
              const daily = getWorkloadYield(plan.amount, selectedWorkload)
              const total = getWorkloadTotalReturn(plan.amount, selectedWorkload)
              const roi = Math.round((total / plan.amount - 1) * 100)
              const isCritical = plan.amount >= 15000
              const planImage = PLAN_IMAGES[plan.id]

              return (
                <HapticButton
                  key={plan.id}
                  onClick={() => { setSelectedPlan(plan); setSelectedWorkload('finance') }}
                  className={`w-full text-left px-4 py-3 transition-all ${isCritical ? 'demand-critical' : ''}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {planImage && (
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-white/10">
                        <img src={planImage} alt={plan.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">{plan.name}</p>
                        <p className="text-sm font-black text-white">KSh {plan.amount.toLocaleString()}</p>
                      </div>
                      <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{plan.specs || 'AI Compute'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(31,41,55,0.4)' }}>
                    <div className="text-center">
                      <p className="num-glow-green font-bold text-xs">KSh {daily.toLocaleString()}</p>
                      <p className="text-[8px] text-gray-500">24h</p>
                    </div>
                    <div className="text-center">
                      <p className="num-glow-gold font-bold text-xs">KSh {total.toLocaleString()}</p>
                      <p className="text-[8px] text-gray-500">60-Day</p>
                    </div>
                    <div className="text-center">
                      <p className="text-cyan-400 font-bold text-xs">{roi}%</p>
                      <p className="text-[8px] text-gray-500">ROI</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold text-xs ${isCritical ? 'num-pulse-red' : 'text-gray-300'}`}>
                        {isCritical ? '🔴' : '🟢'} {getSlots(plan)}
                      </p>
                      <p className="text-[8px] text-gray-500">Left</p>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan); setSelectedWorkload('finance') }}
                        className="liquid-gold text-[9px] font-bold px-3 py-1.5 rounded-lg text-white"
                      >
                        Deploy
                      </button>
                    </div>
                  </div>
                </HapticButton>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {/* Section Header */}
          <div className="rounded-xl px-4 py-3 mb-2" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">Quick Returns · Independent from 60D Nodes</p>
            </div>
            <p className="text-[10px] text-gray-400">Deploy a short-term compute node. Your capital and returns are fully independent from 60D investments. Funds return to your balance automatically at maturity.</p>
          </div>

          {/* 24h Rapid Inference */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                    ⚡
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">24h Rapid Inference</h3>
                    <p className="text-[9px] text-emerald-400 uppercase tracking-widest font-semibold">24-Hour Cycle · +3% at Maturity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-400">+3%</p>
                  <p className="text-[9px] text-gray-500">Return at maturity</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Optimized for real-time AI inference and high-frequency data validation. Your capital is locked for 24 hours then returned with profit.</p>
            </div>
            <div className="px-4 pb-4">
              <div className="bg-black/40 rounded-lg p-3 border border-white/5 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-500 uppercase">Your Investment</p>
                  <p className="text-[10px] text-gray-500">Min KSh 3,500 · Max KSh 75,000</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-emerald-400">KSh</p>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    placeholder="Enter amount"
                    value={shortTermAmounts.st1}
                    onChange={(e) => setShortTermAmounts({ ...shortTermAmounts, st1: e.target.value })}
                    className="flex-1 bg-transparent text-lg font-black text-white text-right outline-none focus:ring-0 placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-emerald-900/20 rounded-lg p-2 text-center border border-emerald-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">Duration</p>
                  <p className="text-sm font-bold text-white">24h</p>
                </div>
                <div className="bg-emerald-900/20 rounded-lg p-2 text-center border border-emerald-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">Profit</p>
                  <p className="text-sm font-bold text-emerald-400">{shortTermAmounts.st1 ? `KSh ${((parseFloat(shortTermAmounts.st1) || 0) * 0.03).toLocaleString()}` : '—'}</p>
                </div>
                <div className="bg-emerald-900/20 rounded-lg p-2 text-center border border-emerald-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">You Receive</p>
                  <p className="text-sm font-bold text-yellow-400">{shortTermAmounts.st1 ? `KSh ${((parseFloat(shortTermAmounts.st1) || 0) * 1.03).toLocaleString()}` : '—'}</p>
                </div>
              </div>
              <button 
                onClick={() => handleShortTermInvest(24, parseFloat(shortTermAmounts.st1) || 0)}
                disabled={confirming}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}
              >
                {confirming ? 'Deploying Node...' : 'Deploy 24h Node'}
              </button>
            </div>
          </div>

          {/* 72h Neural Cluster */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}>
                    🛠️
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">3D Neural Cluster</h3>
                    <p className="text-[9px] text-blue-400 uppercase tracking-widest font-semibold">72-Hour Cycle · +8% at Maturity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-blue-400">+8%</p>
                  <p className="text-[9px] text-gray-500">Return at maturity</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Scalable multi-node environment for deep learning model validation. Higher yield, 3-day commitment.</p>
            </div>
            <div className="px-4 pb-4">
              <div className="bg-black/40 rounded-lg p-3 border border-white/5 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-500 uppercase">Your Investment</p>
                  <p className="text-[10px] text-gray-500">Min KSh 3,500 · Max KSh 75,000</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-blue-400">KSh</p>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    placeholder="Enter amount"
                    value={shortTermAmounts.st2}
                    onChange={(e) => setShortTermAmounts({ ...shortTermAmounts, st2: e.target.value })}
                    className="flex-1 bg-transparent text-lg font-black text-white text-right outline-none focus:ring-0 placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-blue-900/20 rounded-lg p-2 text-center border border-blue-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">Duration</p>
                  <p className="text-sm font-bold text-white">72h</p>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-2 text-center border border-blue-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">Profit</p>
                  <p className="text-sm font-bold text-emerald-400">{shortTermAmounts.st2 ? `KSh ${((parseFloat(shortTermAmounts.st2) || 0) * 0.08).toLocaleString()}` : '—'}</p>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-2 text-center border border-blue-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">You Receive</p>
                  <p className="text-sm font-bold text-yellow-400">{shortTermAmounts.st2 ? `KSh ${((parseFloat(shortTermAmounts.st2) || 0) * 1.08).toLocaleString()}` : '—'}</p>
                </div>
              </div>
              <button 
                onClick={() => handleShortTermInvest(72, parseFloat(shortTermAmounts.st2) || 0)}
                disabled={confirming}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 20px rgba(59,130,246,0.25)' }}
              >
                {confirming ? 'Deploying Node...' : 'Deploy 72h Node'}
              </button>
            </div>
          </div>

          {/* 7D Enterprise Backbone */}
          <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(10,12,30,0.95), rgba(6,8,20,0.98))', border: '1px solid rgba(168,85,247,0.15)' }}>
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}>
                    📡
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">7D Enterprise Backbone</h3>
                    <p className="text-[9px] text-purple-400 uppercase tracking-widest font-semibold">168-Hour Cycle · +18% at Maturity</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-purple-400">+18%</p>
                  <p className="text-[9px] text-gray-500">Return at maturity</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mb-3 leading-relaxed">Dedicated bare-metal infrastructure for large-scale model training. Maximum yield for a 7-day commitment.</p>
            </div>
            <div className="px-4 pb-4">
              <div className="bg-black/40 rounded-lg p-3 border border-white/5 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-gray-500 uppercase">Your Investment</p>
                  <p className="text-[10px] text-gray-500">Min KSh 3,500 · Max KSh 75,000</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-purple-400">KSh</p>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    placeholder="Enter amount"
                    value={shortTermAmounts.st3}
                    onChange={(e) => setShortTermAmounts({ ...shortTermAmounts, st3: e.target.value })}
                    className="flex-1 bg-transparent text-lg font-black text-white text-right outline-none focus:ring-0 placeholder:text-gray-600"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-purple-900/20 rounded-lg p-2 text-center border border-purple-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">Duration</p>
                  <p className="text-sm font-bold text-white">168h</p>
                </div>
                <div className="bg-purple-900/20 rounded-lg p-2 text-center border border-purple-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">Profit</p>
                  <p className="text-sm font-bold text-emerald-400">{shortTermAmounts.st3 ? `KSh ${((parseFloat(shortTermAmounts.st3) || 0) * 0.18).toLocaleString()}` : '—'}</p>
                </div>
                <div className="bg-purple-900/20 rounded-lg p-2 text-center border border-purple-500/20">
                  <p className="text-[9px] text-gray-500 uppercase">You Receive</p>
                  <p className="text-sm font-bold text-yellow-400">{shortTermAmounts.st3 ? `KSh ${((parseFloat(shortTermAmounts.st3) || 0) * 1.18).toLocaleString()}` : '—'}</p>
                </div>
              </div>
              <button 
                onClick={() => handleShortTermInvest(168, parseFloat(shortTermAmounts.st3) || 0)}
                disabled={confirming}
                className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)', boxShadow: '0 4px 20px rgba(168,85,247,0.25)' }}
              >
                {confirming ? 'Deploying Node...' : 'Deploy 7D Node'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workload Selector — Standard Nodes only */}
      {activeTab === 'standard' && (
      <div className="card mb-4">
        <p className="text-[10px] uppercase tracking-widest font-semibold mb-3" style={{ color: '#00B4FF' }}>
          Select AI Workload (applies to all plans)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(WORKLOAD_MULTIPLIERS).map(w => {
            const active = selectedWorkload === w.id
            return (
              <HapticButton
                key={w.id}
                onClick={() => setSelectedWorkload(w.id)}
                className={`relative rounded-xl px-2 py-3 text-center transition-all ${
                  active
                    ? 'bg-gradient-to-br from-blue-600/30 to-cyan-600/20 border-2 border-cyan-500 shadow-lg shadow-cyan-500/10'
                    : 'border border-gray-700/50'
                }`}
              >
                <span className="text-xl block mb-1">{w.icon}</span>
                <p className={`text-[10px] font-bold ${active ? 'text-cyan-300' : 'text-gray-300'}`}>{w.name}</p>
                <p className={`text-[9px] mt-1 font-semibold ${
                  w.multiplier > 1 ? 'text-green-400' : w.multiplier >= 0.95 ? 'text-blue-400' : 'text-yellow-400'
                }`}>
                  {w.multiplier >= 1 ? '+' : ''}{Math.round((w.multiplier - 1) * 100)}% yield
                </p>
                {active && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />}
              </HapticButton>
            )
          })}
        </div>
      </div>
      )}
    </div>
  )
}
