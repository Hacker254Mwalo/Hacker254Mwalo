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
        <p className="mt-0.5 text-xs font-bold tracking-widest uppercase" style={{ background: 'linear-gradient(90deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>TOP KENYA 1 EARNINGS PLATFORM</p>
        <div className="mt-3 h-px w-32 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, #DAA520, transparent)' }}/>
      </div>

      {/* Professional Money Tree */}
      <svg width="220" height="180" viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4 mx-auto">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
          </radialGradient>
          <linearGradient id="trunkG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD700"/>
            <stop offset="40%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#5C3D0E"/>
          </linearGradient>
          <linearGradient id="branchG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFD700"/>
            <stop offset="60%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#8B6914"/>
          </linearGradient>
          <linearGradient id="branchG2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8DC"/>
            <stop offset="50%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#B8860B"/>
          </linearGradient>
          <linearGradient id="leafG1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8DC"/>
            <stop offset="25%" stopColor="#FFD700"/>
            <stop offset="60%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#996515"/>
          </linearGradient>
          <linearGradient id="leafG2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFACD"/>
            <stop offset="25%" stopColor="#FFEC8B"/>
            <stop offset="60%" stopColor="#DAA520"/>
            <stop offset="100%" stopColor="#8B7508"/>
          </linearGradient>
          <radialGradient id="leafGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0"/>
          </radialGradient>
          <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#FFD700" floodOpacity="0.25"/>
          </filter>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="sparkle" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle cx="130" cy="90" r="80" fill="url(#bgGlow)"/>
        <circle cx="130" cy="75" r="45" fill="url(#leafGlow)" opacity="0.3"/>

        {/* === PHONE === */}
        <g filter="url(#leafShadow)">
          <rect x="35" y="80" width="55" height="95" rx="7" ry="7" fill="#1a1a2e" stroke="#DAA520" strokeWidth="1.5"/>
          <rect x="40" y="90" width="45" height="72" rx="2" ry="2" fill="#0d0d1a"/>
          <rect x="56" y="84" width="13" height="2" rx="1" fill="#333"/>
          <line x1="44" y1="148" x2="81" y2="118" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="50" y1="148" x2="81" y2="128" stroke="#DAA520" strokeWidth="1.2" strokeLinecap="round"/>
          <rect x="43" y="140" width="4" height="10" rx="0.8" fill="#FFD700" opacity="0.6"/>
          <rect x="50" y="134" width="4" height="16" rx="0.8" fill="#FFD700" opacity="0.7"/>
          <rect x="57" y="128" width="4" height="22" rx="0.8" fill="#FFD700" opacity="0.8"/>
          <rect x="64" y="122" width="4" height="28" rx="0.8" fill="#FFD700" opacity="0.9"/>
          <rect x="71" y="115" width="4" height="35" rx="0.8" fill="#FFD700"/>
          <circle cx="62" cy="170" r="3" fill="none" stroke="#DAA520" strokeWidth="1.2"/>
          <circle cx="45" cy="96" r="1.5" fill="#FFD700" opacity="0.5"/>
          <circle cx="50" cy="96" r="1.5" fill="#FFD700" opacity="0.5"/>
          <circle cx="55" cy="96" r="1.5" fill="#FFD700" opacity="0.5"/>
        </g>

        {/* === TREE TRUNK (straight) === */}
        <line x1="127" y1="175" x2="127" y2="120" stroke="url(#trunkG)" strokeWidth="7" strokeLinecap="round"/>
        <line x1="133" y1="175" x2="133" y2="120" stroke="url(#branchG2)" strokeWidth="7" strokeLinecap="round"/>
        <line x1="130" y1="175" x2="130" y2="105" stroke="url(#trunkG)" strokeWidth="8" strokeLinecap="round"/>

        {/* === MAIN BRANCHES (straight lines) === */}
        <line x1="130" y1="120" x2="70" y2="90" stroke="url(#branchG)" strokeWidth="5" strokeLinecap="round"/>
        <line x1="130" y1="120" x2="190" y2="90" stroke="url(#branchG)" strokeWidth="5" strokeLinecap="round"/>
        <line x1="130" y1="115" x2="55" y2="78" stroke="url(#branchG2)" strokeWidth="4" strokeLinecap="round"/>
        <line x1="130" y1="115" x2="205" y2="78" stroke="url(#branchG2)" strokeWidth="4" strokeLinecap="round"/>
        <line x1="130" y1="105" x2="130" y2="50" stroke="url(#branchG)" strokeWidth="4.5" strokeLinecap="round"/>
        <line x1="130" y1="110" x2="85" y2="88" stroke="url(#branchG2)" strokeWidth="3" strokeLinecap="round"/>
        <line x1="130" y1="110" x2="175" y2="88" stroke="url(#branchG2)" strokeWidth="3" strokeLinecap="round"/>

        {/* === SUB BRANCHES (straight lines) === */}
        <line x1="70" y1="90" x2="40" y2="55" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="190" y1="90" x2="220" y2="55" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="55" y1="78" x2="28" y2="45" stroke="url(#branchG2)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="205" y1="78" x2="232" y2="45" stroke="url(#branchG2)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="130" y1="65" x2="100" y2="25" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="130" y1="65" x2="160" y2="25" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="85" y1="88" x2="58" y2="58" stroke="url(#branchG)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="175" y1="88" x2="202" y2="58" stroke="url(#branchG)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="130" y1="50" x2="108" y2="18" stroke="url(#branchG2)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="130" y1="50" x2="152" y2="18" stroke="url(#branchG2)" strokeWidth="1.8" strokeLinecap="round"/>

        {/* === GOLDEN LEAVES === */}
        {/* Top crown leaves */}
        <g filter="url(#glow)"><ellipse cx="130" cy="15" rx="9" ry="5" fill="url(#leafG1)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="100" cy="20" rx="7.5" ry="4.5" fill="url(#leafG1)" transform="rotate(-25 100 20)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="160" cy="20" rx="7.5" ry="4.5" fill="url(#leafG1)" transform="rotate(25 160 20)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="115" cy="35" rx="7" ry="4" fill="url(#leafG2)" transform="rotate(-15 115 35)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="145" cy="35" rx="7" ry="4" fill="url(#leafG2)" transform="rotate(15 145 35)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="120" cy="48" rx="6" ry="3.5" fill="url(#leafG1)" transform="rotate(-10 120 48)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="140" cy="48" rx="6" ry="3.5" fill="url(#leafG1)" transform="rotate(10 140 48)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* Mid crown leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="125" cy="60" rx="6.5" ry="3.8" fill="url(#leafG2)" transform="rotate(-5 125 60)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="135" cy="60" rx="6.5" ry="3.8" fill="url(#leafG2)" transform="rotate(5 135 60)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>

        {/* Left branch leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="70" cy="85" rx="7" ry="4" fill="url(#leafG1)" transform="rotate(-30 70 85)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="85" cy="80" rx="6" ry="3.5" fill="url(#leafG2)" transform="rotate(-20 85 80)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="55" cy="70" rx="6" ry="3.5" fill="url(#leafG1)" transform="rotate(-40 55 70)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="40" cy="50" rx="7.5" ry="4.5" fill="url(#leafG2)" transform="rotate(-45 40 50)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="28" cy="40" rx="7" ry="4" fill="url(#leafG1)" transform="rotate(-50 28 40)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="58" cy="55" rx="5" ry="3" fill="url(#leafG1)" transform="rotate(-30 58 55)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* Right branch leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="190" cy="85" rx="7" ry="4" fill="url(#leafG1)" transform="rotate(30 190 85)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="175" cy="80" rx="6" ry="3.5" fill="url(#leafG2)" transform="rotate(20 175 80)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="205" cy="70" rx="6" ry="3.5" fill="url(#leafG1)" transform="rotate(40 205 70)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="220" cy="50" rx="7.5" ry="4.5" fill="url(#leafG2)" transform="rotate(45 220 50)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="232" cy="40" rx="7" ry="4" fill="url(#leafG1)" transform="rotate(50 232 40)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="202" cy="55" rx="5" ry="3" fill="url(#leafG1)" transform="rotate(30 202 55)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* === SPARKLES / GOLDEN GLOW DOTS === */}
        <g filter="url(#sparkle)">
          <circle cx="28" cy="36" r="1.5" fill="#FFD700" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0s"/>
          </circle>
          <circle cx="130" cy="12" r="2" fill="#FFF8DC" opacity="0.9">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" begin="0.3s"/>
          </circle>
          <circle cx="232" cy="36" r="1.5" fill="#FFD700" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" begin="0.6s"/>
          </circle>
          <circle cx="100" cy="16" r="1.2" fill="#FFD700" opacity="0.7">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" begin="0.5s"/>
          </circle>
          <circle cx="160" cy="16" r="1.2" fill="#FFD700" opacity="0.7">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.2s" repeatCount="indefinite" begin="1s"/>
          </circle>
          <circle cx="130" cy="40" r="1.5" fill="#FFD700" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" begin="0.2s"/>
          </circle>
          <circle cx="55" cy="65" r="1.3" fill="#FFFACD" opacity="0.8">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.8s" repeatCount="indefinite" begin="0.9s"/>
          </circle>
          <circle cx="205" cy="65" r="1.3" fill="#FFFACD" opacity="0.8">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.6s" repeatCount="indefinite" begin="1.2s"/>
          </circle>
          <circle cx="70" cy="78" r="1.2" fill="#FFF8DC" opacity="0.7">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.7s" repeatCount="indefinite" begin="1.5s"/>
          </circle>
          <circle cx="190" cy="78" r="1.2" fill="#FFF8DC" opacity="0.7">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.9s" repeatCount="indefinite" begin="1.8s"/>
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
