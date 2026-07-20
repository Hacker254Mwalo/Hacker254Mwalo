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
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a1a2e 0%, #0d0d1a 60%, #050510 100%)' }}>
      {/* Branding */}
      <div className="mb-2 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          {/* Small diamond/gem icon */}
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L26 14L14 26L2 14L14 2Z" fill="url(#brandGrad)" stroke="#FFD700" strokeWidth="1.2"/>
            <path d="M14 8L20 14L14 20L8 14L14 8Z" fill="#FFD700" opacity="0.4"/>
            <defs>
              <linearGradient id="brandGrad" x1="2" y1="2" x2="26" y2="26">
                <stop offset="0%" stopColor="#FFD700"/>
                <stop offset="100%" stopColor="#DAA520"/>
              </linearGradient>
            </defs>
          </svg>
          <h1 className="text-5xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #DAA520 40%, #FFD700 60%, #B8860B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dumiropay
          </h1>
        </div>
        <p className="text-gray-400 mt-1 text-sm">Kenya's Top 1 Money Making</p>
        <div className="mt-2 h-px w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }}/>
      </div>

      {/* Phone + Gold Tree */}
      <svg width="260" height="200" viewBox="0 0 320 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3 mx-auto">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="trunkG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#6B4C11"/>
          </linearGradient>
          <linearGradient id="branchG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#B8860B"/>
          </linearGradient>
          <linearGradient id="leafG1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8DC"/>
            <stop offset="30%" stopColor="#FFD700"/>
            <stop offset="70%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#996515"/>
          </linearGradient>
          <linearGradient id="leafG2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFACD"/>
            <stop offset="30%" stopColor="#FFEC8B"/>
            <stop offset="70%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#8B7508"/>
          </linearGradient>
          <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.3"/>
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle cx="120" cy="95" r="85" fill="url(#bgGlow)"/>

        {/* === PHONE === */}
        <g filter="url(#leafShadow)">
          {/* Phone body */}
          <rect x="40" y="100" width="80" height="130" rx="10" ry="10" fill="#1a1a2e" stroke="#DAA520" strokeWidth="2"/>
          {/* Screen */}
          <rect x="46" y="115" width="68" height="100" rx="3" ry="3" fill="#0d0d1a"/>
          {/* Top speaker */}
          <rect x="70" y="107" width="20" height="3" rx="1.5" fill="#333"/>
          {/* Screen content - money growth chart */}
          <line x1="50" y1="200" x2="110" y2="160" stroke="#FFD700" strokeWidth="2" strokeLinecap="round"/>
          <line x1="60" y1="200" x2="110" y2="175" stroke="#DAA520" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Small bars */}
          <rect x="52" y="185" width="6" height="15" rx="1" fill="#FFD700" opacity="0.6"/>
          <rect x="62" y="178" width="6" height="22" rx="1" fill="#FFD700" opacity="0.7"/>
          <rect x="72" y="170" width="6" height="30" rx="1" fill="#FFD700" opacity="0.8"/>
          <rect x="82" y="162" width="6" height="38" rx="1" fill="#FFD700" opacity="0.9"/>
          <rect x="92" y="152" width="6" height="48" rx="1" fill="#FFD700"/>
          {/* Home button */}
          <circle cx="80" cy="224" r="4" fill="none" stroke="#DAA520" strokeWidth="1.5"/>
          {/* Status bar dots */}
          <circle cx="55" cy="122" r="2" fill="#FFD700" opacity="0.5"/>
          <circle cx="62" cy="122" r="2" fill="#FFD700" opacity="0.5"/>
          <circle cx="69" cy="122" r="2" fill="#FFD700" opacity="0.5"/>
        </g>

        {/* === TREE TRUNK === */}
        <path d="M117 200 C117 180, 115 160, 112 140" stroke="url(#trunkG)" strokeWidth="8" strokeLinecap="round" fill="none"/>
        <path d="M123 200 C123 180, 125 160, 128 140" stroke="url(#trunkG)" strokeWidth="8" strokeLinecap="round" fill="none"/>
        <path d="M120 200 C120 175, 120 155, 120 130" stroke="url(#trunkG)" strokeWidth="9" strokeLinecap="round" fill="none"/>

        {/* === MAIN BRANCHES === */}
        <path d="M112 140 C90 125, 65 110, 45 95" stroke="url(#branchG)" strokeWidth="5" strokeLinecap="round" fill="none"/>
        <path d="M128 140 C150 125, 175 110, 195 95" stroke="url(#branchG)" strokeWidth="5" strokeLinecap="round" fill="none"/>
        <path d="M120 130 C95 118, 65 108, 40 90" stroke="url(#branchG)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        <path d="M120 130 C145 118, 175 108, 200 90" stroke="url(#branchG)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        <path d="M120 130 C115 105, 120 80, 120 55" stroke="url(#branchG)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>

        {/* === SUB BRANCHES === */}
        <path d="M75 118 C60 105, 50 90, 42 72" stroke="url(#branchG)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M165 118 C180 105, 190 90, 198 72" stroke="url(#branchG)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M55 100 C42 85, 35 70, 30 52" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M185 100 C198 85, 205 70, 210 52" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M120 80 C105 65, 95 50, 85 35" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M120 80 C135 65, 145 50, 155 35" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

        {/* === GOLDEN LEAF SVG PATHS (leaf shape) === */}
        {/* Outer left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="45" cy="92" rx="10" ry="6" fill="url(#leafG1)" transform="rotate(-35 45 92)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="38" cy="68" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(-50 38 68)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="28" cy="48" rx="8" ry="5" fill="url(#leafG1)" transform="rotate(-60 28 48)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="50" cy="55" rx="7.5" ry="4.5" fill="url(#leafG2)" transform="rotate(-20 50 55)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>

        {/* Outer right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="195" cy="92" rx="10" ry="6" fill="url(#leafG1)" transform="rotate(35 195 92)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="202" cy="68" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(50 202 68)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="212" cy="48" rx="8" ry="5" fill="url(#leafG1)" transform="rotate(60 212 48)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="190" cy="55" rx="7.5" ry="4.5" fill="url(#leafG2)" transform="rotate(20 190 55)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>

        {/* Inner left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="72" cy="78" rx="8" ry="5" fill="url(#leafG1)" transform="rotate(-40 72 78)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="58" cy="58" rx="7" ry="4.5" fill="url(#leafG2)" transform="rotate(-30 58 58)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="48" cy="82" rx="6.5" ry="4" fill="url(#leafG2)" transform="rotate(-55 48 82)" stroke="#996515" strokeWidth="0.6" opacity="0.8"/></g>

        {/* Inner right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="168" cy="78" rx="8" ry="5" fill="url(#leafG1)" transform="rotate(40 168 78)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="182" cy="58" rx="7" ry="4.5" fill="url(#leafG2)" transform="rotate(30 182 58)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="192" cy="82" rx="6.5" ry="4" fill="url(#leafG2)" transform="rotate(55 192 82)" stroke="#996515" strokeWidth="0.6" opacity="0.8"/></g>

        {/* Top leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="85" cy="32" rx="9" ry="5.5" fill="url(#leafG1)" transform="rotate(-25 85 32)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="155" cy="32" rx="9" ry="5.5" fill="url(#leafG1)" transform="rotate(25 155 32)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="120" cy="22" rx="10" ry="6" fill="url(#leafG1)" transform="rotate(5 120 22)" stroke="#996515" strokeWidth="0.9" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="105" cy="48" rx="7" ry="4.5" fill="url(#leafG2)" transform="rotate(-15 105 48)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="135" cy="48" rx="7" ry="4.5" fill="url(#leafG2)" transform="rotate(15 135 48)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="110" cy="66" rx="7.5" ry="4.5" fill="url(#leafG1)" transform="rotate(-10 110 66)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="130" cy="66" rx="7.5" ry="4.5" fill="url(#leafG1)" transform="rotate(10 130 66)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="100" cy="88" rx="6" ry="4" fill="url(#leafG2)" transform="rotate(-20 100 88)" stroke="#996515" strokeWidth="0.6" opacity="0.8"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="140" cy="88" rx="6" ry="4" fill="url(#leafG2)" transform="rotate(20 140 88)" stroke="#996515" strokeWidth="0.6" opacity="0.8"/></g>
      </svg>

      <div className="w-full max-w-sm">
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
