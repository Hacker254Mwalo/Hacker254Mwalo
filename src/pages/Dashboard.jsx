import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canClaimLoginBonus, setLastLoginBonus, canSpin, setLastSpin, isSpinDay } from '../lib/storage'
import { getInvestments, updateUserBalance } from '../lib/db'

const SPIN_PRIZES = [50, 100, 200, 0, 150, 75, 300, 0, 250, 500]

// Promo codes → credit amount (KSh)
const PROMO_CODES = {
  'WELCOME100': 100,
  'BONUS500': 500,
  'INVEST200': 200,
  'VIP1000': 1000,
  'LAUNCH50': 50,
}

function getInvestorBadge(balance) {
  if (balance >= 50000) return { label: 'Diamond', bg: 'bg-gradient-to-r from-indigo-500 to-purple-500', icon: '💎' }
  if (balance >= 20000) return { label: 'Gold', bg: 'bg-gradient-to-r from-yellow-400 to-amber-500', icon: '🥇' }
  if (balance >= 5000) return { label: 'Silver', bg: 'bg-gradient-to-r from-gray-300 to-gray-500', icon: '🥈' }
  return { label: 'Bronze', bg: 'bg-gradient-to-r from-orange-500 to-amber-600', icon: '🥉' }
}

function SpinModal({ onClose, onResult }) {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [angle, setAngle] = useState(0)

  function spin() {
    if (spinning) return
    setSpinning(true)
    const prize = SPIN_PRIZES[Math.floor(Math.random() * SPIN_PRIZES.length)]
    const spins = 5
    const prizeIdx = SPIN_PRIZES.indexOf(prize)
    const segAngle = 360 / SPIN_PRIZES.length
    const targetAngle = 360 * spins + (360 - prizeIdx * segAngle - segAngle / 2)
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
        <p className="text-gray-400 text-sm text-center mb-6">Available every Monday & Friday</p>

        <div className="relative mx-auto w-48 h-48 mb-6">
          <div
            className="w-full h-full rounded-full border-4 border-red-500 flex items-center justify-center bg-gradient-to-br from-red-900 to-pink-900 transition-transform"
            style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 3.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}
          >
            <div className="grid grid-cols-2 gap-1 text-xs text-center text-white font-bold">
              {SPIN_PRIZES.slice(0, 4).map((p, i) => (
                <div key={i} className="bg-black/30 rounded p-1 w-16 h-10 flex items-center justify-center">
                  {p === 0 ? 'Try Again' : `+${p}`}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-2xl">▼</div>
        </div>

        {result !== null && (
          <div className={`text-center mb-4 text-lg font-bold ${result > 0 ? 'text-green-400' : 'text-gray-400'}`}>
            {result > 0 ? `🎉 You won KSh ${result}!` : '😔 Better luck next time!'}
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

function LoanModal({ onClose }) {
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function submit() {
    const amt = parseInt(amount)
    if (!amt || amt < 500) { setError('Minimum loan amount is KSh 500'); return }
    if (amt > 250000) { setError('Maximum loan amount is KSh 250,000'); return }
    const loans = JSON.parse(localStorage.getItem('dp_loan_requests') || '[]')
    loans.push({ amount: amt, purpose, date: new Date().toISOString() })
    localStorage.setItem('dp_loan_requests', JSON.stringify(loans))
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl">🏦</div>
          <div>
            <h3 className="text-lg font-bold">Request a Loan</h3>
            <p className="text-gray-400 text-xs">Quick approval • 24hrs review</p>
          </div>
        </div>

        {!submitted ? (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Loan Amount (KSh)</label>
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
                <label className="text-xs text-gray-400 mb-1 block">Purpose <span className="text-gray-600">(optional)</span></label>
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
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 mb-4 space-y-1.5 text-xs text-gray-400">
              <p>📌 Min: <span className="text-white font-semibold">KSh 500</span> · Max: <span className="text-white font-semibold">KSh 250,000</span></p>
              <p>📌 Repayment deducted from investment earnings</p>
              <p>📌 Admin approves within 24 hours</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={submit}
                disabled={!amount || parseInt(amount) < 500 || parseInt(amount) > 250000}
                className="btn-primary flex-1"
              >
                Submit Request
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
            <p className="text-green-400 font-bold text-lg mb-2">Request Submitted!</p>
            <p className="text-gray-400 text-sm mb-1">
              Loan of <span className="text-white font-bold">KSh {parseInt(amount).toLocaleString()}</span> submitted.
            </p>
            <p className="text-gray-500 text-xs mb-6">Admin will review and disburse within 24 hours.</p>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function PromoCodeModal({ onClose, onCredit }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  function redeem() {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return
    const used = JSON.parse(localStorage.getItem('dp_used_promos') || '[]')
    if (used.includes(normalized)) {
      setError('This promo code has already been used.')
      return
    }
    const amount = PROMO_CODES[normalized]
    if (!amount) {
      setError('Invalid promo code. Please check and try again.')
      return
    }
    setLoading(true)
    setTimeout(() => {
      used.push(normalized)
      localStorage.setItem('dp_used_promos', JSON.stringify(used))
      onCredit(amount)
      setSuccess(amount)
      setLoading(false)
    }, 900)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-xl">🎟️</div>
          <div>
            <h3 className="text-lg font-bold">Redeem Promo Code</h3>
            <p className="text-gray-400 text-xs">Instant account credit</p>
          </div>
        </div>

        {!success ? (
          <>
            <p className="text-gray-400 text-sm mb-4">Enter a valid promo code to get free KSh credited to your account.</p>
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Promo Code</label>
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
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-xs rounded-lg px-3 py-2 mb-4">{error}</div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={redeem} disabled={!code || loading} className="btn-primary flex-1">
                {loading ? 'Checking...' : 'Redeem'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-yellow-900/40 border border-yellow-600 flex items-center justify-center text-3xl mx-auto mb-4">🎉</div>
            <p className="text-green-400 font-bold text-lg mb-1">Code Redeemed!</p>
            <p className="text-gray-400 text-sm mb-1">
              <span className="text-white font-bold text-2xl">KSh {success.toLocaleString()}</span>
            </p>
            <p className="text-gray-500 text-xs mb-6">has been credited to your account.</p>
            <button onClick={onClose} className="btn-primary w-full">Awesome! 🚀</button>
          </div>
        )}
      </div>
    </div>
  )
}

function AirtimeModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-blue-900/40 border border-blue-700 flex items-center justify-center text-3xl mx-auto mb-4">📶</div>
        <h3 className="text-xl font-bold mb-2">Buy Airtime</h3>
        <p className="text-gray-400 text-sm mb-1">This feature is coming soon!</p>
        <p className="text-gray-500 text-xs mb-6">We're working hard to bring you instant airtime top-ups directly from your balance. Stay tuned!</p>
        <button onClick={onClose} className="btn-primary w-full">Got it!</button>
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
  const [showAirtime, setShowAirtime] = useState(false)
  const [toast, setToast] = useState('')
  const [investments, setInvestments] = useState([])

  useEffect(() => {
    if (!user) return
    getInvestments(user.phone || user.id).then(setInvestments).catch(() => {})
  }, [user])

  const activeInvestments = investments.filter(i => i.status === 'active')
  const dailyProfit = activeInvestments.reduce((sum, inv) => sum + (inv.dailyReturn || 0), 0)
  const loginBonus = Math.max(1, Math.floor(dailyProfit * 0.01))
  const badge = getInvestorBadge(user?.balance || 0)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

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

  const spinAvailable = user && canSpin(user.id)
  const loginBonusAvailable = user && canClaimLoginBonus(user.id)

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
          {toast}
        </div>
      )}

      {showSpin && <SpinModal onClose={() => setShowSpin(false)} onResult={handleSpinResult} />}
      {showLoan && <LoanModal onClose={() => setShowLoan(false)} />}
      {showPromo && <PromoCodeModal onClose={() => setShowPromo(false)} onCredit={handlePromoCredit} />}
      {showAirtime && <AirtimeModal onClose={() => setShowAirtime(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{user?.name?.split(' ')[0] || 'User'} 👋</h2>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full text-white ${badge.bg}`}>
              {badge.icon} {badge.label}
            </span>
          </div>
        </div>
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center font-bold text-lg ring-2 ring-red-500/30">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden balance-gradient rounded-2xl p-6 mb-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-6" />
        <div className="relative">
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Total Balance</p>
          <p className="text-4xl font-black text-white mb-1">
            KSh {(user?.balance || 0).toLocaleString()}
          </p>
          {dailyProfit > 0 && (
            <p className="text-green-400 text-sm font-medium mb-4">
              +KSh {dailyProfit.toLocaleString()}/day earning
            </p>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => navigate('/profile')} className="btn-primary text-sm py-2 px-5 flex-1">
              + Deposit
            </button>
            <button onClick={() => navigate('/profile')} className="btn-secondary text-sm py-2 px-5 flex-1">
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      {activeInvestments.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-base">KSh {dailyProfit.toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-0.5">Daily Profit</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-blue-400 font-bold text-base">{activeInvestments.length}</p>
            <p className="text-gray-500 text-xs mt-0.5">Active Plans</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
            <p className="text-yellow-400 font-bold text-base">3%</p>
            <p className="text-gray-500 text-xs mt-0.5">Daily Rate</p>
          </div>
        </div>
      )}

      {/* Bonus & Spin */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div
          className={`card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-green-700 ${loginBonusAvailable ? 'ring-2 ring-green-500/40' : 'opacity-60'}`}
          onClick={claimLoginBonus}
        >
          <span className="text-3xl">🎁</span>
          <p className="font-semibold text-sm text-center">Daily Bonus</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loginBonusAvailable ? 'bg-green-800 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
            {loginBonusAvailable ? `+KSh ${loginBonus}` : 'Claimed'}
          </span>
        </div>

        <div
          className={`card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-yellow-700 ${spinAvailable ? 'ring-2 ring-yellow-500/40' : 'opacity-60'}`}
          onClick={() => { if (spinAvailable) setShowSpin(true) }}
        >
          <span className="text-3xl">🎰</span>
          <p className="font-semibold text-sm text-center">Lucky Spin</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${spinAvailable ? 'bg-yellow-800 text-yellow-300' : 'bg-gray-800 text-gray-400'}`}>
            {spinAvailable ? 'Spin Now!' : isSpinDay() ? 'Used Today' : 'Mon & Fri'}
          </span>
        </div>
      </div>

      {/* Quick Services */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Quick Services</p>
        <div className="grid grid-cols-3 gap-3">

          {/* Buy Airtime — active, no badge */}
          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-blue-700 hover:bg-blue-950/20"
            onClick={() => setShowAirtime(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-xl">📶</div>
            <p className="font-semibold text-xs text-center">Buy Airtime</p>
          </div>

          {/* Pay Bills — opens promo code modal */}
          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-teal-700 hover:bg-teal-950/20"
            onClick={() => setShowPromo(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-teal-600 flex items-center justify-center text-xl">🎟️</div>
            <p className="font-semibold text-xs text-center">Promo Code</p>
          </div>

          {/* Request Loan — fully functional */}
          <div
            className="card flex flex-col items-center gap-2 cursor-pointer transition-all active:scale-95 hover:border-purple-700 hover:bg-purple-950/20"
            onClick={() => setShowLoan(true)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-xl">🏦</div>
            <p className="font-semibold text-xs text-center">Request Loan</p>
          </div>
        </div>
      </div>

      {/* Invest CTA */}
      <div className="card mb-6 mt-6 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 border-red-900/40 hover:border-red-700/60 transition-colors">
        <div>
          <p className="font-bold">Start Investing</p>
          <p className="text-gray-400 text-sm">3% daily returns • 90 days</p>
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
              <div key={inv.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{inv.planName}</p>
                  <p className="text-gray-400 text-xs">KSh {inv.amount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 text-sm font-semibold">+KSh {inv.dailyReturn}/day</p>
                  <p className="text-gray-400 text-xs">3% daily</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Support */}
      {import.meta.env.VITE_ADMIN_PHONE && (
        <a
          href={`https://wa.me/${import.meta.env.VITE_ADMIN_PHONE.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="card mb-6 flex items-center gap-4 cursor-pointer transition-all active:scale-95 ring-2 ring-green-500/30 hover:ring-green-500/50 no-underline"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-xl flex-shrink-0">💬</div>
          <div className="flex-1">
            <p className="font-semibold">Chat Support</p>
            <p className="text-gray-400 text-sm">Talk to us on WhatsApp</p>
          </div>
          <span className="text-xs bg-green-800 text-green-300 px-3 py-1 rounded-full font-medium flex-shrink-0">Live</span>
        </a>
      )}
    </div>
  )
}
