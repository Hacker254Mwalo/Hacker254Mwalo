import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getInvestments } from '../lib/db'

const STEPS = [
  {
    id: 'bonus',
    icon: '🎁',
    title: 'Claim Free Daily Bonus',
    desc: 'Get KSh 50 every day just for logging in. No investment needed. Takes 2 seconds.',
    action: '/dashboard',
    actionLabel: 'Claim Now',
    color: 'from-emerald-500 to-green-400',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    tip: 'Come back every day — these small amounts add up to KSh 1,500/month for free',
  },
  {
    id: 'spin',
    icon: '🎰',
    title: 'Spin the Lucky Wheel',
    desc: 'Every Monday & Friday, spin to win up to KSh 5,000 bonus. Works with or without investment.',
    action: '/dashboard',
    actionLabel: 'Check Spin',
    color: 'from-violet-500 to-purple-400',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    tip: 'Monday & Friday are spin days — mark your calendar!',
  },
  {
    id: 'invest',
    icon: '🖥️',
    title: 'Deploy Your First AI Node',
    desc: 'Provision any compute node to get started. Your node runs 24/7 processing AI tasks for enterprise clients. Receive daily yield.',
    action: '/plans',
    actionLabel: 'Choose Plan',
    color: 'from-red-500 to-pink-500',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    tip: 'Pick any node that fits your capacity — even the smallest one starts generating daily yield',
  },
  {
    id: 'execute',
    icon: '⚡',
    title: 'Run Daily Compute Cycle',
    desc: 'After provisioning, execute your 24h compute cycle every day to lock in your yield. One tap.',
    action: '/dashboard',
    actionLabel: 'Dashboard',
    color: 'from-blue-500 to-cyan-400',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    tip: 'Execute daily to maximize your node uptime and yield consistency',
  },
  {
    id: 'refer',
    icon: '👥',
    title: 'Network Referral Program',
    desc: 'Share your code. Receive 10% on L1 + 4% on L2 referrals. Every node they provision contributes to your yield.',
    action: '/profile',
    actionLabel: 'Get Code',
    color: 'from-amber-500 to-yellow-400',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    tip: '10 referrals investing KSh 200 each = KSh 200/month passive commission',
  },
  {
    id: 'promo',
    icon: '🔑',
    title: 'Enter Promo Keywords',
    desc: 'Secret codes from the community give instant bonus. Check Dashboard for the entry field.',
    action: '/dashboard',
    actionLabel: 'Dashboard',
    color: 'from-pink-500 to-rose-400',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
    tip: 'Codes are shared in the community — join the WhatsApp group to get them',
  },
  {
    id: 'transfer',
    icon: '⚡',
    title: 'Transfer Bonus to Balance',
    desc: 'Move your bonus balance to main balance at 8% network fee. Use for investments or withdrawals.',
    action: '/profile',
    actionLabel: 'Transfer',
    color: 'from-cyan-500 to-teal-400',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
    tip: 'KSh 1,000 bonus → KSh 920 main balance. No minimum required.',
  },
  {
    id: 'withdraw',
    icon: '💸',
    title: 'Withdraw to M-Pesa',
    desc: 'Cash out anytime via M-Pesa STK push. Instant. No waiting period. Minimum KSh 200.',
    action: '/profile',
    actionLabel: 'Withdraw',
    color: 'from-green-500 to-emerald-400',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    tip: 'Withdrawals are instant — your M-Pesa will ring within seconds',
  },
]

export default function EarnMoreModal() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dp_earn_modal_done') || '{}') } catch { return {} }
  })
  const [hasInvestment, setHasInvestment] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('dp_earn_modal_dismissed') === 'true' } catch { return false }
  })

  useEffect(() => {
    if (!user?.phone || dismissed) return
    if (user.phone) {
      const d = JSON.parse(localStorage.getItem('dp_earn_modal_dismissed') || 'false')
      if (d === 'true') return
    }
    setShow(true)
    if (user.phone) {
      getInvestments(user.phone).then(invs => setHasInvestment(invs && invs.length > 0)).catch(() => {})
    }
  }, [user?.phone])

  function markDone(id) {
    const next = { ...completed, [id]: true }
    setCompleted(next)
    localStorage.setItem('dp_earn_modal_done', JSON.stringify(next))
  }

  function handleDismiss() {
    setShow(false)
    localStorage.setItem('dp_earn_modal_dismissed', 'true')
  }

  if (!show) return null

  const completedCount = Object.values(completed).filter(Boolean).length

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleDismiss}>
      <div className="card max-w-sm w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} style={{ animation: 'fadeIn 0.3s ease-out' }}>
        {/* Header */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">💡</div>
          <h2 className="text-lg font-black" style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Network Operation Guide
          </h2>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {completedCount > 0
              ? `${completedCount}/${STEPS.length} steps explored — keep going!`
              : 'Follow these steps to maximize your compute yield'}
          </p>
          {!hasInvestment && (
            <p className="text-[10px] mt-1 px-3 py-1 rounded-full inline-block" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              🔒 New to the network? Provision any node to unlock all features.
            </p>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-4 px-1">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(completedCount / STEPS.length) * 100}%`,
                background: 'linear-gradient(90deg, #22c55e, #FFD700)',
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          {STEPS.map((step, i) => (
            <div
              key={step.id}
              className={`rounded-xl p-3 flex items-start gap-3 transition-all ${completed[step.id] ? 'opacity-60' : 'hover:scale-[1.01]'}`}
              style={{ background: step.bg, border: `1px solid ${completed[step.id] ? 'rgba(34,197,94,0.3)' : step.border}` }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 bg-gradient-to-br ${step.color}`}>
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                    {i + 1}
                  </span>
                  <p className="font-bold text-sm">{step.title}</p>
                  {completed[step.id] && <span className="text-[10px] text-green-400">✓</span>}
                </div>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{step.desc}</p>
                <p className="text-[10px] mt-1 italic" style={{ color: completed[step.id] ? 'rgba(34,197,94,0.6)' : '#FFD700' }}>
                  💡 {step.tip}
                </p>
              </div>
              <a
                href={step.action}
                onClick={() => markDone(step.id)}
                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex-shrink-0 bg-gradient-to-r ${step.color} text-white whitespace-nowrap mt-auto self-end`}
              >
                {completed[step.id] ? '✓ Done' : step.actionLabel}
              </a>
            </div>
          ))}
        </div>

        {/* Quick Start CTA */}
        <div className="mt-5 space-y-2">
          {!hasInvestment && (
            <a
              href="/plans"
              onClick={handleDismiss}
              className="w-full block text-center py-3 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', color: '#000' }}
            >
              Start Computing — Provision Your First Node →
            </a>
          )}
          {hasInvestment && (
            <a
              href="/dashboard"
              onClick={handleDismiss}
              className="w-full block text-center py-3 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' }}
            >
              Go to Dashboard & Yield →
            </a>
          )}
        </div>

        {/* Dismiss */}
        <p className="text-center mt-3">
          <button onClick={handleDismiss} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Got it — close this guide
          </button>
        </p>
      </div>
    </div>
  )
}
