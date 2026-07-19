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
} from '../lib/db'

const SPIN_DAYS = [1, 5] // Monday=1, Friday=5 (JS: 0=Sun,1=Mon,...,5=Fri)

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
            <p className="text-2xl font-black mt-2">+KSh {result.bonus?.toLocaleString()}</p>
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
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [spinClaimed, setSpinClaimed] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [claimingBonus, setClaimingBonus] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500)
  }

  const loadData = useCallback(async () => {
    if (!user) return
    const phone = user.phone || user.id
    try {
      const [invs, bonusStatus, spinStatus] = await Promise.all([
        getInvestments(phone),
        hasClaimedBonusToday(phone, 'login_bonus'),
        hasClaimedBonusToday(phone, 'spin'),
      ])
      setActiveInvestments((invs || []).filter(i => i.status === 'active'))
      setBonusClaimed(bonusStatus)
      setSpinClaimed(spinStatus)
    } catch { /* silent */ }
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  function redirectToDeposit(message) {
    showToast(message, 'error')
    navigate('/profile?deposit=1')
  }

  async function handleClaimBonus() {
    if (bonusClaimed || claimingBonus || !user) return
    setClaimingBonus(true)
    try {
      const result = await claimDailyLoginBonus(user.phone || user.id)
      if (result.success) {
        setBonusClaimed(true)
        if (result.balance !== undefined) updateUser({ balance: result.balance })
        else await refreshUser()
        showToast(`🎁 Daily bonus of KSh ${Number(result.amount || 10).toLocaleString()} collected!`)
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
    if (!activeInvestments.length) {
      redirectToDeposit('An active investment is required for Lucky Spin. Please deposit and invest first.')
      return
    }

    setSpinning(true)
    try {
      // Give the wheel a visible spin while the database randomly selects an active investment.
      await new Promise(resolve => setTimeout(resolve, 900))
      const result = await claimLuckySpin(user.phone || user.id)
      if (result.success) {
        setSpinClaimed(true)
        if (result.balance !== undefined) updateUser({ balance: result.balance })
        else await refreshUser()
        showToast(`🎰 You won KSh ${Number(result.amount).toLocaleString()} — 3% of the KSh ${Number(result.daily_profit).toLocaleString()} daily profit from ${result.plan_name || 'your active investment'}!`)
      } else if (result.code === 'NO_ACTIVE_INVESTMENT') {
        redirectToDeposit(result.message || 'An active investment is required. Please deposit and invest first.')
      } else {
        showToast(result.message || 'Already spun today.', 'error')
        if (result.code === 'ALREADY_SPUN') setSpinClaimed(true)
      }
    } catch (err) {
      showToast(err.message || 'Spin failed', 'error')
    }
    setSpinning(false)
  }

  async function handlePromo(code) {
    if (!user) return { success: false, message: 'Not logged in' }
    try {
      const result = await claimKeyword(user.phone || user.id, code)
      if (result.success) {
        await refreshUser()
      }
      return result
    } catch (err) {
      return { success: false, message: err.message || 'Failed to redeem code' }
    }
  }

  function handleOpenLoan() {
    if (!activeInvestments.length) {
      redirectToDeposit('An active investment is required before requesting a loan. Please deposit and invest first.')
      return
    }
    setShowLoan(true)
  }

  async function handleLoan(amount, purpose) {
    if (!user) throw new Error('Not logged in')
    if (!activeInvestments.length) {
      redirectToDeposit('An active investment is required before requesting a loan. Please deposit and invest first.')
      throw new Error('An active investment is required before requesting a loan.')
    }
    return addLoan(user.phone || user.id, { amount, purpose })
  }

  const adminPhone = import.meta.env.VITE_ADMIN_PHONE
  const isAdmin = user && (user.isAdmin === true || (adminPhone && user.phone === adminPhone))
  const todayIsSpinDay = isTodaySpinDay()

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      <Toast msg={toast.msg} type={toast.type} />

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

      {/* Balance Card */}
      <div className="balance-gradient rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Total Balance</p>
        <p className="text-4xl font-black">KSh {(user?.balance || 0).toLocaleString()}</p>
        {(user?.bonusBalance || 0) > 0 && (
          <p className="text-yellow-400 text-sm mt-1">+ KSh {(user.bonusBalance || 0).toLocaleString()} bonus</p>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={() => navigate('/profile?deposit=1')} className="btn-primary flex-1 text-sm py-2.5">+ Deposit</button>
          <button onClick={() => navigate('/profile')} className="btn-secondary flex-1 text-sm py-2.5">Withdraw</button>
        </div>
      </div>

      {/* Daily Bonus */}
      <div className="card mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">🎁 Daily Login Bonus</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {bonusClaimed ? 'Claimed today — come back tomorrow!' : 'Tap Claim to collect your KSh 10 daily bonus once today'}
            </p>
          </div>
          <button
            onClick={handleClaimBonus}
            disabled={bonusClaimed || claimingBonus}
            className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
              bonusClaimed
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-500 text-white active:scale-95'
            }`}
          >
            {claimingBonus ? '...' : bonusClaimed ? '✓ Claimed' : 'Claim'}
          </button>
        </div>
      </div>

      {/* Lucky Spin */}
      <div className={`card mb-6 ${!todayIsSpinDay ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold">🎰 Lucky Spin</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {!todayIsSpinDay
                ? 'Available on Mondays & Fridays'
                : spinClaimed
                  ? 'Already spun today!'
                  : activeInvestments.length
                    ? 'Random active investment • reward is 3% of its daily profit'
                    : 'Active investment required — tap Spin to deposit and invest'}
            </p>
          </div>
          <button
            onClick={handleSpin}
            disabled={spinClaimed || spinning || !todayIsSpinDay}
            className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
              spinClaimed || !todayIsSpinDay
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-yellow-600 hover:bg-yellow-500 text-white active:scale-95'
            }`}
          >
            {spinning ? '🌀' : spinClaimed ? '✓ Done' : 'Spin!'}
          </button>
        </div>
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
            onClick={() => setShowPromo(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-xl">🎟️</div>
            <p className="font-semibold text-xs text-center">Redeem Code</p>
          </div>

          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-purple-700"
            onClick={handleOpenLoan}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl">🏦</div>
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
          <p className="font-bold">Start Investing</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>3% daily returns • 90 days</p>
        </div>
        <button onClick={() => navigate('/plans')} className="btn-primary text-sm py-2 px-5 whitespace-nowrap">
          Invest Now →
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
            {activeInvestments.slice(0, 3).map(inv => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
                <div>
                  <p className="font-medium text-sm">{inv.planName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>KSh {Number(inv.amount).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-sm font-semibold">+KSh {Number(inv.dailyReturn || 0).toLocaleString()}/day</p>
                  <p className="text-yellow-400 text-xs">Total: KSh {Number(inv.totalReturn || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Support */}
      {adminPhone && (
        <a
          href={`https://wa.me/${adminPhone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="card mb-6 flex items-center gap-4 cursor-pointer transition-all active:scale-95 ring-2 ring-green-500/30 hover:ring-green-500/50 no-underline"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-xl flex-shrink-0">💬</div>
          <div className="flex-1">
            <p className="font-semibold">WhatsApp Support</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Chat with us on WhatsApp</p>
          </div>
          <span className="text-xs bg-green-800 text-green-300 px-3 py-1 rounded-full font-medium flex-shrink-0">Live</span>
        </a>
      )}
    </div>
  )
}
