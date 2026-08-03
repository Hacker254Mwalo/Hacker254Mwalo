import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getReferrals, generateReferralCode, addDeposit, addWithdrawal, changePassword, getUser, withdrawBonus, transferBonusToMain } from '../lib/db'
import { canChangePassword, recordPasswordChangeAttempt } from '../lib/storage'
import { MPESA_PAYBILL, WITHDRAWAL_FEE } from '../lib/plans'

// ── Brand Icons (SVG) ──────────────────────────────────────────────────────────
function MpesaIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="20" r="18" fill="#4CAF50" />
      <path d="M14 14h12l2 4h-6l-1 2h8l-2 6h-8l-1 2h6l-1 4h-4l1-4h-6l1-2h8l1-6h-8l1-4h-6l1-4h6l-1-4h4l1 4z" fill="white" transform="translate(-3, 4) scale(0.7)" />
      <text x="20" y="26" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">M</text>
    </svg>
  )
}

function BankIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <rect x="0" y="0" width="40" height="40" rx="8" fill="#1e3a5f" />
      <path d="M8 28h24v2H8z" fill="#e8d44d" />
      <path d="M10 16h4v12h-4zM18 16h4v12h-4zM26 16h4v12h-4z" fill="#e8d44d" />
      <path d="M20 8l12 8H8l12-8z" fill="#e8d44d" />
      <rect x="10" y="30" width="20" height="2" fill="#e8d44d" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <rect x="2" y="8" width="36" height="24" rx="3" fill="#2d3748" stroke="#4a5568" strokeWidth="1" />
      <rect x="2" y="14" width="36" height="6" fill="#4a5568" />
      <rect x="6" y="24" width="16" height="2" rx="1" fill="#a0aec0" />
      <circle cx="30" cy="27" r="3" fill="#e53e3e" opacity="0.8" />
      <circle cx="33" cy="27" r="3" fill="#f59e0b" opacity="0.8" />
    </svg>
  )
}

function CryptoIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <circle cx="20" cy="20" r="18" fill="#f7931a" />
      <path d="M22 12c2 0 3.5 0.5 4.5 1.5s1.5 2.3 1.5 4c0 2-0.8 3.5-2.3 4.3 2 0.8 3 2.3 3 4.5 0 1.5-0.5 2.8-1.5 3.7-1 0.9-2.5 1.5-4.5 1.5h-8V12h7.3z" fill="white" />
      <path d="M16 14v12h6c2 0 3.2-0.5 3.8-1.5s0.5-2.3-0.2-3.2-2-1.3-3.8-1.3H19V18.5h3.5c1.5 0 2.5-0.5 3-1.3s0.5-1.8-0.2-2.5-1.8-1-3.3-1H16z" fill="white" />
      <path d="M18 12v-2h2v2h-2zM18 30v-2h2v2h-2z" fill="white" />
    </svg>
  )
}

function PayPalIcon() {
  return (
    <svg viewBox="0 0 40 40" width="32" height="32">
      <rect x="0" y="0" width="40" height="40" rx="8" fill="#0070ba" />
      <path d="M15 10h6c2.5 0 4.5 0.5 5.5 1.5s1.5 2.5 1 4c-0.5 1.8-2 3-4 3.5l-0.5 4c-0.2 1.5-1 2-2.5 2H18l0.5-4h2c1.5 0 2.5-0.5 2.8-1.5l1-6.5c0.2-1-0.5-1.5-1.8-1.5H19L15 26h-4l3-16z" fill="white" opacity="0.9" />
      <path d="M22 14h3c2.5 0 4.5 0.5 5.5 1.5s1.5 2.5 1 4c-0.5 1.8-2 3-4 3.5l-0.5 3c-0.2 1.5-1 2-2.5 2H20l0.3-3h2c1.5 0 2.5-0.5 2.8-1.5l1-6.5c0.2-1-0.5-1.5-1.8-1.5H22l-0.3-1z" fill="white" opacity="0.7" />
    </svg>
  )
}

function iconFor(id) {
  switch(id) {
    case 'mpesa': return <MpesaIcon />;
    case 'bank_transfer': return <BankIcon />;
    case 'card': return <CardIcon />;
    case 'crypto': return <CryptoIcon />;
    case 'paypal': return <PayPalIcon />;
    default: return null;
  }
}

function iconEmoji(id) {
  switch(id) {
    case 'mpesa': return 'M-Pesa';
    case 'bank_transfer': return 'Bank';
    case 'card': return 'Card';
    case 'crypto': return 'Crypto';
    case 'paypal': return 'PayPal';
    default: return '';
  }
}

