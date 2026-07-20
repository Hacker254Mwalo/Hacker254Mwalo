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
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: '#8a8a9a' }}>Grow Your Wealth</p>
        <div className="mt-2 h-px w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }}/>
      </div>

      {/* Gold Tree with Money Leaves */}
      <svg width="200" height="180" viewBox="0 0 240 210" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3 mx-auto">
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
          <radialGradient id="coinG" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFF8DC"/>
            <stop offset="30%" stopColor="#FFD700"/>
            <stop offset="70%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#996515"/>
          </radialGradient>
          <radialGradient id="coinG2" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFACD"/>
            <stop offset="30%" stopColor="#FFEC8B"/>
            <stop offset="70%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#8B7508"/>
          </radialGradient>
          <filter id="coinShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000" floodOpacity="0.4"/>
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle cx="120" cy="95" r="85" fill="url(#bgGlow)"/>

        {/* === TREE TRUNK === */}
        {/* Main trunk */}
        <path d="M117 200 C117 180, 115 160, 112 140" stroke="url(#trunkG)" strokeWidth="8" strokeLinecap="round" fill="none"/>
        <path d="M123 200 C123 180, 125 160, 128 140" stroke="url(#trunkG)" strokeWidth="8" strokeLinecap="round" fill="none"/>
        <path d="M120 200 C120 175, 120 155, 120 130" stroke="url(#trunkG)" strokeWidth="9" strokeLinecap="round" fill="none"/>

        {/* === MAIN BRANCHES === */}
        {/* Left lower */}
        <path d="M112 140 C90 125, 65 110, 45 95" stroke="url(#branchG)" strokeWidth="5" strokeLinecap="round" fill="none"/>
        {/* Right lower */}
        <path d="M128 140 C150 125, 175 110, 195 95" stroke="url(#branchG)" strokeWidth="5" strokeLinecap="round" fill="none"/>
        {/* Left mid */}
        <path d="M120 130 C95 118, 65 108, 40 90" stroke="url(#branchG)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        {/* Right mid */}
        <path d="M120 130 C145 118, 175 108, 200 90" stroke="url(#branchG)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        {/* Center top */}
        <path d="M120 130 C115 105, 120 80, 120 55" stroke="url(#branchG)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>

        {/* === SUB BRANCHES === */}
        <path d="M75 118 C60 105, 50 90, 42 72" stroke="url(#branchG)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M165 118 C180 105, 190 90, 198 72" stroke="url(#branchG)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M55 100 C42 85, 35 70, 30 52" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M185 100 C198 85, 205 70, 210 52" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M120 80 C105 65, 95 50, 85 35" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M120 80 C135 65, 145 50, 155 35" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>

        {/* === GOLD COIN LEAVES === */}
        {/* Outer left coins */}
        <g filter="url(#coinShadow)">
          <circle cx="45" cy="93" r="9" fill="url(#coinG)" stroke="#996515" strokeWidth="1.2"/>
          <text x="45" y="97" textAnchor="middle" fontSize="9" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="42" cy="70" r="7.5" fill="url(#coinG2)" stroke="#996515" strokeWidth="1"/>
          <text x="42" y="74" textAnchor="middle" fontSize="7" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="30" cy="50" r="8.5" fill="url(#coinG)" stroke="#996515" strokeWidth="1.2"/>
          <text x="30" y="54" textAnchor="middle" fontSize="8" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>

        {/* Outer right coins */}
        <g filter="url(#coinShadow)">
          <circle cx="195" cy="93" r="9" fill="url(#coinG)" stroke="#996515" strokeWidth="1.2"/>
          <text x="195" y="97" textAnchor="middle" fontSize="9" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="198" cy="70" r="7.5" fill="url(#coinG2)" stroke="#996515" strokeWidth="1"/>
          <text x="198" y="74" textAnchor="middle" fontSize="7" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="210" cy="50" r="8.5" fill="url(#coinG)" stroke="#996515" strokeWidth="1.2"/>
          <text x="210" y="54" textAnchor="middle" fontSize="8" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>

        {/* Inner left coins */}
        <g filter="url(#coinShadow)">
          <circle cx="70" cy="80" r="8" fill="url(#coinG)" stroke="#996515" strokeWidth="1"/>
          <text x="70" y="84" textAnchor="middle" fontSize="8" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="55" cy="60" r="7" fill="url(#coinG2)" stroke="#996515" strokeWidth="1"/>
          <text x="55" y="64" textAnchor="middle" fontSize="7" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>

        {/* Inner right coins */}
        <g filter="url(#coinShadow)">
          <circle cx="170" cy="80" r="8" fill="url(#coinG)" stroke="#996515" strokeWidth="1"/>
          <text x="170" y="84" textAnchor="middle" fontSize="8" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="185" cy="60" r="7" fill="url(#coinG2)" stroke="#996515" strokeWidth="1"/>
          <text x="185" y="64" textAnchor="middle" fontSize="7" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>

        {/* Top coins */}
        <g filter="url(#coinShadow)">
          <circle cx="85" cy="33" r="9" fill="url(#coinG)" stroke="#996515" strokeWidth="1.2"/>
          <text x="85" y="37" textAnchor="middle" fontSize="9" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="155" cy="33" r="9" fill="url(#coinG)" stroke="#996515" strokeWidth="1.2"/>
          <text x="155" y="37" textAnchor="middle" fontSize="9" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="120" cy="25" r="11" fill="url(#coinG)" stroke="#996515" strokeWidth="1.5"/>
          <text x="120" y="30" textAnchor="middle" fontSize="11" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="105" cy="50" r="6" fill="url(#coinG2)" stroke="#996515" strokeWidth="0.8"/>
          <text x="105" y="53" textAnchor="middle" fontSize="6" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="135" cy="50" r="6" fill="url(#coinG2)" stroke="#996515" strokeWidth="0.8"/>
          <text x="135" y="53" textAnchor="middle" fontSize="6" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="110" cy="68" r="7" fill="url(#coinG)" stroke="#996515" strokeWidth="1"/>
          <text x="110" y="72" textAnchor="middle" fontSize="7" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
        <g filter="url(#coinShadow)">
          <circle cx="130" cy="68" r="7" fill="url(#coinG)" stroke="#996515" strokeWidth="1"/>
          <text x="130" y="72" textAnchor="middle" fontSize="7" fill="#6B4C11" fontWeight="900" fontFamily="serif">K</text>
        </g>
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
