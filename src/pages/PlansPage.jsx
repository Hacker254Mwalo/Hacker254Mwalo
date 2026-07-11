import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { saveUser, addInvestment, getInvestments, findUserByReferralCode, addReferral } from '../lib/storage'
import { PLANS, getDailyReturn, getTotalReturn, REF_L1, REF_L2 } from '../lib/plans'


function PlanCard({ plan, onInvest, alreadyUsed }) {
  const daily = getDailyReturn(plan.amount)
  const total = getTotalReturn(plan.amount)

  return (
    <div className="card flex flex-col gap-4 hover:border-gray-600 transition-colors">
      <div className={`bg-gradient-to-r ${plan.color} rounded-xl p-4 flex items-center justify-between`}>
        <div>
          <p className="text-xs text-white/70 font-medium uppercase tracking-widest">{plan.once ? 'One-Time Only' : 'Repeatable'}</p>
          <p className="text-xl font-black text-white mt-1">{plan.icon} {plan.name}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">KSh {plan.amount.toLocaleString()}</p>
          <p className="text-white/70 text-xs">Investment</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-green-400 font-bold text-lg">KSh {daily.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-0.5">Daily Return (3%)</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3 text-center">
          <p className="text-yellow-400 font-bold text-lg">KSh {total.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-0.5">90-Day Total</p>
        </div>
      </div>

      {alreadyUsed ? (
        <div className="text-center text-sm text-gray-500 bg-gray-800 rounded-xl py-3">
          ✓ Already purchased (one-time plan)
        </div>
      ) : (
        <button onClick={() => onInvest(plan)} className="btn-primary w-full">
          Invest Now — KSh {plan.amount.toLocaleString()}
        </button>
      )}
    </div>
  )
}

function ConfirmModal({ plan, balance, onConfirm, onClose }) {
  if (!plan) return null
  const enough = balance >= plan.amount

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">{plan.icon} Confirm Investment</h3>

        <div className="bg-gray-800 rounded-xl p-4 space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Plan</span>
            <span className="font-semibold">{plan.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Amount</span>
            <span className="font-semibold text-red-400">KSh {plan.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Daily Return</span>
            <span className="font-semibold text-green-400">KSh {getDailyReturn(plan.amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">90-Day Total</span>
            <span className="font-semibold text-yellow-400">KSh {getTotalReturn(plan.amount).toLocaleString()}</span>
          </div>
          <hr className="border-gray-700" />
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Your Balance</span>
            <span className={`font-semibold ${enough ? 'text-green-400' : 'text-red-400'}`}>
              KSh {balance.toLocaleString()}
            </span>
          </div>
        </div>

        {!enough && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
            Insufficient balance. Please recharge via M-Pesa first.
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={!enough} className="btn-primary flex-1">
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlansPage() {
  const { user, updateUser } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [toast, setToast] = useState('')
  const investments = user ? getInvestments(user.id) : []

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  function handleInvest(plan) {
    setSelectedPlan(plan)
  }

  function confirmInvest() {
    const plan = selectedPlan
    if (!plan || !user) return

    const newBalance = (user.balance || 0) - plan.amount
    if (newBalance < 0) return

    const investment = addInvestment(user.id, {
      planId: plan.id,
      planName: plan.name,
      amount: plan.amount,
      dailyReturn: getDailyReturn(plan.amount),
      totalReturn: getTotalReturn(plan.amount),
      status: 'active',
    })

    updateUser({ balance: newBalance })
    saveUser(user.id, { balance: newBalance })

    // Handle referral commission on first deposit
    if (user.referredBy && investments.length === 0) {
      // L1 referrer
      const allUsers = JSON.parse(localStorage.getItem('dp_users') || '{}')
      const l1User = allUsers[user.referredBy]
      if (l1User) {
        const l1Commission = Math.floor(plan.amount * 0.10)
        const newL1Balance = (l1User.balance || 0) + l1Commission
        allUsers[user.referredBy] = { ...l1User, balance: newL1Balance }
        addReferral(user.referredBy, {
          referredPhone: user.phone,
          referredName: user.name,
          level: 1,
          commission: l1Commission,
          planName: plan.name,
        })

        // L2 referrer
        if (l1User.referredBy) {
          const l2User = allUsers[l1User.referredBy]
          if (l2User) {
            const l2Commission = Math.floor(plan.amount * 0.04)
            const newL2Balance = (l2User.balance || 0) + l2Commission
            allUsers[l1User.referredBy] = { ...l2User, balance: newL2Balance }
            addReferral(l1User.referredBy, {
              referredPhone: user.phone,
              referredName: user.name,
              level: 2,
              commission: l2Commission,
              planName: plan.name,
            })
          }
        }
        localStorage.setItem('dp_users', JSON.stringify(allUsers))
      }
    }

    setSelectedPlan(null)
    showToast(`✅ Invested KSh ${plan.amount.toLocaleString()} in ${plan.name} plan!`)
  }

  function isOnceUsed(plan) {
    if (!plan.once) return false
    return investments.some(i => i.planId === plan.id)
  }

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {selectedPlan && (
        <ConfirmModal
          plan={selectedPlan}
          balance={user?.balance || 0}
          onConfirm={confirmInvest}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      <div className="mb-6">
        <h2 className="text-2xl font-black">Investment Plans</h2>
        <p className="text-gray-400 text-sm mt-1">3% daily returns • 90-day duration</p>
      </div>

      {/* Balance summary */}
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
            onInvest={handleInvest}
            alreadyUsed={isOnceUsed(plan)}
          />
        ))}
      </div>

    </div>
  )
}
