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
          <linearGradient id="trunkG2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFC125"/>
            <stop offset="50%" stopColor="#B8860B"/>
            <stop offset="100%" stopColor="#4A3508"/>
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
          <linearGradient id="leafG3" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFF8DC"/>
            <stop offset="30%" stopColor="#FFD700"/>
            <stop offset="70%" stopColor="#B8860B"/>
            <stop offset="100%" stopColor="#6B4C11"/>
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
        <circle cx="130.0" cy="84.6" r="84.4" fill="url(#bgGlow)"/>
        <circle cx="130.0" cy="73.1" r="46.0" fill="url(#leafGlow)" opacity="0.3"/>

        {/* === PHONE === */}
        <g filter="url(#leafShadow)">
          {/* Phone body */}
          <rect x="30.6" y="76.9" width="61.2" height="100.0" rx="7.6" ry="7.7" fill="#1a1a2e" stroke="#DAA520" strokeWidth="1.5"/>
          {/* Screen */}
          <rect x="35.2" y="88.5" width="52.0" height="76.9" rx="2.3" ry="2.3" fill="#0d0d1a"/>
          {/* Top speaker */}
          <rect x="53.5" y="82.3" width="15.3" height="2.3" rx="1.1" fill="#333"/>
          {/* Screen content - money growth chart */}
          <line x1="50" y1="200" x2="110" y2="160" stroke="#FFD700" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="60" y1="200" x2="110" y2="175" stroke="#DAA520" strokeWidth="1.2" strokeLinecap="round"/>
          {/* Small bars */}
          <rect x="39.8" y="142.3" width="4.6" height="11.5" rx="0.8" fill="#FFD700" opacity="0.6"/>
          <rect x="47.4" y="136.9" width="4.6" height="16.9" rx="0.8" fill="#FFD700" opacity="0.7"/>
          <rect x="55.1" y="130.8" width="4.6" height="23.1" rx="0.8" fill="#FFD700" opacity="0.8"/>
          <rect x="62.7" y="124.6" width="4.6" height="29.2" rx="0.8" fill="#FFD700" opacity="0.9"/>
          <rect x="70.4" y="116.9" width="4.6" height="36.9" rx="0.8" fill="#FFD700"/>
          {/* Home button */}
          <circle cx="61.2" cy="172.3" r="3.1" fill="none" stroke="#DAA520" strokeWidth="1.2"/>
          {/* Status bar dots */}
          <circle cx="42.1" cy="93.8" r="1.5" fill="#FFD700" opacity="0.5"/>
          <circle cx="47.4" cy="93.8" r="1.5" fill="#FFD700" opacity="0.5"/>
          <circle cx="52.8" cy="93.8" r="1.5" fill="#FFD700" opacity="0.5"/>
        </g>

        {/* === TREE TRUNK === */}
        <path d="M127.7 169.2C126.2 150.0 118.5 134.6 110.9 119.2" stroke="url(#trunkG)" strokeWidth="7.7" strokeLinecap="round" fill="none"/>
        <path d="M132.3 169.2C133.8 150.0 141.5 134.6 149.1 119.2" stroke="url(#trunkG2)" strokeWidth="7.7" strokeLinecap="round" fill="none"/>
        <path d="M130.0 169.2C130.0 146.2 130.0 123.1 130.0 107.7" stroke="url(#trunkG)" strokeWidth="8.4" strokeLinecap="round" fill="none"/>
        {/* Trunk bark texture */}
        <path d="M128.5 161.5C126.2 150.0 122.4 138.5 118.5 126.9" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4"/>
        <path d="M131.5 161.5C133.8 150.0 137.6 138.5 141.5 126.9" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.4"/>

        {/* === MAIN BRANCHES === */}
        <path d="M110.9 119.2C91.8 107.7 68.8 96.2 45.9 84.6" stroke="url(#branchG)" strokeWidth="4.2" strokeLinecap="round" fill="none"/>
        <path d="M149.1 119.2C168.2 107.7 191.2 96.2 214.1 84.6" stroke="url(#branchG)" strokeWidth="4.2" strokeLinecap="round" fill="none"/>
        <path d="M113.2 115.4C90.2 100.0 57.4 90.8 38.2 76.9" stroke="url(#branchG2)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
        <path d="M146.8 115.4C169.8 100.0 202.6 90.8 221.8 76.9" stroke="url(#branchG2)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
        <path d="M130.0 107.7C130.0 84.6 130.0 65.4 130.0 46.2" stroke="url(#branchG)" strokeWidth="3.8" strokeLinecap="round" fill="none"/>
        <path d="M126.2 113.8C107.1 103.8 80.3 100.0 57.4 92.3" stroke="url(#branchG2)" strokeWidth="2.7" strokeLinecap="round" fill="none"/>
        <path d="M133.8 113.8C152.9 103.8 179.7 100.0 202.6 92.3" stroke="url(#branchG2)" strokeWidth="2.7" strokeLinecap="round" fill="none"/>

        {/* === SUB BRANCHES === */}
        <path d="M76.5 100.0C59.6 88.5 47.4 75.4 38.2 60.0" stroke="url(#branchG)" strokeWidth="2.3" strokeLinecap="round" fill="none"/>
        <path d="M183.5 100.0C200.4 88.5 212.6 75.4 221.8 60.0" stroke="url(#branchG)" strokeWidth="2.3" strokeLinecap="round" fill="none"/>
        <path d="M45.9 84.6C34.4 73.1 29.1 60.0 24.5 44.6" stroke="url(#branchG2)" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
        <path d="M214.1 84.6C225.6 73.1 230.9 60.0 235.5 44.6" stroke="url(#branchG2)" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
        <path d="M130.0 61.5C116.2 47.7 107.1 34.6 97.9 21.5" stroke="url(#branchG)" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
        <path d="M130.0 61.5C143.8 47.7 152.9 34.6 162.1 21.5" stroke="url(#branchG)" strokeWidth="1.9" strokeLinecap="round" fill="none"/>
        <path d="M57.4 92.3C44.4 80.8 36.7 67.7 30.6 52.3" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M202.6 92.3C215.6 80.8 223.3 67.7 229.4 52.3" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M130.0 46.2C118.5 32.3 99.4 23.1 84.1 13.8" stroke="url(#branchG2)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M130.0 46.2C141.5 32.3 160.6 23.1 175.9 13.8" stroke="url(#branchG2)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

        {/* === GOLDEN LEAF SVG PATHS === */}
        {/* Far outer left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="21.4" cy="40.0" rx="8.4" ry="5.0" fill="url(#leafG1)" transform="rotate(-55 21.4 40.0)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="29.1" cy="55.4" rx="7.6" ry="4.6" fill="url(#leafG3)" transform="rotate(-40 29.1 55.4)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="26.8" cy="73.1" rx="6.9" ry="4.2" fill="url(#leafG2)" transform="rotate(-30 26.8 73.1)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="34.4" cy="50.0" rx="7.3" ry="4.2" fill="url(#leafG1)" transform="rotate(-50 34.4 50.0)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="42.1" cy="63.1" rx="6.1" ry="3.8" fill="url(#leafG3)" transform="rotate(-35 42.1 63.1)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* Far outer right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="238.6" cy="40.0" rx="8.4" ry="5.0" fill="url(#leafG1)" transform="rotate(55 238.6 40.0)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="230.9" cy="55.4" rx="7.6" ry="4.6" fill="url(#leafG3)" transform="rotate(40 230.9 55.4)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="233.2" cy="73.1" rx="6.9" ry="4.2" fill="url(#leafG2)" transform="rotate(30 233.2 73.1)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="225.6" cy="50.0" rx="7.3" ry="4.2" fill="url(#leafG1)" transform="rotate(50 225.6 50.0)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="217.9" cy="63.1" rx="6.1" ry="3.8" fill="url(#leafG3)" transform="rotate(35 217.9 63.1)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* Outer left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="42.1" cy="80.8" rx="7.6" ry="4.6" fill="url(#leafG1)" transform="rotate(-30 42.1 80.8)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="52.0" cy="67.7" rx="6.9" ry="4.2" fill="url(#leafG2)" transform="rotate(-45 52.0 67.7)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="59.6" cy="83.1" rx="6.5" ry="3.8" fill="url(#leafG3)" transform="rotate(-20 59.6 83.1)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* Outer right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="217.9" cy="80.8" rx="7.6" ry="4.6" fill="url(#leafG1)" transform="rotate(30 217.9 80.8)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="208.0" cy="67.7" rx="6.9" ry="4.2" fill="url(#leafG2)" transform="rotate(45 208.0 67.7)" stroke="#996515" strokeWidth="0.6" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="200.4" cy="83.1" rx="6.5" ry="3.8" fill="url(#leafG3)" transform="rotate(20 200.4 83.1)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* Inner left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="72.6" cy="73.1" rx="6.5" ry="3.8" fill="url(#leafG1)" transform="rotate(-35 72.6 73.1)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="65.0" cy="57.7" rx="6.1" ry="3.5" fill="url(#leafG2)" transform="rotate(-25 65.0 57.7)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="82.6" cy="63.1" rx="5.4" ry="3.5" fill="url(#leafG3)" transform="rotate(-15 82.6 63.1)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="90.2" cy="76.9" rx="5.7" ry="3.1" fill="url(#leafG1)" transform="rotate(-10 90.2 76.9)" stroke="#996515" strokeWidth="0.5" opacity="0.8"/></g>

        {/* Inner right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="187.4" cy="73.1" rx="6.5" ry="3.8" fill="url(#leafG1)" transform="rotate(35 187.4 73.1)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="195.0" cy="57.7" rx="6.1" ry="3.5" fill="url(#leafG2)" transform="rotate(25 195.0 57.7)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="177.4" cy="63.1" rx="5.4" ry="3.5" fill="url(#leafG3)" transform="rotate(15 177.4 63.1)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="169.8" cy="76.9" rx="5.7" ry="3.1" fill="url(#leafG1)" transform="rotate(10 169.8 76.9)" stroke="#996515" strokeWidth="0.5" opacity="0.8"/></g>

        {/* Top crown leaves */}
        <g filter="url(#glow)"><ellipse cx="130.0" cy="21.5" rx="9.2" ry="5.4" fill="url(#leafG1)" transform="rotate(5 130.0 21.5)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="97.9" cy="16.9" rx="7.6" ry="4.6" fill="url(#leafG1)" transform="rotate(-25 97.9 16.9)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="162.1" cy="16.9" rx="7.6" ry="4.6" fill="url(#leafG1)" transform="rotate(25 162.1 16.9)" stroke="#996515" strokeWidth="0.6" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="110.9" cy="30.8" rx="6.9" ry="4.2" fill="url(#leafG2)" transform="rotate(-15 110.9 30.8)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="149.1" cy="30.8" rx="6.9" ry="4.2" fill="url(#leafG2)" transform="rotate(15 149.1 30.8)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="118.5" cy="42.3" rx="6.1" ry="3.8" fill="url(#leafG3)" transform="rotate(-10 118.5 42.3)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="141.5" cy="42.3" rx="6.1" ry="3.8" fill="url(#leafG3)" transform="rotate(10 141.5 42.3)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="103.2" cy="52.3" rx="5.7" ry="3.5" fill="url(#leafG1)" transform="rotate(-12 103.2 52.3)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="156.8" cy="52.3" rx="5.7" ry="3.5" fill="url(#leafG1)" transform="rotate(12 156.8 52.3)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>

        {/* Mid crown leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="122.4" cy="57.7" rx="6.1" ry="3.8" fill="url(#leafG2)" transform="rotate(-5 122.4 57.7)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="137.6" cy="57.7" rx="6.1" ry="3.8" fill="url(#leafG2)" transform="rotate(5 137.6 57.7)" stroke="#996515" strokeWidth="0.5" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="107.1" cy="69.2" rx="5.4" ry="3.1" fill="url(#leafG1)" transform="rotate(-8 107.1 69.2)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="152.9" cy="69.2" rx="5.4" ry="3.1" fill="url(#leafG1)" transform="rotate(8 152.9 69.2)" stroke="#996515" strokeWidth="0.5" opacity="0.85"/></g>

        {/* === SPARKLES / GOLDEN GLOW DOTS === */}
        <g filter="url(#sparkle)">
          <circle cx="21.4" cy="36.9" r="1.5" fill="#FFD700" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0s"/>
          </circle>
          <circle cx="130.0" cy="18.5" r="1.9" fill="#FFF8DC" opacity="0.9">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" begin="0.3s"/>
          </circle>
          <circle cx="238.6" cy="36.9" r="1.5" fill="#FFD700" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" begin="0.6s"/>
          </circle>
          <circle cx="42.1" cy="60.0" r="1.4" fill="#FFFACD" opacity="0.8">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.8s" repeatCount="indefinite" begin="0.9s"/>
          </circle>
          <circle cx="217.9" cy="60.0" r="1.4" fill="#FFFACD" opacity="0.8">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.6s" repeatCount="indefinite" begin="1.2s"/>
          </circle>
          <circle cx="97.9" cy="21.5" r="1.2" fill="#FFD700" opacity="0.7">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" begin="0.5s"/>
          </circle>
          <circle cx="162.1" cy="21.5" r="1.2" fill="#FFD700" opacity="0.7">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.2s" repeatCount="indefinite" begin="1s"/>
          </circle>
          <circle cx="130.0" cy="42.3" r="1.5" fill="#FFD700" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" begin="0.2s"/>
          </circle>
          <circle cx="72.6" cy="67.7" r="1.2" fill="#FFF8DC" opacity="0.7">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.7s" repeatCount="indefinite" begin="1.5s"/>
          </circle>
          <circle cx="187.4" cy="67.7" r="1.2" fill="#FFF8DC" opacity="0.7">
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
