import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { isFirstLogin, hasSeenOnboarding, markOnboardingSeen } from '../lib/storage'

const EARN_METHODS = [
  {
    icon: '🖥️',
    title: 'Deploy GPU Nodes',
    desc: 'Invest in enterprise AI compute infrastructure and earn daily yield',
    color: 'from-red-500 to-pink-500',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    action: '/plans',
    actionLabel: 'Browse Plans',
  },
  {
    icon: '🎁',
    title: 'Daily Login Bonus',
    desc: 'Claim KSh 50 free every day — no investment required',
    color: 'from-emerald-500 to-green-400',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    action: '/dashboard',
    actionLabel: 'Dashboard',
  },
  {
    icon: '🎰',
    title: 'Lucky Spin',
    desc: 'Spin the wheel every Mon & Fri for bonus KSh up to 5,000',
    color: 'from-violet-500 to-purple-400',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    action: '/dashboard',
    actionLabel: 'Dashboard',
  },
  {
    icon: '👥',
    title: 'Refer & Earn',
    desc: 'Share your code — earn 10% L1 + 4% L2 on every referral investment',
    color: 'from-blue-500 to-cyan-400',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    action: '/profile',
    actionLabel: 'Get Code',
  },
  {
    icon: '🔑',
    title: 'Promo Keywords',
    desc: 'Enter secret codes from WhatsApp group for instant bonus',
    color: 'from-amber-500 to-yellow-400',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    action: '/dashboard',
    actionLabel: 'Dashboard',
  },
  {
    icon: '⚡',
    title: 'Bonus Transfer',
    desc: 'Transfer bonus balance to main balance at 8% network fee',
    color: 'from-pink-500 to-rose-400',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
    action: '/profile',
    actionLabel: 'Profile',
  },
]

export default function EarnMoreModal() {
  const { user } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!user?.phone) return
    const first = isFirstLogin(user.phone)
    const seen = hasSeenOnboarding(user.phone)
    if (first && !seen) {
      setShow(true)
    }
  }, [user?.phone])

  function handleClose() {
    if (user?.phone) markOnboardingSeen(user.phone)
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <div className="card max-w-sm w-full max-h-[85vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-xl font-black" style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Welcome to Dumiropay!
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            6 ways to make money — start earning right now
          </p>
        </div>

        {/* Methods grid */}
        <div className="space-y-2.5">
          {EARN_METHODS.map((m, i) => (
            <div
              key={m.title}
              className="rounded-xl p-3 flex items-start gap-3 transition-all hover:scale-[1.01]"
              style={{ background: m.bg, border: `1px solid ${m.border}` }}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br ${m.color}`}>
                {m.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{m.title}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{m.desc}</p>
              </div>
              <a
                href={m.action}
                onClick={handleClose}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 bg-gradient-to-r ${m.color} text-white whitespace-nowrap`}
              >
                {m.actionLabel} →
              </a>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-5">
          <a
            href="/plans"
            onClick={handleClose}
            className="w-full block text-center py-3 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', color: '#000' }}
          >
            Start Earning Now →
          </a>
        </div>

        {/* Dismiss */}
        <p className="text-center mt-3">
          <button onClick={handleClose} className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            I'll explore later
          </button>
        </p>
      </div>
    </div>
  )
}
