import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getInvestments,
  hasClaimedBonusToday,
  claimDailyLoginBonus,
  claimLuckySpin,
  sendSupportMessage,
  getSupportMessages,
  claimKeyword,
  addLoan,
  getWhatsAppSettings,
  checkIsAdmin,
  getClaimedKeywords,
  executeComputeCycle,
} from '../lib/db'

const SPIN_DAYS = [1, 5] // Monday=1, Friday=5

function isTodaySpinDay() {
  return SPIN_DAYS.includes(new Date().getDay())
}

function Toast({ msg, type }) {
  if (!msg) return null
  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-medium border ${
      type === 'error'
        ? 'bg-red-900 border-red-700 text-red-100'
        : 'bg-green-800 border-green-600 text-white'
    }`}>
      {msg}
    </div>
  )
}

/** Shown when user tries to access a feature that needs an active investment */
function InvestFirstModal({ onClose, onGoInvest, onGoDeposit, hasBalance }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-3">🔒</div>
        <h3 className="text-xl font-bold mb-2">Active Investment Required</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          This feature is only available to members with an active investment.
          {hasBalance
            ? ' You have balance — go invest now to unlock this!'
            : ' Please deposit at least KSh 100, then invest to unlock this feature.'}
        </p>
        <div className="space-y-3">
          {hasBalance ? (
            <button onClick={onGoInvest} className="btn-primary w-full">
              📈 Go Invest Now
            </button>
          ) : (
            <>
              <button onClick={onGoDeposit} className="btn-primary w-full">
                📱 Deposit via M-Pesa
              </button>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Minimum deposit: KSh 100 · Then invest to unlock all features
              </p>
            </>
          )}
          <button onClick={onClose} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function PromoModal({ onClose, onClaim }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  async function submit() {
    if (!code.trim()) return
    setLoading(true)
    const res = await onClaim(code.trim())
    setResult(res)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">🎟️ Redeem Code</h3>
        {!result ? (
          <>
            <input
              className="input-field mb-4 uppercase tracking-widest font-mono"
              placeholder="Enter promo code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && submit()}
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submit} disabled={loading || !code.trim()} className="btn-primary flex-1">
                {loading ? 'Checking...' : 'Redeem'}
              </button>
            </div>
          </>
        ) : result.success ? (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-green-400 font-bold text-lg">Bonus Credited!</p>
            <p className="text-2xl font-black mt-2">+KSh {(result.bonus || result.amount || 0).toLocaleString()}</p>
            <button onClick={onClose} className="btn-primary w-full mt-6">Awesome!</button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">❌</p>
            <p className="text-red-400 font-semibold">{result.message}</p>
            <button onClick={onClose} className="btn-secondary w-full mt-6">Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

function LoanModal({ onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const MIN = 500; const MAX = 250000

  async function submit() {
    const amt = parseInt(amount)
    if (!amt || amt < MIN || amt > MAX) { setError(`Amount must be KSh ${MIN.toLocaleString()}–${MAX.toLocaleString()}`); return }
    setLoading(true); setError('')
    try {
      await onSubmit(amt, purpose)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Failed to submit loan request')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">🏦 Request Loan</h3>
        {!done ? (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Loan Amount (KSh {MIN.toLocaleString()}–{MAX.toLocaleString()})</label>
                <input className="input-field" type="number" min={MIN} max={MAX} placeholder="e.g. 5000" value={amount} onChange={e => { setAmount(e.target.value); setError('') }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Purpose (optional)</label>
                <textarea className="input-field resize-none" rows={3} placeholder="What is the loan for?" value={purpose} onChange={e => setPurpose(e.target.value)} />
              </div>
            </div>
            {error && <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={submit} disabled={loading || !amount} className="btn-primary flex-1">{loading ? 'Submitting...' : 'Submit Request'}</button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-green-400 font-bold">Loan Request Submitted!</p>
            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Admin will review and disburse within 24 hours.</p>
            <button onClick={onClose} className="btn-primary w-full mt-6">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function SupportModal({ user, onClose }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      const msgs = await getSupportMessages(user.phone || user.id)
      setMessages(msgs)
    } catch { /* silent */ }
  }, [user])

  useEffect(() => {
    load()
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [load])

  async function send() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      await sendSupportMessage(user.phone || user.id, text.trim(), 'user')
      setText('')
      await load()
    } catch { /* silent */ }
    setSending(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full flex flex-col h-[70vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">💬 Support Chat</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1">
          {messages.length === 0 && (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>No messages yet. Say hello! 👋</p>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                m.sender_type === 'user'
                  ? 'bg-red-600 text-white rounded-br-sm'
                  : 'bg-gray-700 text-gray-100 rounded-bl-sm'
              }`}>
                {m.message}
                <p className="text-xs opacity-60 mt-1">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input-field flex-1 text-sm py-2"
            placeholder="Type a message..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button onClick={send} disabled={sending || !text.trim()} className="btn-primary px-4 py-2 text-sm">Send</button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, updateUser, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [activeInvestments, setActiveInvestments] = useState([])
  const [showPromo, setShowPromo] = useState(false)
  const [showLoan, setShowLoan] = useState(false)
  const [showContactAdmin, setShowContactAdmin] = useState(false)
  const [showInvestFirst, setShowInvestFirst] = useState(false)
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [spinClaimed, setSpinClaimed] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [spinAnimAmount, setSpinAnimAmount] = useState(0)
  const [spinAnimPrize, setSpinAnimPrize] = useState(0)
  const [showSpinResult, setShowSpinResult] = useState(false)
  const [claimingBonus, setClaimingBonus] = useState(false)
  const [claimedCodes, setClaimedCodes] = useState([])
  const [waPhone, setWaPhone] = useState('')
  const [waGroupLink, setWaGroupLink] = useState('')

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500)
  }

  const loadData = useCallback(async () => {
    if (!user) return
    const phone = user.phone || user.id
    try {
      const [invs, bonusStatus, spinStatus, waSettings] = await Promise.all([
        getInvestments(phone),
        hasClaimedBonusToday(phone, 'login_bonus'),
        hasClaimedBonusToday(phone, 'spin'),
        getWhatsAppSettings(),
      ])
      setActiveInvestments((invs || []).filter(i => i.status === 'active'))
      setBonusClaimed(bonusStatus)
      setSpinClaimed(spinStatus)
      setWaPhone(waSettings.whatsapp_phone || '')
      setWaGroupLink(waSettings.whatsapp_group_link || '')
      const claimed = await getClaimedKeywords(phone)
      setClaimedCodes((claimed || []).map(c => c.keyword_id))
    } catch { /* silent */ }
  }, [user])
  useEffect(() => { loadData() }, [loadData])

  const hasActiveInvestment = activeInvestments.length > 0
  const userBalance = user?.balance || 0
  const [executingId, setExecutingId] = useState(null)
  const [execStage, setExecStage] = useState(0)

  function getExecTimeRemaining(inv) {
    const last = inv.lastExecutedAt ? new Date(inv.lastExecutedAt) : new Date(Date.now() - 25 * 3600000)
    const next = new Date(last.getTime() + 24 * 3600000)
    const remaining = next - new Date()
    if (remaining <= 0) return null // eligible
    const h = Math.floor(remaining / 3600000)
    const m = Math.floor((remaining % 3600000) / 60000)
    const s = Math.floor((remaining % 60000) / 1000)
    return { h, m, s, ms: remaining }
  }

  async function handleExecuteCycle(inv) {
    if (executingId) return
    setExecutingId(inv.id)
    setExecStage(1)
    try {
      // Stage 1: Allocating
      await new Promise(r => setTimeout(r, 1600))
      setExecStage(2)
      // Stage 2: Processing
      await new Promise(r => setTimeout(r, 1800))
      setExecStage(3)
      // Stage 3: Complete — call RPC
      await new Promise(r => setTimeout(r, 1600))
      const result = await executeComputeCycle(inv.id, user.phone || user.id)
      if (result.success) {
        showToast(`Compute cycle complete. +KSh ${Number(result.yield).toLocaleString()} yield`, 'success')
        await loadData()
      } else {
        showToast(result.error || 'Execute failed', 'error')
      }
    } catch (e) {
      showToast('Execute failed: ' + (e.message || 'unknown error'), 'error')
    }
    setExecutingId(null)
    setExecStage(0)
  }

  /** Redirect helper: first tell user to invest, then if no balance → deposit */
  function requireInvestment(action) {
    if (!hasActiveInvestment) {
      setShowInvestFirst(true)
      return false
    }
    return true
  }

  function handleInvestFirstGoInvest() {
    setShowInvestFirst(false)
    navigate('/plans')
  }

  function handleInvestFirstGoDeposit() {
    setShowInvestFirst(false)
    navigate('/profile?deposit=1')
  }

  async function handleClaimBonus() {
    if (bonusClaimed || claimingBonus || !user) return
    // Require active investment
    if (!hasActiveInvestment) {
      setShowInvestFirst(true)
      return
    }
    setClaimingBonus(true)
    try {
      const result = await claimDailyLoginBonus(user.phone || user.id)
      if (result.success) {
        setBonusClaimed(true)
        if (result.balance !== undefined) updateUser({ balance: result.balance })
        else await refreshUser()
        showToast(`🎁 Daily bonus of KSh ${Number(result.amount || 10).toLocaleString()} collected!`)
      } else if (result.code === 'NO_ACTIVE_INVESTMENT') {
        setShowInvestFirst(true)
      } else {
        showToast(result.message || 'Already claimed today.', 'error')
        setBonusClaimed(true)
      }
    } catch (err) {
      showToast(err.message || 'Failed to collect daily bonus', 'error')
    }
    setClaimingBonus(false)
  }

  async function handleSpin() {
    if (spinClaimed || spinning || !user) return
    if (!isTodaySpinDay()) {
      showToast('Lucky Spin is available on Mondays and Fridays only!', 'error')
      return
    }
    if (!hasActiveInvestment) {
      setShowInvestFirst(true)
      return
    }
    setShowSpinResult(false)
    setSpinning(true)
    setSpinAnimAmount(0)
    setSpinAnimPrize(0)

    // Show spinning numbers animation immediately
    const bigAmounts = [500, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000, 3000]
    let animIdx = 0
    const spinInterval = setInterval(() => {
      setSpinAnimAmount(bigAmounts[animIdx % bigAmounts.length])
      animIdx++
    }, 100)

    try {
      // Spin for 2.5 seconds of animation
      await new Promise(resolve => setTimeout(resolve, 2500))
      clearInterval(spinInterval)

      // Now call the real RPC to get the actual prize
      const result = await claimLuckySpin(user.phone || user.id)

      if (result.success) {
        setSpinClaimed(true)
        if (result.balance !== undefined) updateUser({ balance: result.balance })
        else await refreshUser()

        const realPrize = Number(result.amount)
        // Show the big animated number then reveal real prize
        setSpinAnimAmount(realPrize)
        setSpinAnimPrize(realPrize)
        setShowSpinResult(true)
      } else if (result.code === 'NO_ACTIVE_INVESTMENT') {
        clearInterval(spinInterval)
        setShowInvestFirst(true)
      } else {
        clearInterval(spinInterval)
        showToast(result.message || 'Already spun today.', 'error')
        if (result.code === 'ALREADY_SPUN') setSpinClaimed(true)
      }
    } catch (err) {
      clearInterval(spinInterval)
      showToast(err.message || 'Spin failed', 'error')
    }
    setSpinning(false)
  }

  function handleOpenPromo() {
    if (!hasActiveInvestment) {
      setShowInvestFirst(true)
      return
    }
    setShowPromo(true)
  }

  async function handlePromo(code) {
    if (!user) return { success: false, message: 'Not logged in' }
    try {
      const result = await claimKeyword(user.phone || user.id, code)
      if (result.success) {
        if (result.bonus_balance !== undefined) updateUser({ bonus_balance: result.bonus_balance })
        else await refreshUser()
        // Refresh claimed codes list
        try {
          const claimed = await getClaimedKeywords(user.phone || user.id)
          setClaimedCodes((claimed || []).map(c => c.keyword_id))
        } catch { /* silent */ }
      } else if (result.message?.includes('already claimed')) {
        showToast(result.message, 'error')
      }
      return result
    } catch (err) {
      return { success: false, message: err.message || 'Failed to redeem code' }
    }
  }

  function handleOpenLoan() {
    if (!hasActiveInvestment) {
      setShowInvestFirst(true)
      return
    }
    setShowLoan(true)
  }

  async function handleLoan(amount, purpose) {
    if (!user) throw new Error('Not logged in')
    if (!hasActiveInvestment) {
      setShowInvestFirst(true)
      throw new Error('An active investment is required before requesting a loan.')
    }
    return addLoan(user.phone || user.id, { amount, purpose })
  }

  const isAdmin = user?.isAdmin === true
  const todayIsSpinDay = isTodaySpinDay()
  const waDigits = waPhone.replace(/\D/g, '')

  // AI GPU Compute theme style constants
  const NEON_CARD_STYLE = {
    background: 'linear-gradient(145deg, rgba(10,12,30,0.95) 0%, rgba(6,8,20,0.98) 100%)',
    border: '1px solid rgba(0,180,255,0.15)',
    borderRadius: '16px',
    boxShadow: '0 0 20px rgba(0,180,255,0.05), inset 0 0 20px rgba(0,180,255,0.02)',
  }
  const SECTION_LABEL = {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    color: '#00B4FF',
    marginBottom: '12px',
  }

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      <Toast msg={toast.msg} type={toast.type} />

      {showInvestFirst && (
        <InvestFirstModal
          onClose={() => setShowInvestFirst(false)}
          onGoInvest={handleInvestFirstGoInvest}
          onGoDeposit={handleInvestFirstGoDeposit}
          hasBalance={userBalance >= 200}
        />
      )}
      {showPromo && <PromoModal onClose={() => setShowPromo(false)} onClaim={handlePromo} />}
      {showLoan && <LoanModal onClose={() => setShowLoan(false)} onSubmit={handleLoan} />}
      {showContactAdmin && <SupportModal user={user} onClose={() => setShowContactAdmin(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-black">{user?.name?.split(' ')[0] || 'Investor'} 👋</h2>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => navigate('/admin')} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
              ⚙️ Admin
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center font-black">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>

      {/* Balance Card with Golden Money Animation */}
      <div className="balance-gradient rounded-2xl p-5 mb-6 relative overflow-hidden">
        {/* Shimmer sweep */}
        <div className="balance-shimmer" />

        {/* Floating coins */}
        <div className="coin-particle" />
        <div className="coin-particle" />
        <div className="coin-particle" />
        <div className="coin-particle" />
        <div className="coin-particle" />
        <div className="coin-particle" />
        <div className="coin-particle" />

        {/* Gold sparkles */}
        <div className="sparkle-particle">✦</div>
        <div className="sparkle-particle">✦</div>
        <div className="sparkle-particle">✦</div>
        <div className="sparkle-particle">✦</div>
        <div className="sparkle-particle">✦</div>
        <div className="sparkle-particle">✦</div>
        <div className="sparkle-particle">✦</div>
        <div className="sparkle-particle">✦</div>

        {/* Floating money symbols */}
        <div className="money-symbol">💰</div>
        <div className="money-symbol">💵</div>
        <div className="money-symbol">🪙</div>
        <div className="money-symbol">💴</div>
        <div className="money-symbol">💸</div>
        <div className="money-symbol">🏦</div>

        {/* Background money tree */}
        <div className="money-tree-bg">🌳</div>

        {/* Content (above animations) */}
        <div className="relative z-10">
          <p className="text-gray-400 text-sm mb-1">Total Balance</p>
          <p className="text-4xl font-black balance-text-glow">KSh {(user?.balance || 0).toLocaleString()}</p>
          {(user?.bonusBalance || 0) > 0 && (
            <p className="text-yellow-400 text-sm mt-1">+ KSh {(user.bonusBalance || 0).toLocaleString()} bonus</p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => navigate('/plans')} className="btn-primary flex-1 text-sm py-2.5">Deploy Node</button>
            <button onClick={() => navigate('/profile')} className="btn-secondary flex-1 text-sm py-2.5">Withdraw</button>
          </div>
        </div>
      </div>

      {/* No Investment Banner */}
      {!hasActiveInvestment && (
        <div className="rounded-2xl p-4 mb-5 border border-yellow-700/50 bg-yellow-900/20 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="font-semibold text-yellow-300 text-sm">No Active Node</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Deploy a node to unlock daily bonus, lucky spin, promo codes &amp; loans.
            </p>
          </div>
          <button
            onClick={() => navigate('/plans')}
            className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-2 rounded-xl font-semibold whitespace-nowrap"
          >
            Deploy →
          </button>
        </div>
      )}

      {/* Daily Bonus */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">🎁 Daily Login Bonus</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {!hasActiveInvestment
                ? 'Requires active investment to claim'
                : bonusClaimed
                  ? 'Claimed today — come back tomorrow!'
                  : 'Tap Claim to collect your KSh 10 daily bonus'}
            </p>
          </div>
          <button
            onClick={handleClaimBonus}
            disabled={bonusClaimed || claimingBonus}
            className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
              bonusClaimed
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : !hasActiveInvestment
                  ? 'bg-gray-700 text-gray-400 cursor-pointer hover:bg-yellow-800'
                  : 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
            }`}
          >
            {claimingBonus ? '...' : bonusClaimed ? '✓ Claimed' : !hasActiveInvestment ? '🔒' : 'Claim'}
          </button>
          {bonusClaimed && (() => {
            const now = new Date()
            const nextMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
            const diff = nextMidnight - now
            const h = Math.floor(diff / 3600000)
            const m = Math.floor((diff % 3600000) / 60000)
            const s = Math.floor((diff % 60000) / 1000)
            return (
              <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                Next in {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
              </span>
            )
          })()}
        </div>
      </div>

      {/* Lucky Spin Card */}
      <div className={`card mb-6 ${!todayIsSpinDay ? 'opacity-60' : ''}`}>
        {showSpinResult ? (
          <div className="text-center py-4">
            <p className="text-3xl mb-2">🎉</p>
            <p className="text-xl font-bold text-green-400 mb-1">
              KSh {spinAnimPrize.toLocaleString()}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Your lucky spin prize has been added to your balance!
            </p>
          </div>
        ) : spinning ? (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">🎰</p>
            <div className="relative overflow-hidden h-12 flex items-center justify-center">
              <p
                className="text-2xl font-black text-yellow-400"
                style={{
                  animation: 'spinFlash 0.15s ease-in-out infinite',
                }}
              >
                KSh {spinAnimAmount.toLocaleString()}
              </p>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              Spinning the wheel...
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">🎰 Lucky Spin</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {!todayIsSpinDay
                  ? 'Available on Mondays & Fridays'
                  : !hasActiveInvestment
                    ? 'Requires active investment to spin'
                    : spinClaimed
                      ? 'Already spun today!'
                      : 'Random active investment • reward is 3% of its daily profit'}
              </p>
            </div>
            <button
              onClick={handleSpin}
              disabled={spinClaimed || spinning || !todayIsSpinDay}
              className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
                spinClaimed || !todayIsSpinDay
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : !hasActiveInvestment
                    ? 'bg-gray-700 text-gray-400 cursor-pointer hover:bg-yellow-800'
                    : 'bg-yellow-600 hover:bg-yellow-500 text-white active:scale-95'
              }`}
            >
              {spinClaimed ? '✓ Done' : !hasActiveInvestment ? '🔒' : 'Spin!'}
            </button>
          </div>
        )}
      </div>

      {/* Quick Services */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Quick Services</p>
        <div className="grid grid-cols-3 gap-3">
          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-blue-700"
            onClick={() => showToast('Coming Soon 📶')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xl">📶</div>
            <p className="font-semibold text-xs text-center">Buy Airtime</p>
          </div>

          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-teal-700"
            onClick={handleOpenPromo}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-xl">
              {hasActiveInvestment ? '🎟️' : '🔒'}
            </div>
            <p className="font-semibold text-xs text-center">Redeem Code</p>
          </div>

          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-purple-700"
            onClick={handleOpenLoan}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl">
              {hasActiveInvestment ? '🏦' : '🔒'}
            </div>
            <p className="font-semibold text-xs text-center">Request Loan</p>
          </div>

          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-green-700"
            onClick={() => setShowContactAdmin(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-xl">💬</div>
            <p className="font-semibold text-xs text-center">Contact Admin</p>
          </div>
        </div>
      </div>

      {/* Invest CTA */}
      <div className="card mb-6 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 border-red-900/40 hover:border-red-700/60 transition-colors">
        <div>
          <p className="font-bold">Start Computing</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>3% daily yield • 90 days</p>
        </div>
        <button onClick={() => navigate('/plans')} className="btn-primary text-sm py-2 px-5 whitespace-nowrap">
          Deploy Node →
        </button>
      </div>

      {/* Active Investments */}
      {activeInvestments.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Active Investments
          </h3>
          <div className="space-y-3">
            {activeInvestments.slice(0, 3).map(inv => {
              const startDate = inv.startedAt ? new Date(inv.startedAt) : new Date(inv.date)
              const endDate = inv.endsAt ? new Date(inv.endsAt) : new Date(startDate.getTime() + 90 * 86400000)
              const now = new Date()
              const totalDays = Math.max(1, Math.ceil((endDate - startDate) / 86400000))
              // Calculate days passed since investment started
              const daysPassed = Math.max(0, Math.floor((now - startDate) / 86400000))
              // Progress based on percentage earned vs total return target
              const dailyReturn = Number(inv.dailyReturn || 0)
              const accumulatedProfit = Number(inv.profit || 0)
              const targetTotal = Number(inv.totalReturn || 0)
              const remaining = Math.max(0, targetTotal - accumulatedProfit)
              // Progress % = (accumulated profit / total return target) * 100
              // This shows actual earnings progress, not just calendar days
              const progress = targetTotal > 0 ? Math.min(100, Math.round((accumulatedProfit / targetTotal) * 100)) : 0
              return (
                <div key={inv.id} className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{inv.planName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 text-sm font-semibold">-KSh {Number(inv.amount).toLocaleString()}</p>
                      <p className="text-green-400 text-xs">+KSh {dailyReturn.toLocaleString()}/day</p>
                    </div>
                  </div>
                  <div className="rounded-lg p-3 mb-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Earned So Far</span>
                      <span className="text-green-400 font-bold text-sm">KSh {accumulatedProfit.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Day {daysPassed + 1} of {totalDays}</span>
                      <span className="text-yellow-400 text-xs">{progress}% complete</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <span>Target: KSh {targetTotal.toLocaleString()}</span>
                    <span>Remaining: KSh {remaining.toLocaleString()}</span>
                  </div>
                  {/* 24h Compute Cycle */}
                  {executingId === inv.id ? (
                    <div className="mt-3 rounded-lg p-3 font-mono text-xs bg-black/50 border border-green-700/50">
                      <div className="text-green-400 mb-1">{execStage >= 1 ? '>_ Allocating GPU Cores...' : ''}</div>
                      <div className="text-green-400 mb-1">{execStage >= 2 ? '>_ Processing AI Datasets...' : ''}</div>
                      <div className="text-green-400">{execStage >= 3 ? '>_ Cycle Complete. Yield Generated.' : ''}</div>
                    </div>
                  ) : (() => {
                    const remaining = getExecTimeRemaining(inv)
                    if (remaining) {
                      return (
                        <div className="mt-3 text-center">
                          <button disabled className="text-xs px-4 py-2 rounded-xl bg-gray-700 text-gray-500 cursor-not-allowed w-full">
                            ⏳ Next Cycle in {String(remaining.h).padStart(2,'0')}:{String(remaining.m).padStart(2,'0')}:{String(remaining.s).padStart(2,'0')}
                          </button>
                        </div>
                      )
                    }
                    return (
                      <div className="mt-3 text-center">
                        <button
                          onClick={() => handleExecuteCycle(inv)}
                          className="text-xs px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold w-full active:scale-95 transition-all"
                        >
                          ▶ Execute 24h Compute Cycle
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* WhatsApp Support */}
      {waDigits && (
        <div className="card mb-6 flex flex-col gap-3 ring-2 ring-green-500/30">
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 cursor-pointer transition-all active:scale-95 no-underline p-2 -m-2"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-xl flex-shrink-0">💬</div>
            <div className="flex-1">
              <p className="font-semibold">WhatsApp Support</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Chat with us on WhatsApp</p>
            </div>
            <span className="text-xs bg-green-800 text-green-300 px-3 py-1 rounded-full font-medium flex-shrink-0">Live</span>
          </a>
          {waGroupLink && (
            <a
              href={waGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 cursor-pointer transition-all active:scale-95 no-underline p-2 -m-2 border-t border-gray-700/50"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xl flex-shrink-0">👥</div>
              <div className="flex-1">
                <p className="font-semibold">Join WhatsApp Group</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Get updates, tips & announcements</p>
              </div>
              <span className="text-xs bg-blue-800 text-blue-300 px-3 py-1 rounded-full font-medium flex-shrink-0">Join</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
