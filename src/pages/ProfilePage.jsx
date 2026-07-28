import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getReferrals, generateReferralCode, addDeposit, addWithdrawal, changePassword, getUser, withdrawBonus, transferBonusToMain } from '../lib/db'
import { canChangePassword, recordPasswordChangeAttempt } from '../lib/storage'
import { MPESA_PAYBILL, WITHDRAWAL_FEE } from '../lib/plans'

// ── International Payment Methods ─────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: '💚',
    color: '#10b981',
    currencies: ['KES'],
    minAmount: 100,
    description: 'Mobile Money',
    real: true,
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: '🏦',
    color: '#3b82f6',
    currencies: ['USD', 'EUR', 'GBP', 'KES', 'UGX', 'TZS'],
    minAmount: 10, // USD equivalent
    description: 'Wire / ACH / SEPA',
    real: false,
  },
  {
    id: 'card',
    name: 'Credit Card',
    icon: '💳',
    color: '#f59e0b',
    currencies: ['USD', 'EUR', 'GBP', 'KES'],
    minAmount: 5,
    description: 'Visa / Mastercard',
    real: false,
  },
  {
    id: 'crypto',
    name: 'Crypto',
    icon: '₿',
    color: '#f97316',
    currencies: ['USD', 'EUR', 'GBP'],
    minAmount: 10,
    description: 'BTC / ETH / USDT',
    real: false,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: '🅿️',
    color: '#0070ba',
    currencies: ['USD', 'EUR', 'GBP'],
    minAmount: 10,
    description: 'PayPal Transfer',
    real: false,
  },
]

// ── Currency Exchange Rates (hardcoded, approximate) ──────────────────────────
const EXCHANGE_RATES = {
  USD: { rate: 0.0077, symbol: '$', min: 1 },
  EUR: { rate: 0.0072, symbol: '€', min: 1 },
  GBP: { rate: 0.0061, symbol: '£', min: 1 },
  KES: { rate: 1, symbol: 'KSh ', min: 100 },
  UGX: { rate: 28.5, symbol: 'USh ', min: 3000 },
  TZS: { rate: 19.5, symbol: 'TSh ', min: 2000 },
}

function convertFromKES(kesAmount, currency) {
  const info = EXCHANGE_RATES[currency]
  if (!info) return kesAmount
  if (currency === 'KES') return kesAmount
  return Math.max(info.min, Math.round(kesAmount * info.rate))
}

function convertToKES(amount, currency) {
  const info = EXCHANGE_RATES[currency]
  if (!info || currency === 'KES') return amount
  return Math.round(amount / info.rate)
}

function getCurrencySymbol(currency) {
  return EXCHANGE_RATES[currency]?.symbol || ''
}

