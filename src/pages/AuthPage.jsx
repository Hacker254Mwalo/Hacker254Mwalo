import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { verifyUser, createUser, findUserByReferralCode, getUser, generateReferralCode, createPasswordResetRequest } from '../lib/db'
import { canRequestPasswordReset, recordPasswordResetRequest } from '../lib/storage'

const TRUST_SIGNALS = [
  'Private member access',
  'Simple onboarding',
  'Privacy-first experience',
]



const PREVIEW_ITEMS = [
  { label: 'Account', value: 'Access' },
  { label: 'Plans', value: 'Ready' },
  { label: 'History', value: 'Available' },
]


export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [refCode, setRefCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [focusedField, setFocusedField] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [mobile, setMobile] = useState(false)
  const failRef = useRef({ count: 0, lockedUntil: 0 })
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showSplash, setShowSplash] = useState(() => !localStorage.getItem('dp_visited'))
  const [splashStage, setSplashStage] = useState(0)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)

    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      setRefCode(ref.toUpperCase())
      setTab('register')
    }

    if (showSplash) {
      const t1 = setTimeout(() => setSplashStage(1), 500)
      const t2 = setTimeout(() => setSplashStage(2), 1100)
      const t3 = setTimeout(() => setSplashStage(3), 1800)
      const t4 = setTimeout(() => {
        setShowSplash(false)
        localStorage.setItem('dp_visited', '1')
      }, 2800)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(t4)
        window.removeEventListener('resize', check)
      }
    }

    return () => window.removeEventListener('resize', check)
  }, [showSplash])

  function normalizePhone(p) {
    p = p.replace(/\s/g, '')
    if (p.startsWith('07') || p.startsWith('01')) return '+254' + p.slice(1)
    if (p.startsWith('254')) return '+' + p
    return p
  }

  function resetFeedback() {
    setError('')
    setShowSuccess(false)
  }

  function triggerErrorState(message, field = '') {
    setError(message)
    setFocusedField(field)
    setLoading(false)
    setShaking(true)
    setTimeout(() => setShaking(false), 600)
  }

  function switchTab(nextTab) {
    setTab(nextTab)
    setForgotMode(false)
    setForgotSent(false)
    setShowPin(false)
    resetFeedback()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const normalPhone = normalizePhone(phone)
    if (!/^\+254\d{9}$/.test(normalPhone)) {
      setError('Enter a valid Kenyan phone number starting with 07, 01, or 254.')
      setLoading(false)
      return
    }

    if (forgotMode) {
      const rate = canRequestPasswordReset(normalPhone)
      if (!rate.allowed) {
        setError('Too many reset requests. Please try again in 1 hour.')
        setLoading(false)
        return
      }
      try {
        const result = await createPasswordResetRequest(normalPhone)
        if (result && result.queued === false) {
          setError('No account was found for that number. Please register first.')
          setLoading(false)
          return
        }
        recordPasswordResetRequest(normalPhone)
        setForgotSent(true)
      } catch (err) {
        setError(err.message || 'Unable to submit the reset request right now.')
      }
      setLoading(false)
      return
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits.')
      setLoading(false)
      return
    }

    try {
      if (tab === 'login') {
        const { lockedUntil } = failRef.current
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
            triggerErrorState('Too many failed attempts. Locked for 60 seconds.')
          } else {
            triggerErrorState('Invalid phone number or PIN.')
          }
          return
        }

        failRef.current = { count: 0, lockedUntil: 0 }
        login(userData)
        setShowSuccess(true)
        setLoading(false)
        setTimeout(() => navigate('/dashboard'), 500)
        return
      }

      if (!refCode || !refCode.trim()) {
        triggerErrorState('Please enter the code that was shared with you.', 'ref')
        return
      }

      if (!name.trim()) {
        setError('Please enter your full name.')
        setLoading(false)
        return
      }

      const existing = await getUser(normalPhone)
      if (existing) {
        setError('An account already exists for this number. Please sign in instead.')
        setLoading(false)
        return
      }

      const referrer = await findUserByReferralCode(refCode.trim().toUpperCase())
      if (!referrer) {
        triggerErrorState('That code could not be found. Please confirm it and try again.', 'ref')
        return
      }

      const referralCode = generateReferralCode(normalPhone)
      const referredBy = referrer.phone

      const userData = await createUser({
        phone: normalPhone,
        name: name.trim(),
        pin,
        referralCode,
        referredBy,
      })

      login({ ...userData, id: normalPhone })
      setShowSuccess(true)
      setLoading(false)
      setTimeout(() => navigate('/dashboard'), 500)
    } catch (err) {
      console.error(err)
      triggerErrorState('Something went wrong. Please try again.')
    }
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        backgroundImage: 'url(/ai-splash-bg.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {showSplash && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(180deg, #030712 0%, #06101a 100%)', transition: 'opacity 0.5s', opacity: showSplash ? 1 : 0 }}
          onClick={() => {
            setShowSplash(false)
            localStorage.setItem('dp_visited', '1')
          }}
        >
          <div className={`transition-all duration-500 ${splashStage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} mb-6`}>
            <svg width="64" height="64" viewBox="0 0 36 36" fill="none" className="drop-shadow-2xl mx-auto">
              <path d="M18 3L33 18L18 33L3 18L18 3Z" fill="url(#sg)" stroke="#FFD700" strokeWidth="1.5" />
              <path d="M18 10L25 18L18 26L11 18L18 10Z" fill="#FFD700" opacity="0.3" />
              <defs>
                <linearGradient id="sg" x1="3" y1="3" x2="33" y2="33">
                  <stop offset="0%" stopColor="#FFD700" />
                  <stop offset="100%" stopColor="#DAA520" />
                </linearGradient>
              </defs>
            </svg>
            <h1
              className="text-4xl font-black tracking-tight text-center mt-3"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FFC125,#DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Dumiropay
            </h1>
          </div>
          <div className={`transition-all duration-500 delay-300 ${splashStage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} text-center mb-8`}>
            <p className="text-gray-300 text-sm">Private platform access</p>
            <p className="text-[11px] font-bold tracking-widest uppercase mt-1" style={{ color: 'rgba(255,215,0,0.5)' }}>
              GPU Nodes · Daily Yield · Member Access
            </p>
          </div>
          <div className={`transition-all duration-500 delay-500 ${splashStage >= 3 ? 'opacity-100' : 'opacity-0'} w-48`}>
            <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: '100%', background: 'linear-gradient(90deg, #FFD700, #DAA520)', animation: 'shimmer 1.2s ease-in-out' }} />
            </div>
            <p className="text-center text-[9px] text-gray-500 mt-2">Preparing secure access…</p>
          </div>
          <p className="absolute bottom-6 text-[8px] text-gray-600">Tap anywhere to skip</p>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(3, 7, 18, 0.72)', zIndex: 0 }} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)', animation: 'floatSymbol 12s ease-in-out infinite' }} />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)', animation: 'floatSymbol 15s ease-in-out infinite reverse' }} />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', animation: 'floatSymbol 10s ease-in-out infinite' }} />
        {Array.from({ length: mobile ? 10 : 18 }).map((_, i) => (
          <div
            key={i}
            className="gold-particle"
            style={{
              left: `${4 + (i * (mobile ? 9 : 5))}%`,
              animationDuration: `${12 + (i % 5) * 3}s`,
              animationDelay: `${(i % 7) * 1.5}s`,
              width: `${2 + (i % 2)}px`,
              height: `${2 + (i % 2)}px`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 px-4 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-6xl">
          <div
            className="mb-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[11px] font-semibold tracking-[0.22em] uppercase"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.86) 0%, rgba(9,13,25,0.92) 100%)',
              border: '1px solid rgba(255,215,0,0.14)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
              backdropFilter: 'blur(14px)',
            }}
          >
            {TRUST_SIGNALS.map((signal, index) => (
              <div key={signal} className="flex items-center gap-2 text-center" style={{ color: index === 0 ? '#F8E7A1' : 'rgba(226,232,240,0.85)' }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: index === 0 ? '#FFD700' : index === 1 ? '#60A5FA' : '#34D399' }} />
                <span>{signal}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <div className="space-y-6">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.24) 0%, rgba(184,134,11,0.12) 100%)', border: '1px solid rgba(255,215,0,0.3)' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
                      <path d="M18 3L33 18L18 33L3 18L18 3Z" fill="url(#brandGrad)" stroke="#FFD700" strokeWidth="1.5" />
                      <path d="M18 10L25 18L18 26L11 18L18 10Z" fill="#FFD700" opacity="0.3" />
                      <defs>
                        <linearGradient id="brandGrad" x1="3" y1="3" x2="33" y2="33">
                          <stop offset="0%" stopColor="#FFD700" />
                          <stop offset="50%" stopColor="#FFC125" />
                          <stop offset="100%" stopColor="#DAA520" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.32em]" style={{ color: 'rgba(255,215,0,0.72)' }}>Dumiropay</p>
                    <p className="text-sm text-slate-300">Private member access</p>
                  </div>
                </div>
              </div>

              <div
                className="overflow-hidden rounded-3xl"
                style={{
                  background: 'linear-gradient(145deg, rgba(17,24,39,0.88) 0%, rgba(9,13,25,0.96) 100%)',
                  border: '1px solid rgba(255,215,0,0.12)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}
              >
                <div className="p-5">
                  <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-slate-950/60 p-3">
                    <img
                      src="/datacenter-ai.webp"
                      alt="Platform preview"
                      className="w-full rounded-xl object-cover"
                      style={{ maxHeight: '260px', animation: 'coinHeartbeat 4s ease-in-out infinite' }}
                    />
                    <div className="absolute inset-x-6 bottom-6 rounded-2xl border border-white/10 bg-slate-950/78 p-4 backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: 'rgba(255,215,0,0.72)' }}>Private access preview</p>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {PREVIEW_ITEMS.map((item) => (
                          <div key={item.label} className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-center">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                            <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`card relative ${shaking ? 'shake-card' : ''}`}
              style={{
                background: 'linear-gradient(145deg, rgba(20,20,40,0.84) 0%, rgba(10,10,25,0.96) 100%)',
                border: '1px solid rgba(255,215,0,0.14)',
                boxShadow: '0 18px 60px rgba(0,0,0,0.36), 0 0 60px rgba(255,215,0,0.04)',
                backdropFilter: 'blur(14px)',
              }}
            >
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.32em]" style={{ color: forgotMode ? 'rgba(96,165,250,0.82)' : 'rgba(255,215,0,0.72)' }}>
                    {forgotMode ? 'Account recovery' : tab === 'login' ? 'Member access' : 'Account setup'}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">
                    {forgotMode ? 'Recover your account access' : tab === 'login' ? 'Welcome back' : 'Create your account'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {forgotMode
                      ? 'Submit your number to start a guided recovery request.'
                      : tab === 'login'
                        ? 'Use your phone number and PIN to open your account.'
                        : 'Set up your account to access the compute network.'}
                  </p>
                </div>
                <div
                  className="rounded-2xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.24em]"
                  style={{
                    background: forgotMode ? 'rgba(96,165,250,0.12)' : 'rgba(255,215,0,0.12)',
                    color: forgotMode ? '#93C5FD' : '#FDE68A',
                    border: `1px solid ${forgotMode ? 'rgba(96,165,250,0.2)' : 'rgba(255,215,0,0.18)'}`,
                  }}
                >
                  {forgotMode ? 'Recovery' : tab === 'login' ? 'Sign in' : 'Register'}
                </div>
              </div>

              {!forgotMode && (
                <div className="mb-6 flex gap-1 rounded-xl border p-1" style={{ background: 'rgba(0,0,0,0.36)', borderColor: 'rgba(255,215,0,0.1)' }}>
                  {['login', 'register'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => switchTab(t)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition-all duration-300 ${
                        tab === t ? 'text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                      }`}
                      style={tab === t ? { background: 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)', color: '#000' } : {}}
                    >
                      {t === 'login' ? 'Sign in' : 'Register'}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {!forgotMode && tab === 'register' && (
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                      <span style={{ color: focusedField === 'name' ? '#FFD700' : '#9ca3af', transition: 'color 0.2s' }}>👤</span>
                      Full name
                    </label>
                    <input
                      className={`input-field ${focusedField === 'name' ? 'input-gold-focus' : ''}`}
                      placeholder="John Kamau"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField('')}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                    <span style={{ color: focusedField === 'phone' ? '#FFD700' : '#9ca3af', transition: 'color 0.2s' }}>📞</span>
                    Phone number
                  </label>
                  <input
                    className={`input-field ${focusedField === 'phone' ? 'input-gold-focus' : ''}`}
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField('')}
                    type="tel"
                    required
                  />
                  <p className="mt-2 text-[11px] text-slate-500">Use the phone number linked to your account.</p>
                </div>

                {!forgotMode && (
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                      <span style={{ color: focusedField === 'pin' ? '#FFD700' : '#9ca3af', transition: 'color 0.2s' }}>🔒</span>
                      PIN (4–6 digits)
                    </label>
                    <div className="relative">
                      <input
                        className={`input-field pr-24 ${focusedField === 'pin' ? 'input-gold-focus' : ''}`}
                        placeholder="••••"
                        type={showPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={6}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        onFocus={() => setFocusedField('pin')}
                        onBlur={() => setFocusedField('')}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-colors hover:text-slate-200"
                      >
                        {showPin ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                )}

                {!forgotMode && tab === 'register' && (
                  <div>
                    <label className="mb-1 flex items-center gap-2 text-xs text-gray-400">
                      <span style={{ color: focusedField === 'ref' ? '#FFD700' : '#9ca3af', transition: 'color 0.2s' }}>✉️</span>
                      Access code
                    </label>
                    <input
                      className={`input-field ${focusedField === 'ref' ? 'input-gold-focus' : ''}`}
                      placeholder="e.g. DUM712345"
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value.toUpperCase())}
                      onFocus={() => setFocusedField('ref')}
                      onBlur={() => setFocusedField('')}
                      required
                    />
                    <div className="mt-3 rounded-xl border border-amber-300/12 bg-amber-200/5 px-3 py-3 text-xs leading-6 text-slate-300">
                      Your access code connects your account to the compute network through a trusted member.
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-700 bg-red-900/40 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                {forgotMode && forgotSent && (
                  <div className="rounded-lg border border-emerald-700/60 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-300">
                    Your request has been received. A recovery code will be provided through the normal support flow.
                  </div>
                )}


                <button
                  type="submit"
                  disabled={loading || showSuccess}
                  className="mt-2 w-full rounded-xl px-6 py-3.5 text-center text-sm font-bold tracking-wide transition-all duration-300 active:scale-95 disabled:cursor-not-allowed"
                  style={{
                    background: showSuccess
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : loading
                        ? 'linear-gradient(135deg, #996515 0%, #6B4C11 100%)'
                        : 'linear-gradient(135deg, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
                    color: showSuccess ? '#fff' : loading ? '#999' : '#000',
                    boxShadow: showSuccess ? '0 4px 20px rgba(34,197,94,0.3)' : loading ? 'none' : '0 4px 20px rgba(255,215,0,0.25), 0 0 40px rgba(255,215,0,0.08)',
                  }}
                >
                  {showSuccess ? (
                    <span className="check-pop flex items-center justify-center gap-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Access confirmed
                    </span>
                  ) : loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {forgotMode ? 'Submitting request…' : tab === 'login' ? 'Signing in…' : 'Creating account…'}
                    </span>
                  ) : forgotMode ? 'Submit recovery request' : tab === 'login' ? 'Sign in' : 'Create account access'}
                </button>
              </form>

              {!forgotMode ? (
                <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true)
                      setForgotSent(false)
                      setShowPin(false)
                      resetFeedback()
                    }}
                    className="text-left transition-colors hover:text-[#FFD700]"
                  >
                    Forgot your PIN or need account recovery?
                  </button>
                  <span className="text-xs text-slate-500">Need help? Use the recovery flow or contact support.</span>
                </div>
              ) : (
                <p className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(false)
                      setForgotSent(false)
                      setShowPin(false)
                      resetFeedback()
                    }}
                    className="text-xs transition-colors"
                    style={{ color: '#DAA520' }}
                    onMouseEnter={(e) => { e.target.style.color = '#FFD700' }}
                    onMouseLeave={(e) => { e.target.style.color = '#DAA520' }}
                  >
                    ← Back to sign in
                  </button>
                </p>
              )}

              <p className="mt-6 text-center text-xs" style={{ color: 'rgba(218,165,32,0.58)' }}>
                By using Dumiropay you agree to our{' '}
                <button type="button" onClick={() => navigate('/terms')} className="underline hover:text-[#FFD700]">
                  Terms & Conditions
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => navigate('/privacy')} className="underline hover:text-[#FFD700]">
                  Privacy Policy
                </button>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
