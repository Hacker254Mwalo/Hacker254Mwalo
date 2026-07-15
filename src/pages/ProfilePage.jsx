import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateUserBalance, getReferrals, generateReferralCode, addDeposit, addWithdrawal, changePassword } from '../lib/db'
import { canChangePassword, recordPasswordChangeAttempt } from '../lib/storage'
import { MPESA_PAYBILL, WITHDRAWAL_FEE } from '../lib/plans'

function DepositModal({ user, onClose, onPending }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [txCode, setTxCode] = useState('')
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')

  async function initiateStkPush() {
    const amt = parseInt(amount)
    if (!amt || amt < 100) return
    setLoading(true)

    try {
      const res = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: user.phone,
          amount: amt,
          userPhone: user.phone,
        }),
      })
      const data = await res.json()

      if (data.success || data.checkoutRequestId) {
        await addDeposit(user.phone, { amount: amt, checkoutId: data.checkoutRequestId })
        setSent(true)
        onPending()
      } else {
        // STK failed — switch to manual mode silently
        setManualMode(true)
      }
    } catch {
      // Network or config error — switch to manual mode silently
      setManualMode(true)
    }
    setLoading(false)
  }

  async function submitManualCode() {
    const code = txCode.trim()
    if (!code) { setTxError('Please enter your M-Pesa transaction code.'); return }
    const amt = parseInt(amount)
    setTxLoading(true)
    setTxError('')
    try {
      await addDeposit(user.phone, { amount: amt, mpesaCode: code })
      setSent(true)
      onPending()
    } catch {
      setTxError('Failed to save code. Please try again.')
    }
    setTxLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-2">📱 Deposit via M-Pesa</h3>

        {!sent ? (
          <>
            {!manualMode ? (
              <>
                <p className="text-gray-400 text-sm mb-4">
                  Enter the amount and we'll send an M-Pesa prompt to <span className="text-white font-semibold">{user.phone}</span>
                </p>

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

                <div className="bg-gray-800 rounded-xl p-3 mb-4 text-xs text-gray-400">
                  <p>Paybill: <span className="text-white font-bold">{MPESA_PAYBILL}</span></p>
                  <p>Account: <span className="text-white font-bold">21210</span></p>
                </div>

                <div className="flex gap-3">
                  <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={initiateStkPush}
                    disabled={loading || !amount || parseInt(amount) < 100}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Sending...' : 'Pay Now'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-4 text-sm text-yellow-200">
                  STK Prompt unavailable. Please pay manually via M-Pesa Paybill:{' '}
                  <span className="font-bold text-white">4091165</span> | Account:{' '}
                  <span className="font-bold text-white">21210</span> and paste your transaction code below.
                </div>

                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-1 block">Enter M-Pesa Transaction Code (e.g., QRL7...)</label>
                  <input
                    className="input-field font-mono tracking-widest uppercase"
                    placeholder="e.g. QRL7ABCDEF"
                    type="text"
                    value={txCode}
                    onChange={e => { setTxCode(e.target.value.toUpperCase()); setTxError('') }}
                  />
                </div>

                {txError && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
                    {txError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={submitManualCode}
                    disabled={txLoading || !txCode.trim()}
                    className="btn-primary flex-1"
                  >
                    {txLoading ? 'Saving...' : 'Submit Code'}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="text-center py-6">
              <p className="text-5xl mb-3">{manualMode ? '✅' : '📲'}</p>
              <p className="text-green-400 font-bold text-lg mb-2">{manualMode ? 'Code Submitted!' : 'M-Pesa Prompt Sent!'}</p>
              <p className="text-gray-400 text-sm">
                {manualMode
                  ? 'Your transaction code has been saved for admin review.'
                  : 'Check your phone and enter your M-Pesa PIN to complete the deposit.'}
              </p>
              <p className="text-yellow-400 text-xs mt-3">⏳ Your deposit will appear as <strong>Pending</strong> until admin approves it.</p>
            </div>
            <button onClick={onClose} className="btn-primary w-full">Done</button>
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
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [toast, setToast] = useState('')
  const [copied, _setCopied] = useState(false)
  const [referrals, setReferrals] = useState([])
  const [showPwForm, setShowPwForm] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const refCode = user ? (user.referralCode || generateReferralCode(user.phone)) : ''
  const refLink = `${window.location.origin}/login?ref=${refCode}`
  const totalL1 = referrals.filter(r => r.level === 1).reduce((s, r) => s + Number(r.commission || 0), 0)
  const totalL2 = referrals.filter(r => r.level === 2).reduce((s, r) => s + Number(r.commission || 0), 0)
  const mustChangePw = user?.must_change_password

  useEffect(() => {
    if (!user) return
    getReferrals(user.phone || user.id).then(setReferrals).catch(() => {})
  }, [user])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function copyLink() {
    navigator.clipboard.writeText(refLink).then(() => {
      _setCopied(true)
      setTimeout(() => _setCopied(false), 2000)
    })
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    if (!currentPw || !newPw || !confirmPw) { setPwError('All fields are required'); return }
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return }
    if (newPw.length < 4) { setPwError('PIN must be at least 4 digits'); return }
    if (newPw === currentPw) { setPwError('New PIN must be different from current'); return }

    const rate = canChangePassword(user.phone || user.id)
    if (!rate.allowed) { setPwError('Too many attempts. Please try again later.'); return }

    setPwLoading(true)
    recordPasswordChangeAttempt(user.phone || user.id)
    try {
      await changePassword(user.phone || user.id, currentPw, newPw)
      updateUser({ must_change_password: false })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setShowPwForm(false)
      showToast('✅ Password updated successfully!')
    } catch (err) {
      setPwError(err.message || 'Failed to update password')
    }
    setPwLoading(false)
  }

  async function handleWithdraw(amount, mpesaPhone) {
    const fee = Math.floor(amount * WITHDRAWAL_FEE)
    const netAmount = amount - fee
    const newBalance = (user.balance || 0) - amount
    updateUser({ balance: newBalance })
    await updateUserBalance(user.phone || user.id, newBalance).catch(() => {})
    await addWithdrawal(user.phone || user.id, { amount, fee, netAmount, mpesaPhone }).catch(() => {})
    showToast(`✅ Withdrawal of KSh ${netAmount.toLocaleString()} initiated! (Fee: KSh ${fee})`)
  }

  const adminPhone = import.meta.env.VITE_ADMIN_PHONE
  const isAdmin = user && adminPhone && user.phone === adminPhone

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-800 border border-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}

      {showDeposit && (
        <DepositModal
          user={user}
          onClose={() => setShowDeposit(false)}
          onPending={() => showToast('✅ Deposit pending admin approval!')}
        />
      )}
      {showWithdraw && (
        <WithdrawModal
          balance={user?.balance || 0}
          onClose={() => setShowWithdraw(false)}
          onWithdraw={handleWithdraw}
        />
      )}

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
        {isAdmin && (
          <a href="/admin" className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
            Admin
          </a>
        )}
      </div>

      {/* Balance */}
      <div className="balance-gradient rounded-2xl p-5 mb-6">
        <p className="text-gray-400 text-sm mb-1">Available Balance</p>
        <p className="text-3xl font-black">KSh {(user?.balance || 0).toLocaleString()}</p>
        <div className="flex gap-3 mt-4">
          <button onClick={() => setShowDeposit(true)} className="btn-primary flex-1 text-sm py-2.5">
            + Deposit
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

      {mustChangePw && (
        <div className="card mb-6 border-yellow-700 bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <p className="font-bold text-yellow-400">Temporary Password</p>
          </div>
          <p className="text-gray-300 text-sm mb-4">You are using a temporary password. Please change it immediately to secure your account.</p>
          <button onClick={() => setShowPwForm(true)} className="btn-primary w-full text-sm py-2.5">Change Password Now</button>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">🔒 Security</h3>
            <p className="text-gray-400 text-xs">Manage your password</p>
          </div>
          {!showPwForm && !mustChangePw && (
            <button onClick={() => setShowPwForm(true)} className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors">
              Change Password
            </button>
          )}
        </div>

        {showPwForm && (
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Current PIN</label>
              <input
                className="input-field"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter current PIN"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">New PIN (4–6 digits)</label>
              <input
                className="input-field"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter new PIN"
                value={newPw}
                onChange={e => setNewPw(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Confirm New PIN</label>
              <input
                className="input-field"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Repeat new PIN"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {pwError && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
                {pwError}
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowPwForm(false); setPwError('') }} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              <button type="submit" disabled={pwLoading} className="btn-primary flex-1 text-sm py-2">
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>

      <button
        onClick={logout}
        className="w-full text-center py-3 text-red-400 hover:text-red-300 text-sm font-medium transition-colors border border-red-900/50 rounded-xl hover:bg-red-900/20"
      >
        Sign Out
      </button>
    </div>
  )
}