// ── International Payment Methods ─────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: iconFor('bank_transfer'),
    color: '#3b82f6',
    currencies: ['USD', 'EUR', 'GBP', 'KES'],
    minAmount: 10,
    description: 'Wire / ACH / SEPA',
  },
  {
    id: 'mpesa',
    name: 'M-Pesa',
    icon: iconFor('mpesa'),
    color: '#10b981',
    currencies: ['KES'],
    minAmount: 100,
    description: 'Mobile Money',
  },
  {
    id: 'card',
    name: 'Credit Card',
    icon: iconFor('card'),
    color: '#f59e0b',
    currencies: ['USD', 'EUR', 'GBP', 'KES'],
    minAmount: 5,
    description: 'Visa / Mastercard',
  },
  {
    id: 'crypto',
    name: 'Crypto',
    icon: iconFor('crypto'),
    color: '#f97316',
    currencies: ['USD', 'EUR', 'GBP'],
    minAmount: 10,
    description: 'BTC / ETH / USDT',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: iconFor('paypal'),
    color: '#0070ba',
    currencies: ['USD', 'EUR', 'GBP'],
    minAmount: 10,
    description: 'PayPal Transfer',
  },
]

const EXCHANGE_RATES = {
  USD: { rate: 0.0077, symbol: '$', min: 1 },
  EUR: { rate: 0.0072, symbol: '€', min: 1 },
  GBP: { rate: 0.0061, symbol: '£', min: 1 },
  KES: { rate: 1, symbol: 'KSh ', min: 100 },
}

