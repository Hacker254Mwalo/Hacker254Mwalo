import { useState, useRef, useEffect } from 'react'
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [focusedField, setFocusedField] = useState('')
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const failRef = useRef({ count: 0, lockedUntil: 0 })
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)

    // Automatically capture referral code from URL (e.g. ?ref=DUM123456)
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      setRefCode(ref.toUpperCase())
      setTab('register') // Switch to register tab if coming from a referral link
    }

    return () => window.removeEventListener('resize', check)
  }, [])

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
          setShaking(true)
          setTimeout(() => setShaking(false), 600)
          return
        }
        failRef.current = { count: 0, lockedUntil: 0 }
        login(userData)
        setShowSuccess(true)
        setLoading(false)
        setTimeout(() => navigate('/dashboard'), 600)
        return
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
      setLoading(false)
      setShaking(true)
      setTimeout(() => setShaking(false), 600)
      return
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #050510 0%, #0a0a1a 30%, #0d0d25 60%, #050510 100%)' }}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #FFD700 0%, transparent 70%)', animation: 'floatSymbol 12s ease-in-out infinite' }}/>
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #DAA520 0%, transparent 70%)', animation: 'floatSymbol 15s ease-in-out infinite', animationDelay: '3s' }}/>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #B8860B 0%, transparent 70%)', animation: 'floatSymbol 10s ease-in-out infinite', animationDelay: '6s' }}/>
        {/* Gold Particles — 10 on mobile, 20 on desktop */}
        {Array.from({ length: mobile ? 10 : 20 }).map((_, i) => (
          <div
            key={i}
            className="gold-particle"
            style={{
              left: `${5 + (i * (mobile ? 9 : 4.5))}%`,
              animationDuration: `${12 + (i % 5) * 3}s`,
              animationDelay: `${(i % 7) * 1.5}s`,
              width: `${2 + (i % 2)}px`,
              height: `${2 + (i % 2)}px`,
            }}
          />
        ))}
      </div>

      {/* Branding */}
      <div className="mb-3 text-center relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          {/* Premium diamond logo */}
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="drop-shadow-lg">
            <path d="M18 3L33 18L18 33L3 18L18 3Z" fill="url(#brandGrad)" stroke="#FFD700" strokeWidth="1.5"/>
            <path d="M18 10L25 18L18 26L11 18L18 10Z" fill="#FFD700" opacity="0.3"/>
            <defs>
              <linearGradient id="brandGrad" x1="3" y1="3" x2="33" y2="33">
                <stop offset="0%" stopColor="#FFD700"/>
                <stop offset="50%" stopColor="#FFC125"/>
                <stop offset="100%" stopColor="#DAA520"/>
              </linearGradient>
            </defs>
          </svg>
          <h1 className="text-5xl font-black tracking-tight" style={{ background: 'linear-gradient(135deg, #FFD700 0%, #FFC125 30%, #DAA520 60%, #B8860B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 0 40px rgba(255,215,0,0.15)' }}>
            Dumiropay
          </h1>
        </div>
        <p className="text-gray-300 mt-1 text-sm tracking-wide">Kenya's Premier Investment Platform</p>
        <p className="mt-0.5 text-xs font-bold tracking-widest uppercase" style={{ background: 'linear-gradient(90deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TOP KENYA 1 ONLINE EARNING PLATFORM</p>
        <div className="mt-3 h-px w-32 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, #DAA520, transparent)' }}/>
      </div>

      {/* Professional Money Tree with Green Leaves */}
      <svg width="220" height="185" viewBox="0 0 260 205" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4 mx-auto drop-shadow-lg">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.12"/>
            <stop offset="60%" stopColor="#FFD700" stopOpacity="0.06"/>
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="trunkG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5E3C"/>
            <stop offset="50%" stopColor="#6B4226"/>
            <stop offset="100%" stopColor="#3D2010"/>
          </linearGradient>
          <linearGradient id="branchG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7B5230"/>
            <stop offset="100%" stopColor="#5C3D1E"/>
          </linearGradient>
          {/* Deep green leaves */}
          <linearGradient id="leafDark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80"/>
            <stop offset="40%" stopColor="#16a34a"/>
            <stop offset="100%" stopColor="#14532d"/>
          </linearGradient>
          {/* Mid green leaves */}
          <linearGradient id="leafMid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#86efac"/>
            <stop offset="50%" stopColor="#22c55e"/>
            <stop offset="100%" stopColor="#15803d"/>
          </linearGradient>
          {/* Light green leaves */}
          <linearGradient id="leafLight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bbf7d0"/>
            <stop offset="50%" stopColor="#4ade80"/>
            <stop offset="100%" stopColor="#16a34a"/>
          </linearGradient>
          {/* Gold coin gradient */}
          <linearGradient id="coinG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8DC"/>
            <stop offset="30%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#B8860B"/>
          </linearGradient>
          <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#14532d" floodOpacity="0.3"/>
          </filter>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="coinGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Ambient glow */}
        <ellipse cx="130" cy="100" rx="90" ry="70" fill="url(#bgGlow)"/>

        {/* === PHONE (left side) === */}
        <g>
          <rect x="30" y="88" width="48" height="82" rx="6" fill="#1a1a2e" stroke="#DAA520" strokeWidth="1.2"/>
          <rect x="34" y="97" width="40" height="62" rx="1.5" fill="#0d0d1a"/>
          <rect x="48" y="91" width="12" height="1.5" rx="0.7" fill="#333"/>
          {/* Chart bars */}
          <rect x="37" y="143" width="3.5" height="10" rx="0.5" fill="#FFD700" opacity="0.8"/>
          <rect x="43" y="136" width="3.5" height="17" rx="0.5" fill="#FFD700" opacity="0.9"/>
          <rect x="49" y="128" width="3.5" height="25" rx="0.5" fill="#FFD700"/>
          <rect x="55" y="133" width="3.5" height="20" rx="0.5" fill="#22c55e"/>
          <rect x="61" y="125" width="3.5" height="28" rx="0.5" fill="#22c55e"/>
          <circle cx="54" cy="170" r="2.5" fill="none" stroke="#DAA520" strokeWidth="1"/>
        </g>

        {/* === TREE TRUNK === */}
        <path d="M130 190 C126 168, 134 148, 130 118" stroke="url(#trunkG)" strokeWidth="10" strokeLinecap="round" fill="none"/>
        {/* Trunk texture lines */}
        <path d="M128 175 C127 170, 129 165, 128 160" stroke="#3D2010" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
        <path d="M132 180 C131 174, 133 168, 132 162" stroke="#3D2010" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>

        {/* === PRIMARY BRANCHES === */}
        <path d="M130 118 C112 108, 92 100, 72 88" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <path d="M130 118 C148 108, 168 100, 188 88" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <path d="M130 118 C133 96, 127 74, 130 38" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>

        {/* === SECONDARY BRANCHES === */}
        <path d="M100 106 C82 96, 62 78, 46 54" stroke="url(#branchG)" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <path d="M160 106 C178 96, 198 78, 214 54" stroke="url(#branchG)" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <path d="M130 80 C116 68, 106 52, 96 28" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M130 80 C144 68, 154 52, 164 28" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M72 88 C56 82, 40 72, 30 57" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M188 88 C204 82, 220 72, 230 57" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        {/* Extra small branches */}
        <path d="M96 28 C88 20, 80 14, 72 10" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M164 28 C172 20, 180 14, 188 10" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

        {/* === GREEN LEAVES — clustered, layered === */}
        <g filter="url(#leafShadow)">
          {/* Top crown */}
          <ellipse cx="130" cy="32" rx="11" ry="6.5" fill="url(#leafDark)" transform="rotate(-5 130 32)"/>
          <ellipse cx="120" cy="26" rx="9" ry="5.5" fill="url(#leafMid)" transform="rotate(-20 120 26)"/>
          <ellipse cx="140" cy="26" rx="9" ry="5.5" fill="url(#leafMid)" transform="rotate(20 140 26)"/>
          <ellipse cx="130" cy="20" rx="7" ry="4" fill="url(#leafLight)" transform="rotate(0 130 20)"/>

          {/* Left primary branch leaves */}
          <ellipse cx="72" cy="82" rx="10" ry="6" fill="url(#leafDark)" transform="rotate(-30 72 82)"/>
          <ellipse cx="60" cy="76" rx="9" ry="5.5" fill="url(#leafMid)" transform="rotate(-45 60 76)"/>
          <ellipse cx="82" cy="76" rx="8" ry="5" fill="url(#leafLight)" transform="rotate(-15 82 76)"/>

          {/* Right primary branch leaves */}
          <ellipse cx="188" cy="82" rx="10" ry="6" fill="url(#leafDark)" transform="rotate(30 188 82)"/>
          <ellipse cx="200" cy="76" rx="9" ry="5.5" fill="url(#leafMid)" transform="rotate(45 200 76)"/>
          <ellipse cx="178" cy="76" rx="8" ry="5" fill="url(#leafLight)" transform="rotate(15 178 76)"/>

          {/* Far left branch leaves */}
          <ellipse cx="46" cy="48" rx="9" ry="5.5" fill="url(#leafDark)" transform="rotate(-45 46 48)"/>
          <ellipse cx="34" cy="52" rx="7.5" ry="4.5" fill="url(#leafMid)" transform="rotate(-55 34 52)"/>
          <ellipse cx="30" cy="42" rx="7" ry="4" fill="url(#leafLight)" transform="rotate(-60 30 42)"/>

          {/* Far right branch leaves */}
          <ellipse cx="214" cy="48" rx="9" ry="5.5" fill="url(#leafDark)" transform="rotate(45 214 48)"/>
          <ellipse cx="226" cy="52" rx="7.5" ry="4.5" fill="url(#leafMid)" transform="rotate(55 226 52)"/>
          <ellipse cx="230" cy="42" rx="7" ry="4" fill="url(#leafLight)" transform="rotate(60 230 42)"/>

          {/* Upper left sub-branch */}
          <ellipse cx="96" cy="22" rx="8" ry="5" fill="url(#leafDark)" transform="rotate(-25 96 22)"/>
          <ellipse cx="84" cy="16" rx="7" ry="4" fill="url(#leafMid)" transform="rotate(-35 84 16)"/>
          <ellipse cx="72" cy="10" rx="6" ry="3.5" fill="url(#leafLight)" transform="rotate(-50 72 10)"/>

          {/* Upper right sub-branch */}
          <ellipse cx="164" cy="22" rx="8" ry="5" fill="url(#leafDark)" transform="rotate(25 164 22)"/>
          <ellipse cx="176" cy="16" rx="7" ry="4" fill="url(#leafMid)" transform="rotate(35 176 16)"/>
          <ellipse cx="188" cy="10" rx="6" ry="3.5" fill="url(#leafLight)" transform="rotate(50 188 10)"/>

          {/* Mid-level inner leaves */}
          <ellipse cx="115" cy="68" rx="7.5" ry="4.5" fill="url(#leafMid)" transform="rotate(-18 115 68)"/>
          <ellipse cx="145" cy="68" rx="7.5" ry="4.5" fill="url(#leafMid)" transform="rotate(18 145 68)"/>
          <ellipse cx="108" cy="58" rx="6.5" ry="4" fill="url(#leafLight)" transform="rotate(-25 108 58)"/>
          <ellipse cx="152" cy="58" rx="6.5" ry="4" fill="url(#leafLight)" transform="rotate(25 152 58)"/>
        </g>

        {/* === GOLD COINS hanging from branches === */}
        <g filter="url(#coinGlow)">
          {/* Coin 1 - left branch */}
          <circle cx="68" cy="95" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="68" y="98.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#5C3D0E">$</text>
          {/* Coin 2 - right branch */}
          <circle cx="192" cy="95" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="192" y="98.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#5C3D0E">$</text>
          {/* Coin 3 - top */}
          <circle cx="130" cy="45" r="5.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="130" y="48.5" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#5C3D0E">$</text>
          {/* Coin 4 - far left */}
          <circle cx="44" cy="62" r="5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="44" y="65" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#5C3D0E">$</text>
          {/* Coin 5 - far right */}
          <circle cx="216" cy="62" r="5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="216" y="65" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#5C3D0E">$</text>
        </g>

        {/* === SPARKLES & GLINTS === */}
        <g filter="url(#glow)">
          <circle cx="130" cy="18" r="1.8" fill="#bbf7d0">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="r" values="1.2;2;1.2" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="46" cy="42" r="1.4" fill="#4ade80">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite" begin="0.5s"/>
          </circle>
          <circle cx="214" cy="42" r="1.4" fill="#4ade80">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" repeatCount="indefinite" begin="1s"/>
          </circle>
          <circle cx="96" cy="16" r="1.2" fill="#FFD700">
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="3s" repeatCount="indefinite" begin="0.8s"/>
          </circle>
          <circle cx="164" cy="16" r="1.2" fill="#FFD700">
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
          </circle>
          {/* Gold coin sparkle */}
          <circle cx="68" cy="88" r="1" fill="#FFF8DC">
            <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
          </circle>
          <circle cx="192" cy="88" r="1" fill="#FFF8DC">
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.9s"/>
          </circle>
        </g>
      </svg>

      <div className="w-full max-w-sm relative z-10">
        {/* Investor Stats Banner */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="text-center p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(218,165,32,0.04) 100%)', border: '1px solid rgba(255,215,0,0.12)' }}>
            <p className="text-lg font-bold" style={{ color: '#FFD700' }}>KES</p>
            <p className="text-[10px] text-gray-400 tracking-wide">Make Money Online Watching Grow</p>
          </div>
          <div className="text-center p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(218,165,32,0.04) 100%)', border: '1px solid rgba(255,215,0,0.12)' }}>
            <p className="text-lg font-bold" style={{ color: '#FFD700' }}>24/7</p>
            <p className="text-[10px] text-gray-400 tracking-wide">Withdrawal</p>
          </div>
          <div className="text-center p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(218,165,32,0.04) 100%)', border: '1px solid rgba(255,215,0,0.12)' }}>
            <p className="text-lg font-bold" style={{ color: '#FFD700' }}>100%</p>
            <p className="text-[10px] text-gray-400 tracking-wide">Start Earning & Withdraw Directly to M-Pesa</p>
          </div>
        </div>

        <div className={`card ${shaking ? 'shake-card' : ''}`} style={{ background: 'linear-gradient(145deg, rgba(20,20,40,0.85) 0%, rgba(10,10,25,0.95) 100%)', border: '1px solid rgba(255,215,0,0.15)', boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(255,215,0,0.05)', backdropFilter: 'blur(12px)' }}>
          {!forgotMode ? (
            <>
              <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,215,0,0.1)' }}>
                {['login', 'register'].map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError('') }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold capitalize transition-all duration-300 ${
                      tab === t ? 'text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                    }`}
                    style={tab === t ? { background: 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)', color: '#000' } : {}}
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
                  <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <span style={{ color: focusedField === 'phone' ? '#FFD700' : '#9ca3af', transition: 'color 0.2s' }}>📞</span>
                    Phone Number
                  </label>
                  <input
                    className={`input-field ${focusedField === 'phone' ? 'input-gold-focus' : ''}`}
                    placeholder="0712 345 678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    onFocus={() => setFocusedField('phone')}
                    onBlur={() => setFocusedField('')}
                    type="tel"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    <span style={{ color: focusedField === 'pin' ? '#FFD700' : '#9ca3af', transition: 'color 0.2s' }}>🔒</span>
                    PIN (4–6 digits)
                  </label>
                  <input
                    className={`input-field ${focusedField === 'pin' ? 'input-gold-focus' : ''}`}
                    placeholder="••••"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocusedField('pin')}
                    onBlur={() => setFocusedField('')}
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
                  disabled={loading || showSuccess}
                  className="w-full text-center mt-2 py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-95 disabled:cursor-not-allowed"
                  style={{
                    background: showSuccess ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : loading ? 'linear-gradient(135deg, #996515 0%, #6B4C11 100%)' : 'linear-gradient(135deg, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
                    color: showSuccess ? '#fff' : loading ? '#999' : '#000',
                    boxShadow: showSuccess ? '0 4px 20px rgba(34,197,94,0.3)' : loading ? 'none' : '0 4px 20px rgba(255,215,0,0.25), 0 0 40px rgba(255,215,0,0.08)',
                  }}
                >
                  {showSuccess ? (
                    <span className="flex items-center justify-center gap-2 check-pop">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      Success!
                    </span>
                  ) : loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      Signing In...
                    </span>
                  ) : tab === 'login' ? 'Access Dashboard →' : 'Start Investing Today'}
                </button>
              </form>

              {tab === 'login' && (
                <p className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setError(''); setForgotSent(false) }}
                    className="text-xs transition-colors"
                    style={{ color: '#DAA520' }}
                    onMouseEnter={e => e.target.style.color = '#FFD700'}
                    onMouseLeave={e => e.target.style.color = '#DAA520'}
                  >
                    Forgot Password?
                  </button>
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold mb-1" style={{ background: 'linear-gradient(135deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Reset Password</h3>
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
                  className="w-full text-center py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading ? 'linear-gradient(135deg, #996515 0%, #6B4C11 100%)' : 'linear-gradient(135deg, #FFD700 0%, #DAA520 50%, #B8860B 100%)',
                    color: loading ? '#999' : '#000',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(255,215,0,0.25), 0 0 40px rgba(255,215,0,0.08)',
                  }}
                >
                  {loading ? 'Processing...' : forgotSent ? 'Send Another Request' : 'Submit Request'}
                </button>
              </form>

                <p className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setError(''); setForgotSent(false) }}
                    className="text-xs transition-colors"
                    style={{ color: '#DAA520' }}
                    onMouseEnter={e => e.target.style.color = '#FFD700'}
                    onMouseLeave={e => e.target.style.color = '#DAA520'}
                  >
                    ← Back to Login
                  </button>
                </p>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(218,165,32,0.5)' }}>
          By using Dumiropay you agree to our Terms & Conditions.
        </p>
      </div>
    </div>
  )
}
