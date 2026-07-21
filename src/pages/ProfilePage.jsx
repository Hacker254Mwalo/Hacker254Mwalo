import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getReferrals, generateReferralCode, addDeposit, addWithdrawal, changePassword, getUser, withdrawBonus, transferBonusToMain } from '../lib/db'
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
    if (!amt || amt < 400) return
    setLoading(true)
    try {
      const res = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount: amt, userPhone: user.phone }),
      })
      const data = await res.json()
      if (data.success || data.checkoutRequestId) {
        // Server already persisted a PENDING deposit via insert_deposit RPC.
        // Do NOT call addDeposit() again — that would create a duplicate row.
        setSent(true)
        onPending()
      } else {
        setManualMode(true)
      }
    } catch {
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
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Enter the amount and we'll send an M-Pesa prompt to{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.phone}</span>
                </p>

                <div className="mb-4">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount (KSh, min KSh 400)</label>
                  <input
                    className="input-field"
                    placeholder="Min KSh 400"
                    type="number"
                    min="400"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>

                <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  <p>Paybill: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{MPESA_PAYBILL}</span></p>
                  <p>Account: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>21210</span></p>
                </div>

                <div className="flex gap-3">
                  <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={initiateStkPush}
                    disabled={loading || !amount || parseInt(amount) < 400}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Sending...' : 'Pay Now'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-4 text-sm text-yellow-200">
                  <p className="font-bold mb-2 flex items-center gap-2">
                    <span className="text-lg">⚠️</span> STK Prompt Unavailable
                  </p>
                  <p className="mb-3 opacity-90">Please complete your deposit manually by sending <span className="font-bold text-white">KSh {Number(amount).toLocaleString()}</span> to the Paybill below:</p>
                  
                  <div className="space-y-2 mb-2">
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-yellow-700/30">
                      <div>
                        <p className="text-[10px] uppercase opacity-60">Paybill Number</p>
                        <p className="font-mono font-bold text-white tracking-wider">{MPESA_PAYBILL}</p>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(MPESA_PAYBILL); showToast('Paybill copied!') }}
                        className="text-[10px] bg-yellow-700/50 hover:bg-yellow-700 text-white px-2 py-1 rounded font-bold transition-colors"
                      >COPY</button>
                    </div>
                    
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-yellow-700/30">
                      <div>
                        <p className="text-[10px] uppercase opacity-60">Account Number</p>
                        <p className="font-mono font-bold text-white tracking-wider">21210</p>
                      </div>
                      <button 
                        onClick={() => { navigator.clipboard.writeText('21210'); showToast('Account copied!') }}
                        className="text-[10px] bg-yellow-700/50 hover:bg-yellow-700 text-white px-2 py-1 rounded font-bold transition-colors"
                      >COPY</button>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs mb-1 block font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Enter M-Pesa Transaction Code
                  </label>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-secondary)' }}>Paste the code from your M-Pesa SMS (e.g., SGR7ABCDEF)</p>
                  <input
                    className="input-field font-mono tracking-widest uppercase text-center text-lg py-3 border-2 border-red-900/30 focus:border-red-600"
                    placeholder="QRL7ABCDEF"
                    type="text"
                    maxLength={12}
                    value={txCode}
                    onChange={e => { setTxCode(e.target.value.toUpperCase()); setTxError('') }}
                  />
                </div>

                {txError && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{txError}</div>
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
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const MIN_WITHDRAW = 500

  const fee = Math.floor(parseInt(amount || 0) * WITHDRAWAL_FEE)
  const receives = Math.max(0, parseInt(amount || 0) - fee)
  const canWithdraw = parseInt(amount) >= MIN_WITHDRAW && parseInt(amount) <= balance && phone.replace(/\s/g, '').length >= 10

  async function confirm() {
    setLoading(true)
    setError('')
    try {
      await onWithdraw(parseInt(amount), phone.replace(/\s/g, ''))
      onClose()
    } catch (err) {
      setError(err.message || 'Withdrawal failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">💸 Withdraw</h3>

        <div className="space-y-4 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Amount (KSh)</label>
            <input
              className="input-field"
              placeholder={`Min KSh ${MIN_WITHDRAW}`}
              type="number"
              min={MIN_WITHDRAW}
              max={balance}
              value={amount}
              onChange={e => { setAmount(e.target.value); setError('') }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>M-Pesa Phone Number</label>
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
          <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
              <span>KSh {parseInt(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Processing Fee ({Math.round(WITHDRAWAL_FEE * 100)}%)</span>
              <span className="text-red-400">-KSh {fee.toLocaleString()}</span>
            </div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="flex justify-between font-bold">
              <span>You Receive</span>
              <span className="text-green-400">KSh {receives.toLocaleString()}</span>
            </div>
          </div>
        )}

        {parseInt(amount) > balance && (
          <p className="text-red-400 text-xs mb-4">Amount exceeds available balance (KSh {balance.toLocaleString()})</p>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={confirm} disabled={!canWithdraw || loading} className="btn-primary flex-1">
            {loading ? 'Processing...' : 'Withdraw'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BonusWithdrawModal({ bonusBalance, onClose, onWithdraw }) {
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const MIN_BONUS = 500

  const fee = Math.floor(parseInt(amount || 0) * 0.05)
  const receives = Math.max(0, parseInt(amount || 0) - fee)
  const canWithdraw = parseInt(amount) >= MIN_BONUS && parseInt(amount) <= bonusBalance && phone.replace(/\s/g, '').length >= 10

  async function confirm() {
    setLoading(true)
    setError('')
    try {
      await onWithdraw(parseInt(amount), phone.replace(/\s/g, ''))
      onClose()
    } catch (err) {
      setError(err.message || 'Bonus withdrawal failed.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-1">🎁 Withdraw Bonus</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Minimum KSh 500 · 5% fee applies</p>

        <div className="space-y-4 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount (KSh)</label>
            <input
              className="input-field"
              placeholder={`Min KSh ${MIN_BONUS}`}
              type="number"
              min={MIN_BONUS}
              max={bonusBalance}
              value={amount}
              onChange={e => { setAmount(e.target.value); setError('') }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>M-Pesa Phone Number</label>
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
          <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
              <span>KSh {parseInt(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Fee (5%)</span>
              <span className="text-red-400">-KSh {fee.toLocaleString()}</span>
            </div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="flex justify-between font-bold">
              <span>You Receive</span>
              <span className="text-green-400">KSh {receives.toLocaleString()}</span>
            </div>
          </div>
        )}

        {parseInt(amount) > bonusBalance && (
          <p className="text-red-400 text-xs mb-4">Amount exceeds bonus balance (KSh {bonusBalance.toLocaleString()})</p>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={confirm} disabled={!canWithdraw || loading} className="btn-primary flex-1">
            {loading ? 'Processing...' : 'Withdraw Bonus'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BonusTransferModal({ bonusBalance, onClose, onTransfer }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fee = Math.floor(parseInt(amount || 0) * 0.08)
  const net = Math.max(0, parseInt(amount || 0) - fee)
  const MIN_TRANSFER = 100
  const canTransfer = parseInt(amount) >= MIN_TRANSFER && parseInt(amount) <= bonusBalance

  async function confirm() {
    setLoading(true)
    setError('')
    try {
      await onTransfer(parseInt(amount))
      onClose()
    } catch (err) {
      setError(err.message || 'Transfer failed.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-1">🔄 Transfer Bonus to Balance</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Minimum KSh 100 · 8% tax applies on transfer</p>

        <div className="space-y-4 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount (KSh)</label>
            <input
              className="input-field"
              placeholder={`Min KSh ${MIN_TRANSFER} · Max KSh ${bonusBalance.toLocaleString()}`}
              type="number"
              min={MIN_TRANSFER}
              max={bonusBalance}
              value={amount}
              onChange={e => { setAmount(e.target.value); setError('') }}
            />
          </div>
        </div>

        {amount && parseInt(amount) > 0 && (
          <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Transfer Amount</span>
              <span>KSh {parseInt(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Tax (8%)</span>
              <span className="text-red-400">-KSh {fee.toLocaleString()}</span>
            </div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="flex justify-between font-bold">
              <span>Added to Balance</span>
              <span className="text-green-400">KSh {net.toLocaleString()}</span>
            </div>
          </div>
        )}
        <div className="rounded-xl p-3 mb-4 text-sm text-center" style={{ background: 'var(--bg-elevated)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Available Bonus</p>
          <p className="text-xl font-black text-yellow-400">KSh {bonusBalance.toLocaleString()}</p>
        </div>

        {parseInt(amount) > bonusBalance && (
          <p className="text-red-400 text-xs mb-4">Amount exceeds bonus balance</p>
        )}

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={confirm} disabled={!canTransfer || loading} className="btn-primary flex-1">
            {loading ? 'Transferring...' : 'Transfer'}
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
  const [showBonusWithdraw, setShowBonusWithdraw] = useState(false)
  const [showBonusTransfer, setShowBonusTransfer] = useState(false)
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [copied, setCopied] = useState(false)
  const [referrals, setReferrals] = useState([])
  const [showPwForm, setShowPwForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('deposit') === '1') {
      setShowDeposit(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const refCode = user ? (user.referralCode || generateReferralCode(user.phone)) : ''
  const baseUrl = import.meta.env.NEXT_PUBLIC_APP_URL
  const link = `${baseUrl}/r/${refCode}`
  const totalL1 = referrals.filter(r => r.level === 1).reduce((s, r) => s + Number(r.commission || 0), 0)
  const totalL2 = referrals.filter(r => r.level === 2).reduce((s, r) => s + Number(r.commission || 0), 0)
  const mustChangePw = user?.must_change_password

  const isAdmin = user?.isAdmin === true

  useEffect(() => {
    if (!user) return
    getReferrals(user.phone || user.id).then(setReferrals).catch(() => {})
  }, [user])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3000)
  }

  function copyLink() {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      setShowPwForm(false)
      showToast('✅ Password updated successfully!')
    } catch (err) {
      setPwError(err.message || 'Failed to update password')
    }
    setPwLoading(false)
  }

  async function handleBonusWithdraw(amount, mpesaPhone) {
    setLoading(true)
    try {
      const result = await withdrawBonus(user.phone || user.id, amount, mpesaPhone)
      if (result?.new_bonus_balance !== undefined) {
        updateUser({ bonusBalance: result.new_bonus_balance })
      }
      const fresh = await getUser(user.phone || user.id)
      if (fresh) updateUser({ balance: fresh.balance, bonusBalance: fresh.bonus_balance || 0 })
      showToast(`✅ Bonus withdrawal of KSh ${amount.toLocaleString()} initiated! (Fee: 5% = KSh ${Math.floor(amount * 0.05).toLocaleString()}, You receive: KSh ${Math.floor(amount * 0.95).toLocaleString()})`)
    } catch (err) {
      showToast(err.message || 'Bonus withdrawal failed', 'error')
    }
    setLoading(false)
  }

  async function handleBonusTransfer(amount) {
    setLoading(true)
    try {
      const result = await transferBonusToMain(user.phone || user.id, amount)
      if (result?.new_balance !== undefined) {
        updateUser({ balance: result.new_balance, bonusBalance: result.new_bonus_balance })
      }
      const tax = Math.floor(amount * 0.08)
      showToast(`✅ KSh ${(amount - tax).toLocaleString()} added to balance! (Tax: KSh ${tax.toLocaleString()})`)
    } catch (err) {
      showToast(err.message || 'Transfer failed', 'error')
    }
    setLoading(false)
  }

  // Atomic withdrawal — balance deducted inside DB function
  async function handleWithdraw(amount, mpesaPhone) {
    const fee = Math.floor(amount * WITHDRAWAL_FEE)
    const netAmount = amount - fee
    const result = await addWithdrawal(user.phone || user.id, { amount, fee, netAmount, mpesaPhone })
    // Refresh balance from DB result or fetch fresh
    if (result?.new_balance !== undefined) {
      updateUser({ balance: result.new_balance })
    } else {
      const fresh = await getUser(user.phone || user.id)
      if (fresh) updateUser({ balance: fresh.balance })
    }
    showToast(`✅ Withdrawal of KSh ${netAmount.toLocaleString()} initiated! (Fee: KSh ${fee})`)
  }

  return (
    <div className="pt-4 md:pt-20 pb-24 md:pb-8 px-4 max-w-2xl mx-auto">
      {toast.msg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-red-900 border-red-700 text-red-100'
            : 'bg-green-800 border-green-600 text-white'
        }`}>
          {toast.msg}
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
      {showBonusWithdraw && (
        <BonusWithdrawModal
          bonusBalance={user?.bonusBalance || 0}
          onClose={() => setShowBonusWithdraw(false)}
          onWithdraw={handleBonusWithdraw}
        />
      )}
      {showBonusTransfer && (
        <BonusTransferModal
          bonusBalance={user?.bonusBalance || 0}
          onClose={() => setShowBonusTransfer(false)}
          onTransfer={handleBonusTransfer}
        />
      )}

      {/* Profile Header */}
      <div className="card mb-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center text-2xl font-black flex-shrink-0">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg truncate">{user?.name}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.phone}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        {isAdmin && (
          <a href="/admin" className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
            ⚙️ Admin
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
      {/* Bonus Balance */}
      {(user?.bonusBalance || 0) > 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
          <p className="text-yellow-400/80 text-sm mb-1">Bonus Balance</p>
          <p className="text-3xl font-black text-yellow-400">KSh {(user.bonusBalance || 0).toLocaleString()}</p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowBonusWithdraw(true)}
              disabled={(user.bonusBalance || 0) < 500}
              className="flex-1 text-sm py-2.5 rounded-xl font-semibold transition-colors"
              style={{
                background: (user.bonusBalance || 0) >= 500 ? '#eab308' : '#374151',
                color: (user.bonusBalance || 0) >= 500 ? '#000' : '#6b7280',
              }}
            >
              Withdraw Bonus
            </button>
            <button
              onClick={() => setShowBonusTransfer(true)}
              className="flex-1 text-sm py-2.5 rounded-xl font-semibold transition-colors"
              style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }}
            >
              Transfer to Balance
            </button>
          </div>
          <p className="text-yellow-400/60 text-xs mt-2">
            Min KSh 500 to withdraw bonus · Min KSh 100 to transfer to balance
          </p>
        </div>
      )}
      {/* Referral Section */}
      <div className="card mb-6">
        <h3 className="font-bold text-lg mb-1">🤝 Referral Program</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Earn 10% (Level 1) &amp; 4% (Level 2) on referred users' first investment
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-green-400 font-bold text-lg">KSh {totalL1.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Level 1 Earnings</p>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-blue-400 font-bold text-lg">KSh {totalL2.toLocaleString()}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Level 2 Earnings</p>
          </div>
        </div>

        <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Your Referral Code</p>
          <p className="text-xl font-black text-red-400 tracking-wider">{refCode}</p>
        </div>

        <div className="flex items-center gap-2 rounded-xl p-3 mb-3" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{link}</p>
          <button onClick={copyLink} className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {referrals.length > 0 ? (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Referral History</p>
            {referrals.map((r, i) => {
              const maskedPhone = r.referredPhone
                ? r.referredPhone.slice(0, 5) + '***'
                : 'Unknown'
              const hasInvested = r.isInvested
              return (
                <div key={i} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--bg-elevated)' }}>
                  <div>
                    <p className="text-sm font-medium">{r.referredName || maskedPhone}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{maskedPhone} • Level {r.level}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        hasInvested
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-yellow-900/50 text-yellow-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasInvested ? 'bg-green-400' : 'bg-yellow-400'}`}/>
                        {hasInvested ? 'Active' : 'Pending Investment'}
                      </span>
                      {r.planName && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>• {r.planName}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    {r.commission > 0 ? (
                      <>
                        <p className="text-green-400 font-semibold text-sm">+KSh {r.commission.toLocaleString()}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(r.date).toLocaleDateString()}</p>
                      </>
                    ) : (
                      <p className="text-yellow-400 text-xs font-medium">Earns on 1st investment</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>No referrals yet. Share your code to earn!</p>
        )}
      </div>

      {/* Temporary password warning */}
      {mustChangePw && (
        <div className="card mb-6 border-yellow-700 bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">⚠️</span>
            <p className="font-bold text-yellow-400">Temporary Password</p>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            You are using a temporary password. Please change it immediately to secure your account.
          </p>
          <button onClick={() => setShowPwForm(true)} className="btn-primary w-full text-sm py-2.5">Change Password Now</button>
        </div>
      )}

      {/* Security */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">🔒 Security</h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Manage your PIN</p>
          </div>
          {!showPwForm && !mustChangePw && (
            <button onClick={() => setShowPwForm(true)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
              Change PIN
            </button>
          )}
        </div>

        {showPwForm && (
          <form onSubmit={handleChangePassword} className="space-y-3">
            {[
              { label: 'Current PIN', value: currentPw, setter: setCurrentPw },
              { label: 'New PIN (4–6 digits)', value: newPw, setter: setNewPw },
              { label: 'Confirm New PIN', value: confirmPw, setter: setConfirmPw },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                <input
                  className="input-field"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••"
                  value={value}
                  onChange={e => setter(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            ))}

            {pwError && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">{pwError}</div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowPwForm(false); setPwError('') }} className="btn-secondary flex-1 text-sm py-2">Cancel</button>
              <button type="submit" disabled={pwLoading} className="btn-primary flex-1 text-sm py-2">
                {pwLoading ? 'Updating...' : 'Update PIN'}
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
