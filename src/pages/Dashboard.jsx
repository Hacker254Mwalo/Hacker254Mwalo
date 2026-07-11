import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { canClaimLoginBonus, setLastLoginBonus, canSpin, setLastSpin, isSpinDay, getInvestments } from '../lib/storage'
import { saveUser } from '../lib/storage'
import { LOGIN_BONUS } from '../lib/plans'


const SPIN_PRIZES = [50, 100, 200, 0, 150, 75, 300, 0, 250, 500]

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

        {/* Wheel visual */}
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

export default function Dashboard() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [showSpin, setShowSpin] = useState(false)
  const [toast, setToast] = useState('')

  const investments = user ? getInvestments(user.id) : []
  const activeInvestments = investments.filter(i => i.status === 'active')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function claimLoginBonus() {
    if (!canClaimLoginBonus(user.id)) {
      showToast('Daily bonus already claimed today!')
      return
    }
    const newBalance = (user.balance || 0) + LOGIN_BONUS
    updateUser({ balance: newBalance })
    saveUser(user.id, { balance: newBalance })
    setLastLoginBonus(user.id)
    showToast(`+KSh ${LOGIN_BONUS} Daily Login Bonus claimed! 🎉`)
  }

  function handleSpinResult(prize) {
    if (prize > 0) {
      const newBalance = (user.balance || 0) + prize
      updateUser({ balance: newBalance })
      saveUser(user.id, { balance: newBalance })
    }
    setLastSpin(user.id)
  }

  const spinAvailable = user && canSpin(user.id)
  const loginBonusAvailable = user && canClaimLoginBonus(user.id)
  const spinDayName = new Date().getDay() === 1 ? 'Monday' : new Date().getDay() === 5 ? 'Friday' : null

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium animate-bounce">
          {toast}
        </div>
      )}

      {showSpin && (
        <SpinModal
          onClose={() => setShowSpin(false)}
          onResult={handleSpinResult}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <h2 className="text-xl font-bold">{user?.name?.split(' ')[0] || 'User'} 👋</h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center font-bold text-lg">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>

      {/* Balance card */}
      <div className="balance-gradient rounded-2xl p-6 mb-6">
        <p className="text-gray-400 text-sm mb-1">Total Balance</p>
        <p className="text-4xl font-black text-white">
          KSh {(user?.balance || 0).toLocaleString()}
        </p>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="btn-primary text-sm py-2 px-4"
          >
            + Recharge
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="btn-secondary text-sm py-2 px-4"
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Daily Bonus */}
        <div className={`card flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 ${loginBonusAvailable ? 'ring-2 ring-green-500/40' : 'opacity-60'}`}
          onClick={claimLoginBonus}
        >
          <span className="text-3xl">🎁</span>
          <p className="font-semibold text-sm text-center">Daily Bonus</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${loginBonusAvailable ? 'bg-green-800 text-green-300' : 'bg-gray-800 text-gray-400'}`}>
            {loginBonusAvailable ? '+KSh 50' : 'Claimed'}
          </span>
        </div>

        {/* Lucky Spin */}
        <div
          className={`card flex flex-col items-center gap-2 cursor-pointer transition-transform active:scale-95 ${spinAvailable ? 'ring-2 ring-yellow-500/40' : 'opacity-60'}`}
          onClick={() => { if (spinAvailable) setShowSpin(true) }}
        >
          <span className="text-3xl">🎰</span>
          <p className="font-semibold text-sm text-center">Lucky Spin</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${spinAvailable ? 'bg-yellow-800 text-yellow-300' : 'bg-gray-800 text-gray-400'}`}>
            {spinAvailable ? 'Spin Now!' : isSpinDay() ? 'Used Today' : 'Mon & Fri'}
          </span>
        </div>
      </div>

      {/* Quick Invest */}
      <div className="card mb-6 flex items-center justify-between">
        <div>
          <p className="font-semibold">Start Investing</p>
          <p className="text-gray-400 text-sm">3% daily returns • 90 days</p>
        </div>
        <button onClick={() => navigate('/plans')} className="btn-primary text-sm py-2 px-5">
          Invest Now
        </button>
      </div>

      {/* Active investments */}
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

    </div>
  )
}
