import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const STEPS = [
  {
    id: 'bonus',
    icon: '🎁',
    title: 'Claim Daily Platform Bonus',
    desc: 'Get a small daily platform bonus just for logging in. Takes 2 seconds.',
    action: '/dashboard',
    actionLabel: 'Claim Now',
    color: 'from-emerald-500 to-green-400',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    tip: 'Return each day to keep up with platform updates and rewards.',
  },
  {
    id: 'spin',
    icon: '🎰',
    title: 'Spin the Lucky Wheel',
    desc: 'Every Monday & Friday, spin for a small surprise reward.',
    action: '/dashboard',
    actionLabel: 'Check Spin',
    color: 'from-violet-500 to-purple-400',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    tip: 'Check back on reward days for a new spin.',
  },
  {
    id: 'compute',
    icon: '🖥️',
    title: 'Explore Compute Plans',
    desc: 'Browse the available GPU compute plans and see what fits your needs.',
    action: '/plans',
    actionLabel: 'Choose Plan',
    color: 'from-red-500 to-pink-500',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    tip: 'Compare plans and explore the platform at your own pace.',
  },
  {
    id: 'dashboard',
    icon: '⚡',
    title: 'Open Your Dashboard',
    desc: 'Visit your dashboard to view platform activity and account details.',
    action: '/dashboard',
    actionLabel: 'Dashboard',
    color: 'from-blue-500 to-cyan-400',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    tip: 'Use the dashboard to stay up to date with platform activity.',
  },
  {
    id: 'refer',
    icon: '👥',
    title: 'Invite Friends',
    desc: 'Share your referral code to invite others to the platform.',
    action: '/profile',
    actionLabel: 'Get Code',
    color: 'from-amber-500 to-yellow-400',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    tip: 'Invite people who may benefit from the platform.',
  },
  {
    id: 'support',
    icon: '🔑',
    title: 'Get Support',
    desc: 'Find help and platform guidance from the dashboard or support page.',
    action: '/dashboard',
    actionLabel: 'Dashboard',
    color: 'from-pink-500 to-rose-400',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
    tip: 'Support info is always available if you need help.',
  },
  {
    id: 'account',
    icon: '⚙️',
    title: 'Manage Account',
    desc: 'Update your profile and settings whenever you need to.',
    action: '/profile',
    actionLabel: 'Profile',
    color: 'from-cyan-500 to-teal-400',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
    tip: 'Keep your profile details up to date.',
  },
  {
    id: 'activity',
    icon: '💸',
    title: 'Review Platform Activity',
    desc: 'See your recent platform actions and account history in one place.',
    action: '/profile',
    actionLabel: 'Profile',
    color: 'from-green-500 to-emerald-400',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
    tip: 'Your recent activity is always available in your account area.',
  },
]

export default function EarnMoreModal() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [completed, setCompleted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dp_earn_modal_done') || '{}') } catch { return {} }
  })
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
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">💡</div>
          <h2 className="text-lg font-black" style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Platform Guide
          </h2>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            {completedCount > 0
              ? `${completedCount}/${STEPS.length} items explored — keep going!`
              : 'Explore the key areas of the platform'}
          </p>
        </div>

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

        <div className="mt-5">
          <a
            href="/plans"
            onClick={handleDismiss}
            className="w-full block text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', color: '#000' }}
          >
            Explore Plans →
          </a>
        </div>

        <p className="text-center mt-3">
          <button onClick={handleDismiss} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Close this guide
          </button>
        </p>
      </div>
    </div>
  )
}
