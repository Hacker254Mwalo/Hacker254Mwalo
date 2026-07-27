import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { executeComputeCycle } from '../lib/db'

/**
 * Left-side animated earnings panel on dashboard.
 * Shows today's earnings for active investments, or a tempting CTA if no investment.
 * Slides in from the left with a subtle float animation.
 */
export default function EarningsPanel({ user, activeInvestments, hasActiveInvestment, onToast }) {
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Calculate today's earnings from active investments
  let todayEarnings = 0
  if (activeInvestments.length > 0) {
    // Sum daily returns from all active investments
    todayEarnings = activeInvestments.reduce((sum, inv) => sum + Number(inv.dailyReturn || 0), 0)
  }

  if (!visible) return null

  return (
    <div
      className="earnings-panel-card rounded-2xl p-4 mb-5 relative overflow-hidden"
      style={{
        animation: 'earningsSlideIn 0.6s ease-out forwards',
      }}
    >
      {hasActiveInvestment ? (
        /* ── User has active investment — show today's earnings ── */
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="earnings-pulse-dot" />
              <p className="text-xs font-bold tracking-wider uppercase" style={{ color: '#FFD700' }}>
                Today's Earnings
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700' }}>
              LIVE
            </span>
          </div>
          <p className="text-2xl font-black mb-2" style={{ color: '#34D399' }}>
            KSh {todayEarnings.toLocaleString()}
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            from {activeInvestments.length} active {activeInvestments.length === 1 ? 'node' : 'nodes'}
          </p>
          {activeInvestments.slice(0, 2).map(inv => (
            <div
              key={inv.id}
              className="flex items-center justify-between py-1.5 border-t border-white/5"
            >
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{inv.planName}</span>
              <span className="text-xs font-semibold" style={{ color: '#34D399' }}>
                +KSh {Number(inv.dailyReturn || 0).toLocaleString()}
              </span>
            </div>
          ))}
          {activeInvestments.length > 2 && (
            <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              +{activeInvestments.length - 2} more
            </p>
          )}
        </>
      ) : (
        /* ── No investment — show tempting CTA ── */
        <>
          <div className="text-center py-2">
            <p className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: '#FFD700' }}>
              Your Earning Journey Starts Here
            </p>
            <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
              Start earning daily from
            </p>
            <p className="text-xl font-black mb-1" style={{ color: '#34D399' }}>
              KSh 150/day
            </p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              with just KSh 5,000 investment
            </p>
            <button
              onClick={() => navigate('/plans')}
              className="earnings-cta-btn w-full text-sm py-2.5 rounded-xl font-semibold transition-all"
            >
              Choose Your First Plan →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
