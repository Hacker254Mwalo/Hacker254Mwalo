import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInvestments, addInvestment, getUser } from '../lib/db'
import { PLANS, getDailyReturn, getTotalReturn } from '../lib/plans'

function PlanCard({ plan, onInvest, alreadyUsed }) {
  const daily = getDailyReturn(plan.amount)
  const total = getTotalReturn(plan.amount)

  return (
    <div className="card flex flex-col gap-4 hover:border-gray-600 transition-colors">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${plan.color} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <p className="text-[10px] text-white/70 font-semibold uppercase tracking-widest">{plan.once ? 'One-Time Only' : 'Repeatable'}</p>
          <p className="text-lg font-black text-white mt-1">{plan.icon} {plan.name}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white">KSh {plan.amount.toLocaleString()}</p>
          <p className="text-white/60 text-[10px] uppercase tracking-wider mt-0.5">Share Worth</p>
        </div>
      </div>

      {/* Specs badge */}
      {plan.specs && (
        <div className="rounded-lg px-3 py-2 flex flex-wrap gap-1.5" style={{ background: 'var(--bg-elevated)' }}>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 border border-blue-700/30">
            {plan.specs}
          </span>
        </div>
      )}

      {/* Yield breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-green-400 font-bold text-base">KSh {daily.toLocaleString()}</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>24h Yield</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-yellow-400 font-bold text-base">KSh {total.toLocaleString()}</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>90-Day Total</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-cyan-400 font-bold text-base">{Math.round((total / plan.amount - 1) * 100)}%</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>ROI</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed px-1" style={{ color: 'var(--text-secondary)' }}>
        {plan.description}
      </p>

      {/* Action button */}
      {alreadyUsed ? (
        <div className="text-center text-sm rounded-xl py-3" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
          ✓ Already purchased (one-time plan)
        </div>
      ) : (
        <button onClick={() => onInvest(plan)} className="btn-primary w-full text-sm">
          Deploy Node — {plan.shareWorth}
        </button>
      )}
    </div>
  )
}

function ConfirmModal({ plan, balance, onConfirm, onClose, confirming, onDeposit }) {
  if (!plan) return null
  const enough = balance >= plan.amount

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{plan.icon} Deploy Node</h3>

        <div className="rounded-xl p-4 space-y-2 mb-4" style={{ background: 'var(--bg-elevated)' }}>
          {[
            ['Plan', plan.name, ''],
            ['Share Worth', `KSh ${plan.amount.toLocaleString()}`, 'text-red-400'],
            ['24h Compute Yield', `KSh ${getDailyReturn(plan.amount).toLocaleString()}`, 'text-green-400'],
            ['90-Day Total Yield', `KSh ${getTotalReturn(plan.amount).toLocaleString()}`, 'text-yellow-400'],
            ['ROI', `${Math.round((getTotalReturn(plan.amount) / plan.amount - 1) * 100)}%`, 'text-cyan-400'],
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

        {!enough && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            <p className="font-semibold mb-2">Insufficient balance</p>
            <p className="text-xs mb-3">You need KSh {(plan.amount - balance).toLocaleString()} more. Deposit via M-Pesa to continue.</p>
            <button
              onClick={onDeposit}
              className="w-full bg-red-700 hover:bg-red-600 text-white text-xs font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              📱 Deposit Now (Min KSh 100)
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={!enough || confirming} className="btn-primary flex-1">
            {confirming ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [confirming, setConfirming] = useState(false)
  const [investments, setInvestments] = useState([])

  useEffect(() => {
    if (!user) return
    getInvestments(user.phone || user.id).then(setInvestments).catch(() => {})
  }, [user])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500)
  }

  async function confirmInvest() {
    const plan = selectedPlan
    if (!plan || !user || confirming) return
    setConfirming(true)

    const userPhone = user.phone || user.id

    try {
      // atomic_invest handles: balance deduction + investment insert + referral commissions
      const result = await addInvestment(userPhone, {
        planId: plan.id,
        planName: plan.name,
        amount: plan.amount,
        dailyReturn: getDailyReturn(plan.amount),
        totalReturn: getTotalReturn(plan.amount),
      })

      // Update local user balance from DB result
      if (result?.new_balance !== undefined) {
        updateUser({ balance: result.new_balance })
      } else {
        // Fallback: fetch fresh user data
        const fresh = await getUser(userPhone)
        if (fresh) updateUser({ balance: fresh.balance })
      }

      const freshInvs = await getInvestments(userPhone)
      setInvestments(freshInvs)
      setSelectedPlan(null)
      showToast(`✅ Invested KSh ${plan.amount.toLocaleString()} in ${plan.name} plan!`)
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
          balance={user?.balance || 0}
          onConfirm={confirmInvest}
          onClose={() => setSelectedPlan(null)}
          confirming={confirming}
          onDeposit={() => { setSelectedPlan(null); navigate('/profile?deposit=1') }}
        />
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-black">AI Compute Nodes</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Invest in GPU compute infrastructure and earn 24h yields daily</p>
      </div>

      <div className="balance-gradient rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs">Available Balance</p>
          <p className="text-2xl font-black">KSh {(user?.balance || 0).toLocaleString()}</p>
        </div>
        <span className="text-3xl">💰</span>
      </div>

      <div className="grid gap-4">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onInvest={setSelectedPlan}
            alreadyUsed={isOnceUsed(plan)}
          />
        ))}
      </div>
    </div>
  )
}
