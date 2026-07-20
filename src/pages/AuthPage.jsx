import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyUser, createUser, findUserByReferralCode, getUser, generateReferralCode, createPasswordResetRequest } from '../lib/db'
import { canRequestPasswordReset, recordPasswordResetRequest } from '../lib/storage'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [refCode, setRefCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const failRef = useRef({ count: 0, lockedUntil: 0 })
  const { login } = useAuth()
  const navigate = useNavigate()

  function normalizePhone(p) {
    p = p.replace(/\s/g, '')
    if (p.startsWith('07') || p.startsWith('01')) return '+254' + p.slice(1)
    if (p.startsWith('254')) return '+' + p
    return p
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const normalPhone = normalizePhone(phone)
    if (!/^\+254\d{9}$/.test(normalPhone)) {
      setError('Enter a valid Kenyan phone number (07xx or 01xx)')
      setLoading(false)
      return
    }

    if (forgotMode) {
      const rate = canRequestPasswordReset(normalPhone)
      if (!rate.allowed) {
        setError(`Too many reset requests. Please try again in 1 hour.`)
        setLoading(false)
        return
      }
      try {
        const result = await createPasswordResetRequest(normalPhone)
        if (result && result.queued === false) {
          setError('No account found with this phone number. Please register first.')
          setLoading(false)
          return
        }
        recordPasswordResetRequest(normalPhone)
        setForgotSent(true)
      } catch (err) {
        setError(err.message || 'Unable to submit the reset request. Please try again.')
      }
      setLoading(false)
      return
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      setLoading(false)
      return
    }

    try {
      if (tab === 'login') {
        const { _count, lockedUntil } = failRef.current
        if (Date.now() < lockedUntil) {
          const secs = Math.ceil((lockedUntil - Date.now()) / 1000)
          setError(`Too many failed attempts. Try again in ${secs}s.`)
          setLoading(false)
          return
        }

        const userData = await verifyUser(normalPhone, pin)
        if (!userData) {
          failRef.current.count += 1
          if (failRef.current.count >= 5) {
            failRef.current.lockedUntil = Date.now() + 60_000
            failRef.current.count = 0
            setError('Too many failed attempts. Locked for 60 seconds.')
          } else {
            setError('Invalid phone number or PIN')
          }
          setLoading(false)
          return
        }
        failRef.current = { count: 0, lockedUntil: 0 }
        login(userData)
        navigate('/dashboard')
      } else {
        if (!name.trim()) { setError('Please enter your full name'); setLoading(false); return }

        const existing = await getUser(normalPhone)
        if (existing) { setError('Account already exists. Please login.'); setLoading(false); return }

        const referralCode = generateReferralCode(normalPhone)
        let referredBy = null

        if (refCode.trim()) {
          const referrer = await findUserByReferralCode(refCode.trim().toUpperCase())
          if (referrer) referredBy = referrer.phone
        }

        const userData = await createUser({
          phone: normalPhone,
          name: name.trim(),
          pin,
          referralCode,
          referredBy,
        })

        login({ ...userData, id: normalPhone })
        navigate('/dashboard')
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="mb-4 text-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
          Dumiropay
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Kenya's Premier Investment Platform</p>
      </div>

      {/* Gold Financial Tree */}
      <svg width="180" height="160" viewBox="0 0 200 170" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4 mx-auto">
        {/* Glow effect */}
        <defs>
          <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#FFD700" stopOpacity="0.3"/>
            <stop offset="100%" stop-color="#FFD700" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFD700"/>
            <stop offset="50%" stop-color="#DAA520"/>
            <stop offset="100%" stop-color="#B8860B"/>
          </linearGradient>
          <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#B8860B"/>
            <stop offset="100%" stop-color="#8B6914"/>
          </linearGradient>
          <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FFD700"/>
            <stop offset="100%" stop-color="#DAA520"/>
          </linearGradient>
        </defs>

        {/* Background glow */}
        <circle cx="100" cy="80" r="70" fill="url(#goldGlow)"/>

        {/* Tree trunk */}
        <path d="M95 155 C95 140, 92 125, 88 115" stroke="url(#trunkGrad)" strokeWidth="6" strokeLinecap="round" fill="none"/>
        <path d="M100 155 C100 135, 100 120, 100 100" stroke="url(#trunkGrad)" strokeWidth="7" strokeLinecap="round" fill="none"/>
        <path d="M105 155 C105 140, 108 125, 112 115" stroke="url(#trunkGrad)" strokeWidth="6" strokeLinecap="round" fill="none"/>

        {/* Main branches */}
        <path d="M88 115 C70 100, 50 85, 40 70" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M112 115 C130 100, 150 85, 160 70" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M100 100 C80 90, 55 80, 45 60" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M100 100 C120 90, 145 80, 155 60" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" fill="none"/>
        <path d="M100 100 C95 75, 100 55, 100 35" stroke="url(#goldGrad)" strokeWidth="4" strokeLinecap="round" fill="none"/>

        {/* Sub-branches */}
        <path d="M70 90 C60 80, 55 70, 50 55" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M130 90 C140 80, 145 70, 150 55" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M80 82 C72 68, 65 55, 60 42" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M120 82 C128 68, 135 55, 140 42" stroke="url(#goldGrad)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

        {/* Coin/fruit circles on branches — representing money growing */}
        <circle cx="40" cy="68" r="7" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.9"/>
        <circle cx="50" cy="53" r="5" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.85"/>
        <circle cx="45" cy="58" r="4" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.8"/>
        <circle cx="160" cy="68" r="7" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.9"/>
        <circle cx="150" cy="53" r="5" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.85"/>
        <circle cx="155" cy="58" r="4" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.8"/>
        <circle cx="60" cy="40" r="6" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.9"/>
        <circle cx="65" cy="35" r="4.5" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.85"/>
        <circle cx="140" cy="40" r="6" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.9"/>
        <circle cx="135" cy="35" r="4.5" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.85"/>
        <circle cx="100" cy="32" r="8" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1.2" opacity="0.95"/>
        <circle cx="92" cy="42" r="5" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.85"/>
        <circle cx="108" cy="42" r="5" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.85"/>
        <circle cx="96" cy="22" r="4" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.8"/>
        <circle cx="104" cy="22" r="4" fill="url(#leafGrad)" stroke="#B8860B" strokeWidth="1" opacity="0.8"/>

        {/* Dollar signs on the coins */}
        <text x="40" y="72" textAnchor="middle" fontSize="7" fill="#8B6914" fontWeight="bold">K</text>
        <text x="160" y="72" textAnchor="middle" fontSize="7" fill="#8B6914" fontWeight="bold">K</text>
        <text x="100" y="37" textAnchor="middle" fontSize="9" fill="#8B6914" fontWeight="bold">K</text>
        <text x="60" y="44" textAnchor="middle" fontSize="6" fill="#8B6914" fontWeight="bold">K</text>
        <text x="140" y="44" textAnchor="middle" fontSize="6" fill="#8B6914" fontWeight="bold">K</text>
      </svg>

      <div className="w-full max-w-md">
        <div className="card">
          {!forgotMode ? (
            <>
              <div className="flex gap-1 bg-gray-800 p-1 rounded-xl mb-6">
                {['login', 'register'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError('') }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                      tab === t ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow' : 'text-gray-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {tab === 'register' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Full Name</label>
                    <input
                      className="input-field"
                      placeholder="John Kamau"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Phone Number</label>
                  <input
                    className="input-field"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    type="tel"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">PIN (4–6 digits)</label>
                  <input
                    className="input-field"
                    placeholder="••••"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                {tab === 'register' && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Referral Code (optional)</label>
                    <input
                      className="input-field"
                      placeholder="e.g. DUM712345"
                      value={refCode}
                      onChange={e => setRefCode(e.target.value)}
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-center mt-2"
                >
                  {loading ? 'Please wait...' : tab === 'login' ? 'Login' : 'Create Account'}
                </button>
              </form>

              {tab === 'login' && (
                <p className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(''); setForgotSent(false) }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold mb-1">Reset Password</h3>
              <p className="text-gray-400 text-sm mb-6">
                {forgotSent
                  ? 'Your request has been received. A verification code will be provided by admin or contact support via WhatsApp.'
                  : 'Enter your registered phone number to request a password reset. A code will be provided by admin.'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Phone Number</label>
                  <input
                    className="input-field"
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    type="tel"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full text-center"
                >
                  {loading ? 'Please wait...' : forgotSent ? 'Send Another Request' : 'Submit Request'}
                </button>
              </form>

              <p className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setError(''); setForgotSent(false) }}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  ← Back to Login
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By using Dumiropay you agree to our Terms & Conditions.
        </p>
      </div>
    </div>
  )
}