function convertFromKES(kesAmount, currency) {
  const info = EXCHANGE_RATES[currency]
  if (!info || currency === 'KES') return kesAmount
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

// ── Bank Transfer Form ───────────────────────────────────────────────────────
const BANKS = [
  {
    id: 'kcb',
    name: 'KCB Bank Kenya',
    accountNumber: '1109330445',
    branchCode: 'KCBKEKX',
    swift: 'KCBLKENX',
    branch: 'Nairobi Main Branch',
    country: 'Kenya',
  },
  {
    id: 'equity',
    name: 'Equity Bank Kenya',
    accountNumber: '0420124678901',
    branchCode: 'EABKEENX',
    swift: 'EQBLKENA',
    branch: 'Waiyaki Way Branch',
    country: 'Kenya',
  },
  {
    id: 'co-op',
    name: 'Co-operative Bank',
    accountNumber: '01108170062201',
    branchCode: 'COOPKENA',
    swift: 'KCOOKENA',
    branch: 'Haile Selassie Avenue',
    country: 'Kenya',
  },
  {
    id: 'absa',
    name: 'Absa Bank Kenya',
    accountNumber: '204800911002',
    branchCode: 'BARCKENX',
    swift: 'BARCKENX',
    branch: 'Kimathi Street Branch',
    country: 'Kenya',
  },
  {
    id: 'stanbic',
    name: 'Stanbic Bank Kenya',
    accountNumber: '0100011882900',
    branchCode: 'SABCKENX',
    swift: 'SBICKENX',
    branch: 'Wabera Street Branch',
    country: 'Kenya',
  },
  {
    id: 'dtb',
    name: 'Diamond Trust Bank',
    accountNumber: '1720210038900',
    branchCode: 'DTBCKENX',
    swift: 'TRBLKENX',
    branch: 'Wabera Street Branch',
    country: 'Kenya',
  },
]

function BankTransferForm({ amount, currency, onBack, onSubmit }) {
  const [selectedBank, setSelectedBank] = useState(null)
  const [formData, setFormData] = useState({ beneficiaryName: '', reference: '' })
  const [loading, setLoading] = useState(false)
  const sym = getCurrencySymbol(currency)
  const minAmount = convertFromKES(10, currency)

  function handleSubmit() {
    if (!selectedBank || !formData.beneficiaryName || !formData.reference || !amount) return
    setLoading(true)
    setTimeout(() => {
      onSubmit({ bank: selectedBank, beneficiaryName: formData.beneficiaryName, reference: formData.reference, amount: parseInt(amount) })
    }, 2000)
  }

  return (
    <>
      <div className="space-y-3 mb-4">
        {/* Bank Selector */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Select Bank</label>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
            {BANKS.map(bank => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank)}
                className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left transition-all"
                style={{
                  background: selectedBank?.id === bank.id ? 'rgba(59,130,246,0.15)' : 'var(--bg-elevated)',
                  border: selectedBank?.id === bank.id ? '2px solid #3b82f6' : '1px solid var(--border)',
                }}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{bank.name}</p>
                  <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{bank.branch} · {bank.country}</p>
                </div>
                {selectedBank?.id === bank.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bank Details */}
        {selectedBank && (
          <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: '#3b82f6' }}>Transfer To</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Account Name</span>
                <span className="text-xs font-semibold text-white">Dumiropay Pay Ltd</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Bank</span>
                <span className="text-xs font-semibold text-white">{selectedBank.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Account Number</span>
                <span className="text-xs font-mono font-bold text-green-400">{selectedBank.accountNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SWIFT Code</span>
                <span className="text-xs font-mono text-white">{selectedBank.swift}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Branch</span>
                <span className="text-xs text-white">{selectedBank.branch}</span>
              </div>
            </div>
          </div>
        )}

        {/* Beneficiary & Reference */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Your Name (as on bank account)</label>
          <input className="input-field" placeholder="Full name" value={formData.beneficiaryName} onChange={e => setFormData({ ...formData, beneficiaryName: e.target.value })} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Transfer Reference</label>
          <input className="input-field" placeholder="e.g. H254-INV-2026" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value.toUpperCase() })} maxLength={30} />
          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>This helps us match your payment to your account</p>
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount ({sym}, min {sym}{minAmount})</label>
          <input className="input-field" placeholder={`${sym}${minAmount}`} type="number" min={minAmount} value={amount} onChange={e => {}} />
          {amount && parseInt(amount) > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>≈ KSh {convertToKES(parseInt(amount), currency).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 text-xs">Back</button>
        <button
          onClick={handleSubmit}
          disabled={!selectedBank || !formData.beneficiaryName || !formData.reference || !amount || loading}
          className="btn-primary flex-1 text-xs"
          style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
        >
          {loading ? 'Processing...' : 'Send Wire Transfer'}
        </button>
      </div>
    </>
  )
}

// ── Card Form ─────────────────────────────────────────────────────────────────
function CardForm({ amount, currency, onBack, onSubmit }) {
  const [formData, setFormData] = useState({ cardNumber: '', expiry: '', cvv: '', cardName: '' })
  const [loading, setLoading] = useState(false)
  const sym = getCurrencySymbol(currency)
  const minAmount = convertFromKES(5, currency)

  function formatCardNumber(val) {
    return val.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19)
  }

  return (
    <>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Card Number</label>
          <input className="input-field font-mono" placeholder="1234 5678 9012 3456" value={formData.cardNumber} onChange={e => setFormData({ ...formData, cardNumber: formatCardNumber(e.target.value) })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Expiry</label>
            <input className="input-field" placeholder="MM/YY" value={formData.expiry} onChange={e => setFormData({ ...formData, expiry: e.target.value })} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>CVV</label>
            <input className="input-field" placeholder="123" type="password" maxLength={4} value={formData.cvv} onChange={e => setFormData({ ...formData, cvv: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Name on Card</label>
          <input className="input-field" placeholder="Full name" value={formData.cardName} onChange={e => setFormData({ ...formData, cardName: e.target.value })} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount ({sym}, min {sym}{minAmount})</label>
          <input className="input-field" placeholder={`${sym}${minAmount}`} type="number" min={minAmount} value={amount} onChange={e => {}} />
          {amount && parseInt(amount) > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>≈ KSh {convertToKES(parseInt(amount), currency).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 text-xs">Back</button>
        <button
          onClick={() => {
            if (!formData.cardNumber || !formData.expiry || !formData.cvv || !amount) return
            setLoading(true)
            setTimeout(() => onSubmit({ type: 'card', amount: parseInt(amount) }), 2000)
          }}
          disabled={!formData.cardNumber || !formData.expiry || !formData.cvv || !amount || loading}
          className="btn-primary flex-1 text-xs"
          style={{ background: '#f59e0b', borderColor: '#f59e0b' }}
        >
          {loading ? 'Processing...' : 'Pay Now'}
        </button>
      </div>
    </>
  )
}

// ── Crypto Form ───────────────────────────────────────────────────────────────
function CryptoForm({ amount, currency, onBack, onSubmit }) {
  const [coin, setCoin] = useState('USDT')
  const [walletAddress, setWalletAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const sym = getCurrencySymbol(currency)
  const minAmount = convertFromKES(10, currency)

  const cryptoRates = { BTC: 0.000015, ETH: 0.00028, USDT: 0.0077 }

  return (
    <>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Select Coin</label>
          <div className="flex gap-2">
            {['BTC', 'ETH', 'USDT'].map(c => (
              <button key={c} onClick={() => setCoin(c)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${coin === c ? '' : ''}`}
                style={{ background: coin === c ? '#f97316' : 'var(--bg-elevated)', color: coin === c ? '#fff' : 'var(--text-muted)', border: coin === c ? '2px solid #f97316' : '1px solid var(--border)' }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Wallet Address</label>
          <input className="input-field font-mono text-xs" placeholder="0x..." value={walletAddress} onChange={e => setWalletAddress(e.target.value)} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount ({sym}, min {sym}{minAmount})</label>
          <input className="input-field" placeholder={`${sym}${minAmount}`} type="number" min={minAmount} value={amount} onChange={e => {}} />
          {amount && parseInt(amount) > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>≈ {coin === 'BTC' ? '0.000' : coin === 'ETH' ? '0.00' : ''}{(parseInt(amount) * cryptoRates[coin]).toFixed(6)} {coin}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 text-xs">Back</button>
        <button
          onClick={() => {
            if (!walletAddress || !amount) return
            setLoading(true)
            setTimeout(() => onSubmit({ type: 'crypto', coin, walletAddress, amount: parseInt(amount) }), 2000)
          }}
          disabled={!walletAddress || !amount || loading}
          className="btn-primary flex-1 text-xs"
          style={{ background: '#f97316', borderColor: '#f97316' }}
        >
          {loading ? 'Processing...' : 'Send Crypto'}
        </button>
      </div>
    </>
  )
}

// ── PayPal Form ──────────────────────────────────────────────────────────────
function PayPalForm({ amount, currency, onBack, onSubmit }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const sym = getCurrencySymbol(currency)
  const minAmount = convertFromKES(10, currency)

  return (
    <>
      <div className="space-y-3 mb-4">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>PayPal Email</label>
          <input className="input-field" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount ({sym}, min {sym}{minAmount})</label>
          <input className="input-field" placeholder={`${sym}${minAmount}`} type="number" min={minAmount} value={amount} onChange={e => {}} />
          {amount && parseInt(amount) > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>≈ KSh {convertToKES(parseInt(amount), currency).toLocaleString()}</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 text-xs">Back</button>
        <button
          onClick={() => {
            if (!email || !amount) return
            setLoading(true)
            setTimeout(() => onSubmit({ type: 'paypal', email, amount: parseInt(amount) }), 2000)
          }}
          disabled={!email || !amount || loading}
          className="btn-primary flex-1 text-xs"
          style={{ background: '#0070ba', borderColor: '#0070ba' }}
        >
          {loading ? 'Processing...' : 'Pay with PayPal'}
        </button>
      </div>
    </>
  )
}

// ── Decline Message (KES Currency Trick) ─────────────────────────────────────
function DeclineMessage({ onMpesa, onBack }) {
  return (
    <div className="text-center py-4">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </div>
      <h4 className="font-bold text-base mb-2" style={{ color: '#f87171' }}>Transaction Declined</h4>
      <div className="rounded-xl p-4 mb-4 text-left" style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(248,113,113,0.2)' }}>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Your account currency is <strong>KES (Kenyan Shilling)</strong>. This payment method requires a foreign currency account (USD, EUR, GBP).
        </p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          To process this transaction, please use M-Pesa which supports KES natively and provides instant credit.
        </p>
      </div>
      <div className="space-y-2">
        <button onClick={onMpesa} className="w-full py-3 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-500 text-white transition-colors">
          💚 Use M-Pesa (Instant) →
        </button>
        <button onClick={onBack} className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
          ← Try another method
        </button>
      </div>
    </div>
  )
}

// ── DepositModal (Top Up) ─────────────────────────────────────────────────────
function DepositModal({ user, onClose, onPending }) {
  const [step, setStep] = useState(0)
  const [method, setMethod] = useState(null)
  const [currency, setCurrency] = useState('KES')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [txCode, setTxCode] = useState('')
  const [txLoading, setTxLoading] = useState(false)
  const [txError, setTxError] = useState('')
  const [declined, setDeclined] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)

  const currentMin = method ? method.minAmount : 100
  const sym = getCurrencySymbol(currency)

  function handleMethodSelect(m) {
    setMethod(m)
    setDeclined(false)
    if (m.id === 'mpesa') {
      setCurrency('KES')
    } else {
      setCurrency(m.currencies[0])
    }
    setAmount('')
    setStep(1)
  }

  function handleDecline() {
    setDeclined(true)
    setStep(2)
  }

  function handleBankSubmit(data) {
    const kAmount = convertToKES(data.amount, currency)
    addDeposit(user.phone, { amount: kAmount, bankName: data.bank.name, bankAccount: data.bank.accountNumber, beneficiaryName: data.beneficiaryName, reference: data.reference })
    setSent(true)
    onPending()
  }

  function handleGenericSubmit(data) {
    const kAmount = convertToKES(data.amount, currency)
    addDeposit(user.phone, { amount: kAmount, method: data.type, ...data })
    setSent(true)
    onPending()
  }

  function handleGoMpesa() {
    setMethod(PAYMENT_METHODS.find(m => m.id === 'mpesa'))
    setCurrency('KES')
    setDeclined(false)
    setStep(3)
  }

  async function initiateStkPush() {
    const kAmount = convertToKES(parseInt(amount) || 0, currency)
    if (!kAmount || kAmount < 100) return
    setLoading(true)
    setProcessing(true)
    setProcessingStep(0)

    // Processing animation steps
    const steps = [
      'Connecting to M-Pesa gateway...',
      `Sending STK prompt to ${user.phone}...`,
      'Awaiting transaction confirmation...',
    ]
    for (let i = 0; i < steps.length; i++) {
      setProcessingStep(i)
      await new Promise(r => setTimeout(r, 2000))
    }

    try {
      const res = await fetch('/api/stk-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, amount: kAmount, userPhone: user.phone }),
      })
      const data = await res.json()
      if (data.success || data.checkoutRequestId) {
        // ZetuPay returns a checkoutUrl — must redirect to trigger STK on phone
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl
        } else {
          setProcessing(false)
          setSent(true)
          onPending()
        }
      } else {
        // STK failed → show security warning + cashier
        setProcessing(false)
        setManualMode(true)
      }
    } catch {
      setProcessing(false)
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        {/* Step 0: Select Payment Method */}
        {step === 0 && (
          <>
            <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00B4FF" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              Top Up
            </h3>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>Select your preferred payment method</p>

            <div className="space-y-2 mb-4">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleMethodSelect(m)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = m.color }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">{m.icon}</div>
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

        {/* Step 1: Payment Form */}
        {step === 1 && !declined && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep(0)} className="text-gray-400 text-sm">← Back</button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00B4FF" strokeWidth="2">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Top Up —
              </h3>
              <div className="w-6 h-6">{method.icon}</div>
              <span className="text-xl font-bold">{method.name}</span>
            </div>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-secondary)' }}>
              {method.description} · Minimum {sym}{convertFromKES(currentMin, currency)}
            </p>

            {/* Currency selector */}
            <div className="mb-3">
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Currency</label>
              <div className="flex gap-1.5 flex-wrap">
                {method.currencies.map(c => (
                  <button
                    key={c}
                    onClick={() => { setCurrency(c); setAmount('') }}
                    className="text-[10px] px-2.5 py-1.5 rounded-lg font-semibold transition-all"
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

            {/* Method-specific form */}
            {method.id === 'mpesa' && (
              <>
                <div className="mb-4">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount (KSh, min KSh 100)</label>
                  <input
                    className="input-field"
                    placeholder="Min KSh 100"
                    type="number"
                    min="100"
                    value={amount || ''}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setManualMode(false); setProcessing(false); setStep(0) }} className="btn-secondary flex-1">Back</button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!amount || parseInt(amount) < 100}
                    className="btn-primary flex-1"
                  >
                    Pay Now
                  </button>
                </div>
              </>
            )}
            {method.id === 'bank_transfer' && (
              <BankTransferForm amount={amount} currency={currency} onBack={() => setStep(0)} onSubmit={handleBankSubmit} />
            )}
            {method.id === 'card' && (
              <CardForm amount={amount} currency={currency} onBack={() => setStep(0)} onSubmit={handleGenericSubmit} />
            )}
            {method.id === 'crypto' && (
              <CryptoForm amount={amount} currency={currency} onBack={() => setStep(0)} onSubmit={handleGenericSubmit} />
            )}
            {method.id === 'paypal' && (
              <PayPalForm amount={amount} currency={currency} onBack={() => setStep(0)} onSubmit={handleGenericSubmit} />
            )}
          </>
        )}

        {/* Step 2: Declined */}
        {step === 2 && declined && (
          <DeclineMessage onMpesa={handleGoMpesa} onBack={() => { setDeclined(false); setStep(0) }} />
        )}

            {/* Step 3: M-Pesa Form */}
        {step === 3 && !sent && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => { setDeclined(false); setManualMode(false); setProcessing(false); setStep(0) }} className="text-gray-400 text-sm">← Back</button>
            </div>

            {/* Processing Animation */}
            {processing ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                </div>
                <p className="font-bold text-white text-lg mb-2">Processing Payment</p>
                <p className="text-sm mb-4" style={{ color: '#10b981' }}>{['Connecting to M-Pesa gateway...', `Sending STK prompt to ${user.phone}...`, 'Awaiting confirmation...'][processingStep]}</p>
                <div className="w-full rounded-full h-1 mb-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-1 rounded-full transition-all duration-700" style={{ background: '#10b981', width: `${((processingStep + 1) / 3) * 100}%` }} />
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Secure payment processing via Dumiropay Pay</p>
              </div>
            ) : !manualMode ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">M-Pesa Top Up</h3>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Powered by Dumiropay Pay</p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Amount (KSh, min KSh 100)</label>
                  <input
                    className="input-field"
                    placeholder="Min KSh 100"
                    type="number"
                    min="100"
                    value={amount || ''}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
                  <button
                    onClick={initiateStkPush}
                    disabled={loading || !amount || parseInt(amount) < 100}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Processing...' : 'Pay Now'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Security Warning with Red Icon */}
                <div className="rounded-xl p-4 mb-4 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#ef4444' }}>STK Push Unavailable</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    For security reasons, we're unable to send an STK prompt to your number.
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                    Kindly top up your account using the payment handler below.
                  </p>
                </div>

                {/* Cashier Mode — Paybill */}
                <div className="rounded-xl p-4 mb-4" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.02))', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#10b981' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white">Pay via Cashier</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Dumiropay Pay · Your balance updates automatically</p>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Paybill Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{MPESA_PAYBILL}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(MPESA_PAYBILL); }}
                          className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                          style={{ background: 'rgba(16,185,129,0.2)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.4)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">21210</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText('21210'); }}
                          className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                          style={{ background: 'rgba(16,185,129,0.2)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.4)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.2)'}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2.5 px-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Amount</span>
                      <span className="font-bold text-sm text-green-400">KSh {Number(convertToKES(parseInt(amount) || 0, currency)).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Step-by-step instructions */}
                  <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: '#10b981' }}>Steps to Pay</p>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>1</span>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Go to <strong>M-Pesa</strong> → <strong>Lipa na M-Pesa</strong> → <strong>Paybill</strong></p>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>2</span>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enter Business Number: <strong className="text-white">{MPESA_PAYBILL}</strong></p>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>3</span>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Account Number: <strong className="text-white">21210</strong></p>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>4</span>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Enter Amount: <strong className="text-white">KSh {Number(convertToKES(parseInt(amount) || 0, currency)).toLocaleString()}</strong></p>
                      </div>
                      <div className="flex gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981' }}>5</span>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Confirm with your M-Pesa PIN</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transaction Code Entry */}
                <div className="mb-4">
                  <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>M-Pesa Transaction Code</label>
                  <input
                    className="input-field"
                    placeholder="e.g. QWE7H3J5K"
                    value={txCode}
                    onChange={e => { setTxCode(e.target.value.toUpperCase()); setTxError('') }}
                    maxLength={12}
                  />
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Found in your M-Pesa confirmation SMS</p>
                </div>

                {txError && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{txError}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => { setManualMode(false); setProcessing(false); setStep(0) }} className="btn-secondary flex-1 text-xs">Back</button>
                  <button
                    onClick={submitManualCode}
                    disabled={txLoading || !txCode.trim()}
                    className="btn-primary flex-1 text-xs"
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                  >
                    {txLoading ? 'Verifying...' : 'Confirm Payment'}
                  </button>
                </div>
              </>
            )}
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
  const [declined, setDeclined] = useState(false)
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

  function handleDecline() {
    setDeclined(true)
    setStep(2)
  }

  function handleGoMpesa() {
    setMethod(PAYMENT_METHODS.find(m => m.id === 'mpesa'))
    setDeclined(false)
    setStep(3)
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
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = m.color }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">{m.icon}</div>
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

        {/* Step 1: Method Form */}
        {step === 1 && !declined && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => setStep(0)} className="text-gray-400 text-sm">← Back</button>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold">💸 Withdraw — </h3>
              <div className="w-6 h-6">{method.icon}</div>
              <span className="text-xl font-bold">{method.name}</span>
            </div>

            {method.id === 'mpesa' ? (
              <>
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Amount (KSh)</label>
                    <input className="input-field" placeholder={`Min KSh ${MIN_WITHDRAW}`} type="number" min={MIN_WITHDRAW} max={balance} value={amount} onChange={e => { setAmount(e.target.value); setError('') }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Number</label>
                    <div className="input-field font-semibold text-center" style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}>{userPhone}</div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Withdrawals can only be sent to your registered number</p>
                  </div>
                </div>

                {amount && parseInt(amount) > 0 && (
                  <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Amount</span><span>KSh {parseInt(amount).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Processing Fee ({Math.round(WITHDRAWAL_FEE * 100)}%)</span><span className="text-red-400">-KSh {fee.toLocaleString()}</span></div>
                    <hr style={{ borderColor: 'var(--border)' }} />
                    <div className="flex justify-between font-bold"><span>You Receive</span><span className="text-green-400">KSh {receives.toLocaleString()}</span></div>
                  </div>
                )}

                {parseInt(amount) > balance && (
                  <p className="text-red-400 text-xs mb-4">Amount exceeds available balance (KSh {balance.toLocaleString()})</p>
                )}

                {error && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
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
                    <input className="input-field" placeholder={`Min KSh ${MIN_WITHDRAW}`} type="number" min={MIN_WITHDRAW} max={balance} value={amount} onChange={e => { setAmount(e.target.value); setError('') }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Number</label>
                    <div className="input-field font-semibold text-center" style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}>{userPhone}</div>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Withdrawals can only be sent to your registered number</p>
                  </div>
                </div>

                {amount && parseInt(amount) > 0 && (
                  <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Amount</span><span>KSh {parseInt(amount).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Processing Fee ({Math.round(WITHDRAWAL_FEE * 100)}%)</span><span className="text-red-400">-KSh {fee.toLocaleString()}</span></div>
                    <hr style={{ borderColor: 'var(--border)' }} />
                    <div className="flex justify-between font-bold"><span>You Receive</span><span className="text-green-400">KSh {receives.toLocaleString()}</span></div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="btn-secondary flex-1 text-xs">Back</button>
                  <button onClick={handleDecline} className="btn-primary flex-1 text-xs" style={{ background: method.color, borderColor: method.color }}>
                    Submit
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Step 2: Declined */}
        {step === 2 && declined && (
          <DeclineMessage onMpesa={handleGoMpesa} onBack={() => { setDeclined(false); setStep(0) }} />
        )}

        {/* Step 3: M-Pesa Withdraw */}
        {step === 3 && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <button onClick={() => { setDeclined(false); setStep(0) }} className="text-gray-400 text-sm">← Back</button>
            </div>
            <h3 className="text-xl font-bold mb-1">💚 M-Pesa Withdraw</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Amount (KSh)</label>
                <input className="input-field" placeholder={`Min KSh ${MIN_WITHDRAW}`} type="number" min={MIN_WITHDRAW} max={balance} value={amount} onChange={e => { setAmount(e.target.value); setError('') }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Number</label>
                <div className="input-field font-semibold text-center" style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}>{userPhone}</div>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Withdrawals can only be sent to your registered number</p>
              </div>
            </div>

            {amount && parseInt(amount) > 0 && (
              <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
                <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Amount</span><span>KSh {parseInt(amount).toLocaleString()}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Processing Fee ({Math.round(WITHDRAWAL_FEE * 100)}%)</span><span className="text-red-400">-KSh {fee.toLocaleString()}</span></div>
                <hr style={{ borderColor: 'var(--border)' }} />
                <div className="flex justify-between font-bold"><span>You Receive</span><span className="text-green-400">KSh {receives.toLocaleString()}</span></div>
              </div>
            )}

            {parseInt(amount) > balance && (
              <p className="text-red-400 text-xs mb-4">Amount exceeds available balance (KSh {balance.toLocaleString()})</p>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="btn-secondary flex-1">Back</button>
              <button onClick={confirm} disabled={!canWithdraw || loading} className="btn-primary flex-1">
                {loading ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
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
            <input className="input-field" placeholder={`Min KSh ${MIN_BONUS}`} type="number" min={MIN_BONUS} max={bonusBalance} value={amount} onChange={e => { setAmount(e.target.value); setError('') }} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Withdrawal Number</label>
            <div className="input-field font-semibold text-center" style={{ background: 'var(--bg-elevated)', cursor: 'not-allowed' }}>{userPhone}</div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Withdrawals can only be sent to your registered number</p>
          </div>
        </div>

        {amount && parseInt(amount) > 0 && (
          <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Amount</span><span>KSh {parseInt(amount).toLocaleString()}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Fee (5%)</span><span className="text-red-400">-KSh {fee.toLocaleString()}</span></div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="flex justify-between font-bold"><span>You Receive</span><span className="text-green-400">KSh {receives.toLocaleString()}</span></div>
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
          <input className="input-field" placeholder="Enter amount" type="number" min={1} max={bonusBalance} value={amount} onChange={e => { setAmount(e.target.value); setError('') }} />
        </div>

        {amount && parseInt(amount) > 0 && (
          <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Amount</span><span>KSh {parseInt(amount).toLocaleString()}</span></div>
            <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>Network Fee (8%)</span><span className="text-red-400">-KSh {fee.toLocaleString()}</span></div>
            <hr style={{ borderColor: 'var(--border)' }} />
            <div className="flex justify-between font-bold"><span>Added to Balance</span><span className="text-green-400">KSh {receives.toLocaleString()}</span></div>
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
  const { user, updateUser, logout } = useAuth()
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
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.phone || 'Loading...'}</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.isAdmin && (
              <a href="/admin" className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
                ⚙️ Admin
              </a>
            )}
            <button onClick={() => { logout(); window.location.href = '/login' }} className="text-xs bg-red-900/50 hover:bg-red-800/60 text-red-400 px-3 py-1.5 rounded-lg font-semibold transition-colors">
              Log Out
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="balance-gradient rounded-2xl p-5 mb-6">
          <p className="text-gray-400 text-sm mb-1">Available Balance</p>
          <p className="text-3xl font-black">KSh {(user?.balance || 0).toLocaleString()}</p>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowDeposit(true)} className="btn-primary flex-1 text-sm py-2.5">+ Top Up</button>
            <button onClick={() => setShowWithdraw(true)} className="btn-secondary flex-1 text-sm py-2.5">Withdraw</button>
          </div>
        </div>
        {/* Bonus Balance */}
        {(user?.bonusBalance || 0) > 0 && (
          <div className="rounded-2xl p-5 mb-6" style={{ background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
            <p className="text-yellow-400/80 text-sm mb-1">Bonus Balance</p>
            <p className="text-3xl font-black text-yellow-400">KSh {(user.bonusBalance || 0).toLocaleString()}</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowBonusWithdraw(true)} disabled={(user.bonusBalance || 0) < 500}
                className="flex-1 text-sm py-2.5 rounded-xl font-semibold transition-colors"
                style={{ background: (user.bonusBalance || 0) >= 500 ? '#eab308' : '#374151', color: (user.bonusBalance || 0) >= 500 ? '#000' : '#6b7280' }}>
                Withdraw Bonus
              </button>
              <button onClick={() => setShowBonusTransfer(true)}
                className="flex-1 text-sm py-2.5 rounded-xl font-semibold transition-colors"
                style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
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

        {/* Toast */}
        {toast.msg && (
          <div className={`fixed top-4 left-4 right-4 max-w-md mx-auto p-4 rounded-xl z-50 text-sm font-semibold ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
          }`} style={{ animation: 'slideIn 0.3s ease-out' }}>
            {toast.msg}
          </div>
        )}

        {showDeposit && (
          <DepositModal user={user} onClose={() => setShowDeposit(false)} onPending={handleDepositComplete} />
        )}
        {showWithdraw && (
          <WithdrawModal balance={user?.balance || 0} userPhone={user?.phone} onClose={() => setShowWithdraw(false)} onWithdraw={handleWithdraw} />
        )}
        {showBonusWithdraw && (
          <BonusWithdrawModal bonusBalance={user?.bonusBalance || 0} userPhone={user?.phone} onClose={() => setShowBonusWithdraw(false)} onWithdraw={handleBonusWithdraw} />
        )}
        {showBonusTransfer && (
          <BonusTransferModal bonusBalance={user?.bonusBalance || 0} onClose={() => setShowBonusTransfer(false)} onTransfer={handleBonusTransfer} />
        )}
        {showReferral && (
          <ReferralModal user={user} referrals={referrals} onClose={() => setShowReferral(false)} showToast={showToast} />
        )}
        {showChangePassword && (
          <ChangePasswordModal onClose={() => { setShowChangePassword(false); setPasswordError(''); setPasswordSuccess('') }} onSubmit={handleChangePassword} error={passwordError} success={passwordSuccess} />
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

  const shareText = `Join Dumiropay and earn with AI compute! Use my code: ${code}\nhttps://dumiropay.space?ref=${code}`

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">👥 Refer & Earn</h3>

        <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Your Referral Code</p>
          <div className="flex items-center gap-2">
            <input className="input-field flex-1 text-center font-mono text-lg" value={code || 'Not generated'} readOnly style={{ background: 'var(--bg-primary)', cursor: 'not-allowed' }} />
            <button onClick={copyCode} disabled={!code} className="btn-primary px-3 text-xs">{copied ? '✓' : 'Copy'}</button>
          </div>
          {!code && (
            <button onClick={generateCode} className="btn-primary w-full mt-3 text-xs">Generate Code</button>
          )}
        </div>

        <div className="rounded-xl p-4 mb-4 space-y-2 text-sm" style={{ background: 'var(--bg-elevated)' }}>
          <p className="font-semibold text-center mb-2">Commission Structure</p>
          <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>L1 (Direct Referral)</span><span className="text-green-400 font-semibold">10%</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--text-secondary)' }}>L2 (Referral's Referral)</span><span className="text-cyan-400 font-semibold">4%</span></div>
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
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-xs">Share on WhatsApp</a>
          <a href={`sms:?body=${encodeURIComponent(shareText)}`} className="btn-secondary flex-1 text-xs">Share via SMS</a>
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
    if (newPin.length < 4) { setSubmitError('New PIN must be at least 4 digits.'); return }
    if (newPin !== confirmPin) { setSubmitError('New PIN and confirmation do not match.'); return }
    onSubmit(currentPin, newPin)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">🔐 Change PIN</h3>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Current PIN</label>
            <input className="input-field" placeholder="Enter current PIN" type="password" maxLength={10} value={currentPin} onChange={e => setCurrentPin(e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>New PIN</label>
            <input className="input-field" placeholder="Min 4 digits" type="password" maxLength={10} value={newPin} onChange={e => setNewPin(e.target.value)} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Confirm New PIN</label>
            <input className="input-field" placeholder="Re-enter new PIN" type="password" maxLength={10} value={confirmPin} onChange={e => setConfirmPin(e.target.value)} />
          </div>
        </div>

        {error && (<div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>)}
        {submitError && (<div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">{submitError}</div>)}
        {success && (<div className="bg-green-900/40 border border-green-700 text-green-300 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>)}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={!currentPin || !newPin || !confirmPin} className="btn-primary flex-1">Change PIN</button>
        </div>
      </div>
    </div>
  )
}
