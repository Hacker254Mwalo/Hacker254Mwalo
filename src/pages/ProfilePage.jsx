import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { saveUser, getReferrals } from '../lib/storage'
import { MPESA_PAYBILL, WITHDRAWAL_FEE } from '../lib/plans'
import { generateReferralCode } from '../lib/storage'

function RechargeModal({ onClose, onRecharge }) {
  const [amount, setAmount] = useState('')
  const [mpesaCode, setMpesaCode] = useState('')
  const [step, setStep] = useState(1)

  function proceed() {
    const amt = parseInt(amount)
    if (!amt || amt < 100) return
    setStep(2)
  }

  function confirm() {
    if (!mpesaCode.trim()) return
    onRecharge(parseInt(amount))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-2">📱 Recharge via M-Pesa</h3>

        {step === 1 ? (
          <>
            <div className="bg-gray-800 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-400 mb-1">M-Pesa Paybill Number</p>
              <p className="text-3xl font-black text-white tracking-widest">{MPESA_PAYBILL}</p>
              <p className="text-xs text-gray-500 mt-1">Account Number: Your Phone Number</p>
            </div>
            <ol className="text-sm text-gray-400 space-y-1 mb-4 list-decimal list-inside">
              <li>Go to M-Pesa → Lipa na M-Pesa → Paybill</li>
              <li>Enter Business No: <span className="text-white font-bold">{MPESA_PAYBILL}</span></li>
              <li>Account No: your phone number</li>
              <li>Enter amount and complete payment</li>
            </ol>
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Amount (KSh)</label>
              <input
                className="input-field"
                placeholder="e.g. 1000"
                type="number"
                min="100"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button onClick={proceed} disabled={!amount || parseInt(amount) < 100} className="btn-primary flex-1">
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">Enter the M-Pesa confirmation code you received after payment.</p>
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">M-Pesa Code</label>
              <input
                className="input-field"
                placeholder="e.g. QJK7T8XXXX"
                value={mpesaCode}
                onChange={e => setMpesaCode(e.target.value.toUpperCase())}
              />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Amount to credit: <span className="text-green-400 font-bold">KSh {parseInt(amount || 0).toLocaleString()}</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
              <button onClick={confirm} disabled={!mpesaCode.trim()} className="btn-primary flex-1">
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function WithdrawModal({ balance, onClose, onWithdraw }) {
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const MIN_WITHDRAW = 500

  const fee = Math.floor(parseInt(amount || 0) * WITHDRAWAL_FEE)
  const receives = Math.max(0, parseInt(amount || 0) - fee)
  const canWithdraw = parseInt(amount) >= MIN_WITHDRAW && parseInt(amount) <= balance && phone.length >= 10

  function confirm() {
    onWithdraw(parseInt(amount), phone)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">💸 Withdraw</h3>

        <div className="space-y-4 mb-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Withdrawal Amount (KSh)</label>
            <input
              className="input-field"
              placeholder={`Min KSh ${MIN_WITHDRAW}`}
              type="number"
              min={MIN_WITHDRAW}
              max={balance}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">M-Pesa Phone Number</label>
            <input
              className="input-field"
              placeholder="0712 345 678"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
        </div>

        {amount && parseInt(amount) > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span>KSh {parseInt(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Processing Fee (8%)</span>
              <span className="text-red-400">-KSh {fee.toLocaleString()}</span>
            </div>
            <hr className="border-gray-700" />
            <div className="flex justify-between font-bold">
              <span>You Receive</span>
              <span className="text-green-400">KSh {receives.toLocaleString()}</span>
            </div>
          </div>
        )}

        {parseInt(amount) > balance && (
          <p className="text-red-400 text-xs mb-4">Amount exceeds available balance (KSh {balance.toLocaleString()})</p>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={confirm} disabled={!canWithdraw} className="btn-primary flex-1">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth()
  const [showRecharge, setShowRecharge] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [toast, setToast] = useState('')
  const [copied, setCopied] = useState(false)

  const referrals = user ? getReferrals(user.id) : []
  const refCode = user ? (user.referralCode || generateReferralCode(user.phone)) : ''
  const refLink = `${window.location.origin}/login?ref=${refCode}`
  const totalL1 = referrals.filter(r => r.level === 1).reduce((s, r) => s + r.commission, 0)
  const totalL2 = referrals.filter(r => r.level === 2).reduce((s, r) => s + r.commission, 0)

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function copyLink() {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleRecharge(amount) {
    const newBalance = (user.balance || 0) + amount
    updateUser({ balance: newBalance })
    saveUser(user.id, { balance: newBalance })
    showToast(`✅ KSh ${amount.toLocaleString()} added to your balance!`)
  }

  function handleWithdraw(amount) {
    const fee = Math.floor(amount * WITHDRAWAL_FEE)
    const newBalance = (user.balance || 0) - amount
    updateUser({ balance: newBalance })
    saveUser(user.id, { balance: newBalance })
    showToast(`✅ Withdrawal of KSh ${(amount - fee).toLocaleString()} initiated! (Fee: KSh ${fee})`)
  }

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} onRecharge={handleRecharge} />}
      {showWithdraw && <WithdrawModal balance={user?.balance || 0} onClose={() => setShowWithdraw(false)} onWithdraw={handleWithdraw} />}

      {/* Profile Header */}
      <div className="card mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-2xl font-black flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg truncate">{user?.name}</p>
          <p className="text-gray-400 text-sm">{user?.phone}</p>
          <p className="text-xs text-gray-500 mt-1">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      {/* Balance */}
      <div className="balance-gradient rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Available Balance</p>
        <p className="text-3xl font-black">KSh {(user?.balance || 0).toLocaleString()}</p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setShowRecharge(true)} className="btn-primary flex-1 text-sm py-2.5">
            + Recharge
          </button>
          <button onClick={() => setShowWithdraw(true)} className="btn-secondary flex-1 text-sm py-2.5">
            Withdraw
          </button>
        </div>
      </div>

      {/* Referral Section */}
      <div className="card mb-6">
        <h3 className="font-bold text-lg mb-1">🤝 Referral Program</h3>
        <p className="text-gray-400 text-xs mb-4">Earn 10% (Level 1) & 4% (Level 2) on referred users' first deposit</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-lg">KSh {totalL1.toLocaleString()}</p>
            <p className="text-gray-400 text-xs">Level 1 Earnings</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-blue-400 font-bold text-lg">KSh {totalL2.toLocaleString()}</p>
            <p className="text-gray-400 text-xs">Level 2 Earnings</p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-3 mb-3">
          <p className="text-xs text-gray-400 mb-1">Your Referral Code</p>
          <p className="text-xl font-black text-red-400 tracking-wider">{refCode}</p>
        </div>

        <div className="flex items-center gap-2 bg-gray-800 rounded-xl p-3 mb-3">
          <p className="text-xs text-gray-300 flex-1 truncate">{refLink}</p>
          <button onClick={copyLink} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Referral list */}
        {referrals.length > 0 ? (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Referral History</p>
            {referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{r.referredName}</p>
                  <p className="text-xs text-gray-500">{new Date(r.date).toLocaleDateString()} • Level {r.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold text-sm">+KSh {r.commission.toLocaleString()}</p>
                  <p className="text-gray-500 text-xs">{r.planName}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 text-sm py-4">No referrals yet. Share your code to earn!</p>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full text-center py-3 text-red-400 hover:text-red-300 text-sm font-medium transition-colors border border-red-900/50 rounded-xl hover:bg-red-900/20"
      >
        Sign Out
      </button>
    </div>
  )
}