// ── DepositModal (renamed to Top Up) ──────────────────────────────────────────
function DepositModal({ user, onClose, onPending }) {
  const [step, setStep] = useState(0) // 0=select method, 1=enter amount, 2=mpesa
  const [method, setMethod] = useState(null)
  const [currency, setCurrency] = useState('KES')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [txCode, setTxCode] = useState('')
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')

  const currentMin = method ? method.minAmount : 100

  function handleMethodSelect(m) {
    setMethod(m)
    // Default to KES for M-Pesa, first supported currency for others
    if (m.id === 'mpesa') {
      setCurrency('KES')
    } else {
      setCurrency(m.currencies[0])
    }
    setAmount('')
    setStep(1)
  }

  function handleContinueToPay() {
    if (method.id === 'mpesa') {
      setStep(2)
    } else {
      // Show recommendation to use M-Pesa
      setStep(3)
    }
  }

  async function initiateStkPush() {
    const kAmount = convertToKES(parseInt(amount) || 0, currency)
    if (!kAmount || kAmount < 100) return
    setLoading(true)
    try {
      const res = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount: kAmount, userPhone: user.phone }),
      })
      const data = await res.json()
      if (data.success || data.checkoutRequestId) {
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
    const kAmount = convertToKES(parseInt(amount) || 0, currency)
    setTxLoading(true)
    setTxError('')
    try {
      await addDeposit(user.phone, { amount: kAmount, mpesaCode: code })
      setSent(true)
      onPending()
    } catch {
      setTxError('Failed to save code. Please try again.')
    }
    setTxLoading(false)
  }

  const sym = getCurrencySymbol(currency)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        {/* Step 0: Select Payment Method */}
        {step === 0 && (
          <>
            <h3 className="text-xl font-bold mb-1">💰 Top Up</h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>Select your preferred payment method</p>

            <div className="space-y-2 mb-4">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleMethodSelect(m)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--bg-input)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = m.color }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <span className="text-xl">{m.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{m.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.description}</p>
                  </div>
                  <div className="flex gap-1">
                    {m.currencies.slice(0, 3).map(c => (
                      <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800" style={{ color: 'var(--text-muted)' }}>{c}</span>
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: m.color }}>→</span>
                </button>
              ))}
            </div>

            <button onClick={onClose} className="btn-secondary w-full text-sm">Cancel</button>
          </>
        )}

        {/* Step 1: Enter Amount + Currency */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep(0)} className="text-gray-400 text-sm">← Back</button>
            </div>
            <h3 className="text-xl font-bold mb-1">💰 Top Up — {method.icon} {method.name}</h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              {method.description} · Minimum {sym}{convertFromKES(currentMin, currency)}
            </p>

            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Currency</label>
              <div className="flex gap-1.5 flex-wrap">
                {method.currencies.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCurrency(c); setAmount('') }}
                    className={`text-[10px] px-2.5 py-1.5 rounded-lg font-semibold transition-all ${currency === c ? '' : ''}`}
                    style={{
                      background: currency === c ? method.color : 'var(--bg-elevated)',
                      color: currency === c ? '#fff' : 'var(--text-muted)',
                      border: currency === c ? `2px solid ${method.color}` : '1px solid var(--border)',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>
                Amount ({sym}, min {sym}{convertFromKES(currentMin, currency)})
              </label>
              <input
                className="input-field"
                placeholder={`${sym}Min ${convertFromKES(currentMin, currency)}`}
                type="number"
                min={convertFromKES(currentMin, currency)}
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
              {amount && parseInt(amount) > 0 && (
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  ≈ KSh {convertToKES(parseInt(amount), currency).toLocaleString()}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleContinueToPay}
                disabled={!amount || parseInt(amount) < convertFromKES(currentMin, currency)}
                className="btn-primary flex-1"
                style={{ background: method.color, borderColor: method.color }}
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {/* Step 2: M-Pesa STK Push / Paybill */}
        {step === 2 && !sent && (
          <>
            {!manualMode ? (
              <>
                <h3 className="text-xl font-bold mb-2">📱 M-Pesa Top Up</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Enter the amount and we'll send an M-Pesa prompt to{' '}
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{user.phone}</span>
                </p>

                <div className="mb-4">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount (KSh, min KSh 100)</label>
                  <input
                    className="input-field"
                    placeholder="Min KSh 100"
                    type="number"
                    min="100"
                    value={amount || (currency !== 'KES' ? String(convertToKES(parseInt(amount) || 0, currency)) : amount)}
                    onChange={e => {
                      const kAmount = parseInt(e.target.value)
                      setAmount(String(convertFromKES(kAmount, currency)))
                    }}
                  />
                  {currency !== 'KES' && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      You entered {sym}{amount} ≈ KSh {convertToKES(parseInt(amount) || 0, currency).toLocaleString()}
                    </p>
                  )}
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
                  <p className="font-bold mb-2 flex items-center gap-2">
                    <span className="text-lg">⚠️</span> STK Prompt Unavailable
                  </p>
                  <p className="mb-3 opacity-90">Please complete your top up manually by sending <span className="font-bold text-white">KSh {Number(convertToKES(parseInt(amount) || 0, currency)).toLocaleString()}</span> to the Paybill below:</p>
                  <div className="space-y-2 mb-2">
                    <div className="flex justify-between py-2 px-3 rounded-lg bg-black/20">
                      <span className="opacity-70">Paybill Number</span>
                      <span className="font-bold">{MPESA_PAYBILL}</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-lg bg-black/20">
                      <span className="opacity-70">Account Number</span>
                      <span className="font-bold">{user.phone}</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 rounded-lg bg-black/20">
                      <span className="opacity-70">Amount</span>
                      <span className="font-bold">KSh {Number(convertToKES(parseInt(amount) || 0, currency)).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs opacity-70">After sending, enter your M-Pesa transaction code below.</p>
                </div>

                <div className="mb-4">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>M-Pesa Transaction Code</label>
                  <input
                    className="input-field"
                    placeholder="e.g. QWE7H3J5K"
                    value={txCode}
                    onChange={e => { setTxCode(e.target.value.toUpperCase()); setTxError('') }}
                    maxLength={12}
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
        )}

        {/* Step 3: Non-M-Pesa method — recommend M-Pesa */}
        {step === 3 && (
          <>
            <h3 className="text-xl font-bold mb-1">💰 {method.icon} {method.name}</h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>
              {sym}{amount} · ≈ KSh {convertToKES(parseInt(amount) || 0, currency).toLocaleString()}
            </p>

            <div className="rounded-xl p-5 mb-4 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <p className="text-3xl mb-3">🔜</p>
              <h4 className="font-bold text-sm mb-2" style={{ color: '#60A5FA' }}>Coming Soon</h4>
              <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                {method.name} support is being integrated into the platform. We're working with enterprise payment partners to bring you seamless international deposits.
              </p>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <p className="text-sm font-semibold mb-2" style={{ color: '#34D399' }}>💡 Available Now: M-Pesa</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                For instant top up, M-Pesa is the fastest and most reliable option. Your funds are credited within seconds after confirmation.
              </p>
              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 rounded-xl font-semibold text-sm bg-green-600 hover:bg-green-500 text-white transition-colors"
              >
                💚 Top Up via M-Pesa →
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="btn-secondary flex-1 text-xs">Change Method</button>
              <button onClick={onClose} className="btn-primary flex-1 text-xs">Close</button>
            </div>
          </>
        )}

        {/* Success */}
        {sent && (
          <div className="text-center py-6">
            <p className="text-5xl mb-3">{manualMode ? '✅' : '📲'}</p>
            <p className="text-green-400 font-bold text-lg mb-2">{manualMode ? 'Code Submitted!' : 'M-Pesa Prompt Sent!'}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {manualMode
                ? 'Your transaction code has been saved for admin review.'
                : 'Check your phone and enter your M-Pesa PIN to complete the top up.'}
            </p>
            <p className="text-yellow-400 text-xs mt-3">⏳ Your top up will appear as <strong>Pending</strong> until admin approves it.</p>
            <button onClick={onClose} className="btn-primary w-full mt-4">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

function WithdrawModal({ balance, userPhone, onClose, onWithdraw }) {
  const [step, setStep] = useState(0)
  const [method, setMethod] = useState(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const MIN_WITHDRAW = 500

  const fee = Math.floor(parseInt(amount || 0) * WITHDRAWAL_FEE)
  const receives = Math.max(0, parseInt(amount || 0) - fee)
  const canWithdraw = parseInt(amount) >= MIN_WITHDRAW && parseInt(amount) <= balance

  async function confirm() {
    setLoading(true)
    setError('')
    try {
      await onWithdraw(parseInt(amount), userPhone)
      onClose()
    } catch (err) {
      setError(err.message || 'Withdrawal failed. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        {/* Step 0: Select Method */}
        {step === 0 && (
          <>
            <h3 className="text-xl font-bold mb-1">💸 Withdraw</h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>Select withdrawal method</p>

            <div className="space-y-2 mb-4">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setMethod(m); setStep(1) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--bg-input)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = m.color }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <span className="text-xl">{m.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{m.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{m.description}</p>
                  </div>
                  <span className="text-xs" style={{ color: m.color }}>→</span>
                </button>
              ))}
            </div>

            <button onClick={onClose} className="btn-secondary w-full text-sm">Cancel</button>
          </>
        )}

        {/* Step 1: Enter amount */}
        {step === 1 && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep(0)} className="text-gray-400 text-sm">← Back</button>
            </div>
            <h3 className="text-xl font-bold mb-1">💸 Withdraw — {method.icon} {method.name}</h3>

            {method.id === 'mpesa' ? (
              <>
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
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Number</label>
                    <div className="input-field font-semibold text-center" style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}>
                      {userPhone}
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Withdrawals can only be sent to your registered number</p>
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
              </>
            ) : (
              <>
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
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Number</label>
                    <div className="input-field font-semibold text-center" style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}>
                      {userPhone}
                    </div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Withdrawals can only be sent to your registered number</p>
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

                <div className="rounded-xl p-4 mb-4 text-center" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <p className="text-2xl mb-2">🔜</p>
                  <h4 className="font-bold text-sm mb-1" style={{ color: '#60A5FA' }}>Coming Soon</h4>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {method.name} withdrawals are being integrated.
                  </p>
                </div>

                <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p className="text-sm font-semibold mb-2" style={{ color: '#34D399' }}>💡 Available Now: M-Pesa</p>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                    For instant withdrawals, M-Pesa is the fastest option. Funds arrive in your M-Pesa account instantly.
                  </p>
                  <button
                    onClick={() => setMethod(PAYMENT_METHODS[0])}
                    className="w-full py-2.5 rounded-xl font-semibold text-sm bg-green-600 hover:bg-green-500 text-white transition-colors"
                  >
                    💚 Withdraw via M-Pesa →
                  </button>
                </div>

                {error && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="btn-secondary flex-1 text-xs">Change Method</button>
                  <button onClick={onClose} className="btn-primary flex-1 text-xs">Close</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function BonusWithdrawModal({ bonusBalance, userPhone, onClose, onWithdraw }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const MIN_BONUS = 500

  const fee = Math.floor(parseInt(amount || 0) * 0.05)
  const receives = Math.max(0, parseInt(amount || 0) - fee)
  const canWithdraw = parseInt(amount) >= MIN_BONUS && parseInt(amount) <= bonusBalance

  async function confirm() {
    setLoading(true)
    setError('')
    try {
      await onWithdraw(parseInt(amount), userPhone)
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
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Number</label>
            <div className="input-field font-semibold text-center" style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}>
              {userPhone}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Withdrawals can only be sent to your registered number</p>
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
  const receives = Math.max(0, parseInt(amount || 0) - fee)
  const canTransfer = parseInt(amount) > 0 && parseInt(amount) <= bonusBalance

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
        <h3 className="text-xl font-bold mb-1">⚡ Transfer Bonus</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>Move bonus to main balance · 8% network fee</p>

        <div className="mb-4">
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount (KSh)</label>
          <input
            className="input-field"
            placeholder="Enter amount"
            type="number"
            min={1}
            max={bonusBalance}
            value={amount}
            onChange={e => { setAmount(e.target.value); setError('') }}
          />
        </div>

        {amount && parseInt(amount) > 0 && (
          <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Amount</span>
              <span>KSh {parseInt(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--text-secondary)' }}>Network Fee (8%)</span>
              <span className="text-red-400">-KSh {fee.toLocaleString()}</span>
            </div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="flex justify-between font-bold">
              <span>Added to Balance</span>
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
          <button onClick={confirm} disabled={!canTransfer || loading} className="btn-primary flex-1">
            {loading ? 'Processing...' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [toast, setToast] = useState({ msg: '', type: 'success' })
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showBonusWithdraw, setShowBonusWithdraw] = useState(false)
  const [showBonusTransfer, setShowBonusTransfer] = useState(false)
  const [showReferral, setShowReferral] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [referrals, setReferrals] = useState([])
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  const params = new URLSearchParams(window.location.search)

  useEffect(() => {
    if (params.get('deposit') === '1') {
      setShowDeposit(true)
    }
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500)
  }

  async function handleDepositComplete() {
    try {
      const fresh = await getUser(user.phone)
      if (fresh) updateUser({ balance: fresh.balance })
    } catch { /* silent */ }
  }

  async function handleWithdraw(amount, phone) {
    const result = await addWithdrawal(phone, { amount })
    const fresh = await getUser(phone)
    if (fresh) updateUser({ balance: fresh.balance })
    showToast(`✅ Withdrawal of KSh ${amount.toLocaleString()} initiated to ${phone}`)
    return result
  }

  async function handleBonusWithdraw(amount, phone) {
    const result = await withdrawBonus(phone, { amount })
    const fresh = await getUser(phone)
    if (fresh) updateUser({ balance: fresh.balance, bonusBalance: fresh.bonusBalance })
    showToast(`✅ Bonus withdrawal of KSh ${amount.toLocaleString()} initiated`)
    return result
  }

  async function handleBonusTransfer(amount) {
    const result = await transferBonusToMain(user.phone, { amount })
    const fresh = await getUser(user.phone)
    if (fresh) updateUser({ balance: fresh.balance, bonusBalance: fresh.bonusBalance })
    showToast(`✅ KSh ${amount.toLocaleString()} bonus transferred to balance`)
    return result
  }

  async function handleChangePassword(currentPin, newPin) {
    setPasswordError('')
    setPasswordSuccess('')
    try {
      await changePassword(user.phone, { currentPin, newPin })
      setPasswordSuccess('Password changed successfully!')
      setTimeout(() => { setShowChangePassword(false); setPasswordSuccess('') }, 2000)
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password.')
    }
  }

  useEffect(() => {
    if (user?.phone) {
      getReferrals(user.phone).then(setReferrals).catch(() => {})
    }
  }, [user?.phone])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black">Profile</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {user?.phone || 'Loading...'}
            </p>
          </div>
          {user?.isAdmin && (
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
              + Top Up
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
                ⚡ Transfer to Balance
              </button>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button onClick={() => setShowReferral(true)} className="card p-4 text-center hover:border-yellow-700 transition-colors">
            <span className="text-2xl">👥</span>
            <p className="font-semibold text-sm mt-1">Refer & Earn</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>10% L1 · 4% L2</p>
          </button>
          <button onClick={() => setShowChangePassword(true)} className="card p-4 text-center hover:border-gray-600 transition-colors">
            <span className="text-2xl">🔐</span>
            <p className="font-semibold text-sm mt-1">Security</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Change PIN</p>
          </button>
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
          <div className="card p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <p className="font-semibold text-sm mb-1">How it works</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Top up via M-Pesa to your balance. Invest in AI compute nodes to earn 3% daily yield.
                  Withdraw anytime to your M-Pesa.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold text-sm mb-1">Important</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Withdrawals can only be sent to your registered phone number.
                  All transactions require admin approval and may take up to 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast.msg && (
          <div className={`fixed top-4 left-4 right-4 max-w-md mx-auto p-4 rounded-xl z-50 text-sm font-semibold ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`} style={{ animation: 'slideIn 0.3s ease-out' }}>
            {toast.msg}
          </div>
        )}

        {showDeposit && (
          <DepositModal
            user={user}
            onClose={() => setShowDeposit(false)}
            onPending={handleDepositComplete}
          />
        )}
        {showWithdraw && (
          <WithdrawModal
            balance={user?.balance || 0}
            userPhone={user?.phone}
            onClose={() => setShowWithdraw(false)}
            onWithdraw={handleWithdraw}
          />
        )}
        {showBonusWithdraw && (
          <BonusWithdrawModal
            bonusBalance={user?.bonusBalance || 0}
            userPhone={user?.phone}
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
        {showReferral && (
          <ReferralModal user={user} referrals={referrals} onClose={() => setShowReferral(false)} showToast={showToast} />
        )}
        {showChangePassword && (
          <ChangePasswordModal
            onClose={() => { setShowChangePassword(false); setPasswordError(''); setPasswordSuccess('') }}
            onSubmit={handleChangePassword}
            error={passwordError}
            success={passwordSuccess}
          />
        )}
      </div>
    </div>
  )
}

function ReferralModal({ user, referrals, onClose, showToast }) {
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!code && user?.referralCode) setCode(user.referralCode)
  }, [user])

  async function generateCode() {
    try {
      const newCode = await generateReferralCode(user.phone)
      setCode(newCode)
      showToast('Referral code generated!')
    } catch {
      showToast('Failed to generate code', 'error')
    }
  }

  function copyCode() {
    if (code) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  const shareText = `Join Dumiropay and earn with AI compute! Use my code: ${code}\nhttps://dumiropay.com?ref=${code}`

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">👥 Refer & Earn</h3>

        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Your Referral Code</p>
          <div className="flex items-center gap-2">
            <input
              className="input-field flex-1 text-center font-mono text-lg"
              value={code || 'Not generated'}
              readOnly
              style={{ background: 'var(--bg-primary)', cursor: 'not-allowed' }}
            />
            <button onClick={copyCode} disabled={!code} className="btn-primary px-3 text-xs">
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
          {!code && (
            <button onClick={generateCode} className="btn-primary w-full mt-3 text-xs">
              Generate Code
            </button>
          )}
        </div>

        <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
          <p className="font-semibold text-center mb-2">Commission Structure</p>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>L1 (Direct Referral)</span>
            <span className="text-green-400 font-semibold">10%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>L2 (Referral's Referral)</span>
            <span className="text-cyan-400 font-semibold">4%</span>
          </div>
        </div>

        {referrals.length > 0 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)' }}>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Your Referrals ({referrals.length})</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {referrals.map(r => (
                <div key={r.id} className="flex items-center justify-between text-xs py-1 px-2 rounded" style={{ background: 'var(--bg-primary)' }}>
                  <span className="font-mono">{r.referred_phone}</span>
                  <span className="text-green-400">+KSh {Number(r.commission || 0).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 text-xs"
          >
            Share on WhatsApp
          </a>
          <a
            href={`sms:?body=${encodeURIComponent(shareText)}`}
            className="btn-secondary flex-1 text-xs"
          >
            Share via SMS
          </a>
        </div>

        <button onClick={onClose} className="btn-secondary w-full">Close</button>
      </div>
    </div>
  )
}

function ChangePasswordModal({ onClose, onSubmit, error, success }) {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [submitError, setSubmitError] = useState('')

  function handleSubmit() {
    if (newPin.length < 4) {
      setSubmitError('New PIN must be at least 4 digits.')
      return
    }
    if (newPin !== confirmPin) {
      setSubmitError('New PIN and confirmation do not match.')
      return
    }
    onSubmit(currentPin, newPin)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">🔐 Change PIN</h3>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Current PIN</label>
            <input
              className="input-field"
              placeholder="Enter current PIN"
              type="password"
              maxLength={10}
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>New PIN</label>
            <input
              className="input-field"
              placeholder="Min 4 digits"
              type="password"
              maxLength={10}
              value={newPin}
              onChange={e => setNewPin(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Confirm New PIN</label>
            <input
              className="input-field"
              placeholder="Re-enter new PIN"
              type="password"
              maxLength={10}
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}
        {submitError && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{submitError}</div>
        )}
        {success && (
          <div className="bg-green-900/40 border border-green-700 text-green-300 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={!currentPin || !newPin || !confirmPin} className="btn-primary flex-1">
            Change PIN
          </button>
        </div>
      </div>
    </div>
  )
}
