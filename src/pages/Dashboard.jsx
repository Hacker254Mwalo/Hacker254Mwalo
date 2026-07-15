import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canClaimLoginBonus, setLastLoginBonus, canSpin, setLastSpin, isSpinDay } from '../lib/storage'
import { getInvestments, updateUserBalance, addLoan, claimKeyword, getAllLoans, getSupportMessages, sendSupportMessage } from '../lib/db'

function getInvestorBadge(balance) {
  if (balance >= 50000) return { label: 'Diamond', icon: '💎' }
  if (balance >= 20000) return { label: 'Gold', icon: '🥇' }
  if (balance >= 5000) return { label: 'Silver', icon: '🥈' }
  return { label: 'Bronze', icon: '🥉' }
}

const SPIN_PRIZES = [0, 0.005, 0.01, 0.02, 0.03, 0.04]

function SpinModal({ onClose, onResult, totalReturns }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [angle, setAngle] = useState(0)
  const prizes = SPIN_PRIZES.map(p => p === 0 ? 0 : Math.floor(p * totalReturns))

  function spin() {
    if (spinning) return
    setSpinning(true)
    const prize = prizes[Math.floor(Math.random() * prizes.length)]
    const prizeIdx = prizes.indexOf(prize)
    const segAngle = 360 / prizes.length
    const targetAngle = 360 * 5 + (360 - prizeIdx * segAngle - segAngle / 2)
    setAngle(prev => prev + targetAngle)
    setTimeout(() => {
      setResult(prize)
      setSpinning(false)
      onResult(prize)
    }, 3500)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold text-center mb-2">🎰 Lucky Spin</h3>
        <p className="text-gray-400 text-sm text-center mb-1">Available every Monday & Friday</p>
        <p className="text-[#D4AF37] text-xs text-center mb-6">Win up to 4% of your total returns!</p>

        <div className="relative mx-auto w-48 h-48 mb-6">
          <div
            className="w-full h-full rounded-full border-4 border-[#D4AF37] flex items-center justify-center bg-[#111] transition-transform"
            style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}
          >
            <div className="grid grid-cols-2 gap-1 text-xs text-center text-white font-bold">
              {prizes.slice(0, 4).map((p, i) => (
                <div key={i} className="bg-black/30 rounded p-1 w-16 h-10 flex items-center justify-center">
                  {p === 0 ? 'Try Again' : `+${p.toLocaleString()}`}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-2xl text-[#D4AF37]">▼</div>
        </div>

        {result !== null && (
          <div className={`text-center mb-4 text-lg font-bold ${result > 0 ? 'text-[#D4AF37]' : 'text-gray-400'}`}>
            {result > 0 ? `🎉 You won KSh ${result.toLocaleString()}!` : '😔 Better luck next time!'}
          </div>
        )}

        {result === null ? (
          <button onClick={spin} disabled={spinning} className="btn-primary w-full">
            {spinning ? 'Spinning...' : 'SPIN NOW'}
          </button>
        ) : (
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        )}
      </div>
    </div>
  )
}

function LoanModal({ userPhone, onClose }) {
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    const amt = parseInt(amount)
    if (!amt || amt < 500) { setError('Minimum loan amount is KSh 500'); return }
    if (amt > 250000) { setError('Maximum loan amount is KSh 250,000'); return }
    setLoading(true)
    try {
      await addLoan(userPhone, { amount: amt, purpose })
      setSubmitted(true)
    } catch (e) {
      setError(e.message || 'Failed to submit. Try again.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-xl text-[#D4AF37]">🏦</div>
          <div>
            <h3 className="text-lg font-bold">Request a Loan</h3>
            <p className="text-gray-500 text-xs">Quick approval • 24hrs review</p>
          </div>
        </div>

        {!submitted ? (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Loan Amount (KSh)</label>
                <input
                  className="input-field"
                  type="number"
                  min="500"
                  max="250000"
                  placeholder="Enter amount (500 – 250,000)"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError('') }}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Purpose <span className="text-gray-600">(optional)</span></label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="e.g. Business, Emergency, Investment..."
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900/40 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 mb-4 space-y-1.5 text-xs text-gray-500">
              <p>📌 Min: <span className="text-white font-semibold">KSh 500</span> · Max: <span className="text-white font-semibold">KSh 250,000</span></p>
              <p>📌 Repayment deducted from investment earnings</p>
              <p>📌 Admin approves within 24 hours</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button
                onClick={submit}
                disabled={loading || !amount || parseInt(amount) < 500 || parseInt(amount) > 250000}
                className="btn-primary flex-1 text-sm"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-3xl mx-auto mb-4 text-[#D4AF37]">✅</div>
            <p className="text-[#D4AF37] font-bold text-lg mb-2">Request Submitted!</p>
            <p className="text-gray-400 text-sm mb-1">
              Loan of <span className="text-white font-bold">KSh {parseInt(amount).toLocaleString()}</span> submitted.
            </p>
            <p className="text-gray-500 text-xs mb-6">Admin will review and disburse within 24 hours.</p>
            <button onClick={onClose} className="btn-primary w-full text-sm">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function PromoCodeModal({ userPhone, onClose, onCredit }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  async function redeem() {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return
    setLoading(true)
    setError('')
    const result = await claimKeyword(userPhone, normalized)
    if (result.success) {
      onCredit(result.bonus)
      setSuccess(result.bonus)
    } else {
      setError(result.message || 'Invalid code.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-xl text-[#D4AF37]">🎟️</div>
          <div>
            <h3 className="text-lg font-bold">Redeem Promo Code</h3>
            <p className="text-gray-500 text-xs">Instant account credit</p>
          </div>
        </div>

        {!success ? (
          <>
            <p className="text-gray-400 text-sm mb-4">Enter a valid promo code to get free KSh credited to your account.</p>
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1 block">Promo Code</label>
              <input
                className="input-field font-mono uppercase tracking-widest text-lg text-center"
                type="text"
                placeholder="e.g. WELCOME100"
                value={code}
                maxLength={20}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={e => e.key === 'Enter' && redeem()}
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-900/40 text-red-400 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={redeem} disabled={!code || loading} className="btn-primary flex-1 text-sm">
                {loading ? 'Checking...' : 'Redeem'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-3xl mx-auto mb-4 text-[#D4AF37]">🎉</div>
            <p className="text-[#D4AF37] font-bold text-lg mb-1">Code Redeemed!</p>
            <p className="text-gray-400 text-sm mb-1">
              <span className="text-white font-bold text-2xl">KSh {success.toLocaleString()}</span>
            </p>
            <p className="text-gray-500 text-xs mb-6">has been credited to your account.</p>
            <button onClick={onClose} className="btn-primary w-full text-sm">Awesome! 🚀</button>
          </div>
        )}
      </div>
    </div>
  )
}

function ContactAdminModal({ onClose, messages, onSend, reply, setReply, sending, bottomRef }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-xl text-[#D4AF37]">💬</div>
          <div>
            <h3 className="text-lg font-bold">Contact Admin</h3>
            <p className="text-gray-500 text-xs">We typically reply within a few minutes</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[200px] max-h-[300px] pr-1">
          {messages.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No messages yet. Start a conversation!</p>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender_type === 'admin' ? 'bg-[#D4AF37] text-black rounded-tr-none' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-gray-200 rounded-tl-none'}`}>
                  <p>{m.message}</p>
                  <p className={`text-xs mt-1 ${m.sender_type === 'admin' ? 'text-black/60' : 'text-gray-500'}`}>
                    {new Date(m.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSend} className="flex gap-2">
          <input
            className="flex-1 bg-[#0a0a0a] border border-[#1a1a1a] text-white placeholder-gray-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
            placeholder="Type your message..."
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <button type="submit" disabled={sending || !reply.trim()} className="btn-primary text-sm py-2 px-4">
            {sending ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [showSpin, setShowSpin] = useState(false)
  const [showLoan, setShowLoan] = useState(false)
  const [showPromo, setShowPromo] = useState(false)
  const [showContactAdmin, setShowContactAdmin] = useState(false)
  const [toast, setToast] = useState('')
  const [investments, setInvestments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [supportMessages, setSupportMessages] = useState([])
  const [supportReply, setSupportReply] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const prevLoanStatuses = useRef({})
  const supportBottomRef = useRef(null)

  const userPhone = user?.phone || user?.id

  useEffect(() => {
    if (user?.must_change_password) {
      navigate('/profile')
    }
  }, [user, navigate])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }, [])

  const loadNotifications = useCallback(() => {
    if (!userPhone) return []
    try {
      const stored = localStorage.getItem(`dp_notifications_${userPhone}`)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  }, [userPhone])

  const saveNotifications = useCallback((notifs) => {
    if (!userPhone) return
    localStorage.setItem(`dp_notifications_${userPhone}`, JSON.stringify(notifs))
  }, [userPhone])

  const addNotification = useCallback((message, type = 'info') => {
    setNotifications(prev => {
      const updated = [{ id: Date.now(), message, type, read: false, createdAt: new Date().toISOString() }, ...prev]
      saveNotifications(updated)
      return updated
    })
  }, [saveNotifications])

  useEffect(() => {
    if (!user) return
    getInvestments(user.phone || user.id).then(setInvestments).catch(() => {})
  }, [user])

  useEffect(() => {
    if (!user) return
    const stored = loadNotifications()
    setNotifications(stored)
  }, [user, loadNotifications])

  useEffect(() => {
    if (!userPhone) return
    const interval = setInterval(async () => {
      try {
        const loans = await getAllLoans()
        const userLoans = loans.filter(l => l.user_phone === userPhone || l.userPhone === userPhone)
        const currentStatuses = {}
        userLoans.forEach(l => {
          currentStatuses[l.id] = l.status
          const prev = prevLoanStatuses.current[l.id]
          if (prev === 'pending' && (l.status === 'approved' || l.status === 'rejected')) {
            const statusLabel = l.status === 'approved' ? 'Approved' : 'Rejected'
            const emoji = l.status === 'approved' ? '✅' : '❌'
            addNotification(`${emoji} Your loan of KSh ${Number(l.amount).toLocaleString()} has been ${statusLabel}.`, l.status)
            showToast(`${emoji} Loan ${statusLabel}!`)
          }
        })
        prevLoanStatuses.current = currentStatuses
      } catch { }
    }, 30000)
    return () => clearInterval(interval)
  }, [userPhone, showToast, addNotification])

  useEffect(() => {
    if (!showContactAdmin || !userPhone) return
    getSupportMessages(userPhone).then(setSupportMessages).catch(() => {})
  }, [showContactAdmin, userPhone])

  useEffect(() => {
    if (!showContactAdmin || !userPhone) return
    const interval = setInterval(async () => {
      try {
        const msgs = await getSupportMessages(userPhone)
        setSupportMessages(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(msgs)) return msgs
          return prev
        })
      } catch { }
    }, 3000)
    return () => clearInterval(interval)
  }, [showContactAdmin, userPhone])

  useEffect(() => {
    supportBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [supportMessages])

  const activeInvestments = investments.filter(i => i.status === 'active')
  const dailyProfit = activeInvestments.reduce((sum, inv) => sum + (inv.dailyReturn || 0), 0)
  const totalReturns = investments.reduce((sum, inv) => sum + Number(inv.totalReturn || 0), 0)
  const totalExpectedEarnings = activeInvestments.reduce((sum, inv) => sum + Number(inv.totalReturn || 0), 0)
  const loginBonus = Math.max(1, Math.floor(dailyProfit * 0.02))
  const badge = getInvestorBadge(user?.balance || 0)

  useEffect(() => {
    if (!user || !canClaimLoginBonus(user.id)) return
    const newBalance = (user.balance || 0) + loginBonus
    updateUser({ balance: newBalance })
    updateUserBalance(user.phone || user.id, newBalance).catch(() => {})
    setLastLoginBonus(user.id)
    showToast(`+KSh ${loginBonus} Daily Bonus claimed! 🎉`)
  }, [user, loginBonus, showToast, updateUser])

  async function claimLoginBonus() {
    if (!canClaimLoginBonus(user.id)) {
      showToast('Daily bonus already claimed today!')
      return
    }
    const newBalance = (user.balance || 0) + loginBonus
    updateUser({ balance: newBalance })
    await updateUserBalance(user.phone || user.id, newBalance).catch(() => {})
    setLastLoginBonus(user.id)
    showToast(`+KSh ${loginBonus} Daily Bonus claimed! 🎉`)
  }

  async function handleSpinResult(prize) {
    if (prize > 0) {
      const newBalance = (user.balance || 0) + prize
      updateUser({ balance: newBalance })
      await updateUserBalance(user.phone || user.id, newBalance).catch(() => {})
    }
    setLastSpin(user.id)
  }

  async function handlePromoCredit(amount) {
    const newBalance = (user.balance || 0) + amount
    updateUser({ balance: newBalance })
    await updateUserBalance(user.phone || user.id, newBalance).catch(() => {})
    showToast(`+KSh ${amount.toLocaleString()} promo credit added! 🎉`)
  }

  async function handleSendSupport(e) {
    e.preventDefault()
    if (!supportReply.trim() || !userPhone) return
    setSupportSending(true)
    try {
      await sendSupportMessage(userPhone, supportReply.trim(), 'user')
      setSupportMessages(prev => [...prev, { user_phone: userPhone, message: supportReply.trim(), sender_type: 'user', created_at: new Date().toISOString() }])
      setSupportReply('')
      setTimeout(() => supportBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch { showToast('❌ Failed to send message') }
    setSupportSending(false)
  }

  const spinAvailable = user && canSpin(user.id)
  const loginBonusAvailable = user && canClaimLoginBonus(user.id)

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-5 md:px-6 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111] border border-[#D4AF37] text-[#D4AF37] px-6 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {showSpin && <SpinModal onClose={() => setShowSpin(false)} onResult={handleSpinResult} totalReturns={totalReturns} />}
      {showLoan && <LoanModal userPhone={user?.phone} onClose={() => setShowLoan(false)} />}
      {showPromo && <PromoCodeModal userPhone={user?.phone} onClose={() => setShowPromo(false)} onCredit={handlePromoCredit} />}
      {showContactAdmin && (
        <ContactAdminModal
          onClose={() => setShowContactAdmin(false)}
          messages={supportMessages}
          onSend={handleSendSupport}
          reply={supportReply}
          setReply={setSupportReply}
          sending={supportSending}
          bottomRef={supportBottomRef}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-gray-500 text-sm mb-0.5">Welcome back,</p>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">{user?.name?.split(' ')[0] || 'User'}</h2>
            <span className="text-xs text-[#D4AF37] font-medium">{badge.icon} {badge.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(s => !s)}
            className="relative w-10 h-10 rounded-full bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-lg hover:border-[#D4AF37]/40 transition-colors"
          >
            🔔
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#D4AF37] text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
          <div className="w-10 h-10 rounded-full bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center font-bold text-sm text-[#D4AF37]">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="mb-6 card max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-white">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  const updated = notifications.map(n => ({ ...n, read: true }))
                  setNotifications(updated)
                  saveNotifications(updated)
                }}
                className="text-xs text-gray-500 hover:text-[#D4AF37] transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No notifications yet</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) {
                      const updated = notifications.map(notif => notif.id === n.id ? { ...notif, read: true } : notif)
                      setNotifications(updated)
                      saveNotifications(updated)
                    }
                  }}
                  className={`p-3 rounded-xl cursor-pointer transition-colors ${n.read ? 'bg-[#0a0a0a] text-gray-500' : 'bg-[#0a0a0a] border border-[#1a1a1a] text-white'}`}
                >
                  <p className="text-sm">{n.message}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hero Balance Card */}
      <div className="relative overflow-hidden balance-gradient rounded-2xl p-6 md:p-8 mb-10">
        <div className="hero-chart-bg" />

        <div className="relative z-10">
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-3 font-medium">Total Balance</p>
          <p className="text-5xl md:text-6xl font-black text-white mb-2 tracking-tight">
            KSh {(user?.balance || 0).toLocaleString()}
          </p>
          {dailyProfit > 0 && (
            <p className="text-[#D4AF37] text-sm font-medium mb-8">
              +KSh {dailyProfit.toLocaleString()}/day earning
            </p>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={() => navigate('/profile')} className="btn-primary text-sm py-2.5 px-6 flex-1">
              + Deposit
            </button>
            <button onClick={() => navigate('/profile')} className="btn-secondary text-sm py-2.5 px-6 flex-1">
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row — Minimal, no borders */}
      {activeInvestments.length > 0 && (
        <div className="grid grid-cols-3 gap-6 mb-10">
          <div className="bank-stat">
            <p className="bank-stat-value text-[#D4AF37]">KSh {dailyProfit.toLocaleString()}</p>
            <p className="bank-stat-label">Daily Profit</p>
          </div>
          <div className="bank-stat">
            <p className="bank-stat-value text-white">{activeInvestments.length}</p>
            <p className="bank-stat-label">Active Plans</p>
          </div>
          <div className="bank-stat">
            <p className="bank-stat-value text-white">KSh {totalExpectedEarnings.toLocaleString()}</p>
            <p className="bank-stat-label">Expected Earnings</p>
          </div>
        </div>
      )}

      {/* Actions — Gold outlined buttons */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <button
          onClick={claimLoginBonus}
          disabled={!loginBonusAvailable}
          className={`gold-outline-btn py-5 px-5 ${!loginBonusAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span className="text-2xl mb-1">🎁</span>
          <span className="text-sm font-semibold text-[#D4AF37]">Daily Bonus</span>
          <span className="text-xs text-[#D4AF37]/70 mt-0.5">
            {loginBonusAvailable ? `+KSh ${loginBonus}` : 'Claimed'}
          </span>
        </button>

        <button
          onClick={() => { if (spinAvailable) setShowSpin(true) }}
          disabled={!spinAvailable}
          className={`gold-outline-btn py-5 px-5 ${!spinAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <span className="text-2xl mb-1">🎰</span>
          <span className="text-sm font-semibold text-[#D4AF37]">Lucky Spin</span>
          <span className="text-xs text-[#D4AF37]/70 mt-0.5">
            {spinAvailable ? `Win up to KSh ${Math.floor(totalReturns * 0.04).toLocaleString()}` : isSpinDay() ? 'Used Today' : 'Mon & Fri'}
          </span>
        </button>
      </div>

      {/* Quick Services — Premium square cards */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-5">Quick Services</p>
        <div className="grid grid-cols-3 gap-4">
          <div
            className="premium-square-card"
            onClick={() => showToast('Coming Soon 📶')}
          >
            <div className="icon-wrap text-[#D4AF37]">📶</div>
            <p className="font-semibold text-xs text-center text-gray-300">Buy Airtime</p>
          </div>

          <div
            className="premium-square-card"
            onClick={() => setShowPromo(true)}
          >
            <div className="icon-wrap text-[#D4AF37]">🎟️</div>
            <p className="font-semibold text-xs text-center text-gray-300">Pay Bills</p>
          </div>

          <div
            className="premium-square-card"
            onClick={() => setShowLoan(true)}
          >
            <div className="icon-wrap text-[#D4AF37]">🏦</div>
            <p className="font-semibold text-xs text-center text-gray-300">Request Loan</p>
          </div>

          <div
            className="premium-square-card"
            onClick={() => setShowContactAdmin(true)}
          >
            <div className="icon-wrap text-[#D4AF37]">💬</div>
            <p className="font-semibold text-xs text-center text-gray-300">Contact Admin</p>
          </div>
        </div>
      </div>

      {/* Invest CTA */}
      <div className="mb-6 mt-10 p-5 flex items-center justify-between bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#D4AF37]/30 transition-colors rounded-2xl">
        <div>
          <p className="font-bold text-white">Start Investing</p>
          <p className="text-gray-500 text-sm">3% daily returns • 90 days</p>
        </div>
        <button onClick={() => navigate('/plans')} className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap">
          Invest Now →
        </button>
      </div>

      {/* Active Investments */}
      {activeInvestments.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></span>
            Active Investments
          </h3>
          <div className="space-y-3">
            {activeInvestments.slice(0, 3).map(inv => {
              const expectedEarnings = Number(inv.totalReturn || 0)
              return (
                <div key={inv.id} className="flex items-center justify-between bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-3.5 hover:border-[#D4AF37]/20 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-white">{inv.planName}</p>
                    <p className="text-gray-500 text-xs">KSh {Number(inv.amount).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[#D4AF37] text-sm font-semibold">+KSh {Number(inv.dailyReturn || 0).toLocaleString()}/day</p>
                    <p className="text-gray-500 text-xs">Expected: KSh {expectedEarnings.toLocaleString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chat Support */}
      {import.meta.env.VITE_ADMIN_PHONE && (
        <a
          href={`https://wa.me/${import.meta.env.VITE_ADMIN_PHONE.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 p-4 flex items-center gap-4 cursor-pointer transition-all active:scale-95 border border-[#1a1a1a] hover:border-[#D4AF37]/30 rounded-2xl no-underline"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center text-xl text-[#D4AF37] flex-shrink-0">💬</div>
          <div className="flex-1">
            <p className="font-semibold text-white text-sm">Chat Support</p>
            <p className="text-gray-500 text-xs">Talk to us on WhatsApp</p>
          </div>
          <span className="text-xs text-[#D4AF37] font-medium flex-shrink-0">Live</span>
        </a>
      )}
    </div>
  )
}
