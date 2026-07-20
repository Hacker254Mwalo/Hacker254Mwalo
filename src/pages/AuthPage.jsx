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
        <p className="text-gray-400 mt-1 text-sm">Kenya's Premier Investment Platform</p>
        <p className="text-yellow-400 mt-0.5 text-xs font-bold tracking-wide">Kenya's Top 1 Money Making</p>
        <div className="mt-2 h-px w-24 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, transparent)' }}/>
      </div>

      {/* Phone + Gold Tree */}
      <svg width="280" height="220" viewBox="0 0 340 260" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-3 mx-auto">
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
        <circle cx="170" cy="110" r="110" fill="url(#bgGlow)"/>
        <circle cx="170" cy="95" r="60" fill="url(#leafGlow)" opacity="0.3"/>

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
        <path d="M167 220 C165 195, 155 175, 145 155" stroke="url(#trunkG)" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <path d="M173 220 C175 195, 185 175, 195 155" stroke="url(#trunkG2)" strokeWidth="10" strokeLinecap="round" fill="none"/>
        <path d="M170 220 C170 190, 170 160, 170 140" stroke="url(#trunkG)" strokeWidth="11" strokeLinecap="round" fill="none"/>
        {/* Trunk bark texture */}
        <path d="M168 210 C165 195, 160 180, 155 165" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4"/>
        <path d="M172 210 C175 195, 180 180, 185 165" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" fill="none" opacity="0.4"/>

        {/* === MAIN BRANCHES === */}
        <path d="M145 155 C120 140, 90 125, 60 110" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <path d="M195 155 C220 140, 250 125, 280 110" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <path d="M148 150 C118 130, 75 118, 50 100" stroke="url(#branchG2)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        <path d="M192 150 C222 130, 265 118, 290 100" stroke="url(#branchG2)" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        <path d="M170 140 C170 110, 170 85, 170 60" stroke="url(#branchG)" strokeWidth="5" strokeLinecap="round" fill="none"/>
        <path d="M165 148 C140 135, 105 130, 75 120" stroke="url(#branchG2)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
        <path d="M175 148 C200 135, 235 130, 265 120" stroke="url(#branchG2)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>

        {/* === SUB BRANCHES === */}
        <path d="M100 130 C78 115, 62 98, 50 78" stroke="url(#branchG)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M240 130 C262 115, 278 98, 290 78" stroke="url(#branchG)" strokeWidth="3" strokeLinecap="round" fill="none"/>
        <path d="M60 110 C45 95, 38 78, 32 58" stroke="url(#branchG2)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M280 110 C295 95, 302 78, 308 58" stroke="url(#branchG2)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M170 80 C152 62, 140 45, 128 28" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M170 80 C188 62, 200 45, 212 28" stroke="url(#branchG)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
        <path d="M75 120 C58 105, 48 88, 40 68" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M265 120 C282 105, 292 88, 300 68" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M170 60 C155 42, 130 30, 110 18" stroke="url(#branchG2)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M170 60 C185 42, 210 30, 230 18" stroke="url(#branchG2)" strokeWidth="2" strokeLinecap="round" fill="none"/>

        {/* === GOLDEN LEAF SVG PATHS === */}
        {/* Far outer left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="28" cy="52" rx="11" ry="6.5" fill="url(#leafG1)" transform="rotate(-55 28 52)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="38" cy="72" rx="10" ry="6" fill="url(#leafG3)" transform="rotate(-40 38 72)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="35" cy="95" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(-30 35 95)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="45" cy="65" rx="9.5" ry="5.5" fill="url(#leafG1)" transform="rotate(-50 45 65)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="55" cy="82" rx="8" ry="5" fill="url(#leafG3)" transform="rotate(-35 55 82)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>

        {/* Far outer right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="312" cy="52" rx="11" ry="6.5" fill="url(#leafG1)" transform="rotate(55 312 52)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="302" cy="72" rx="10" ry="6" fill="url(#leafG3)" transform="rotate(40 302 72)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="305" cy="95" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(30 305 95)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="295" cy="65" rx="9.5" ry="5.5" fill="url(#leafG1)" transform="rotate(50 295 65)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="285" cy="82" rx="8" ry="5" fill="url(#leafG3)" transform="rotate(35 285 82)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>

        {/* Outer left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="55" cy="105" rx="10" ry="6" fill="url(#leafG1)" transform="rotate(-30 55 105)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="68" cy="88" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(-45 68 88)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="78" cy="108" rx="8.5" ry="5" fill="url(#leafG3)" transform="rotate(-20 78 108)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>

        {/* Outer right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="285" cy="105" rx="10" ry="6" fill="url(#leafG1)" transform="rotate(30 285 105)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="272" cy="88" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(45 272 88)" stroke="#996515" strokeWidth="0.8" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="262" cy="108" rx="8.5" ry="5" fill="url(#leafG3)" transform="rotate(20 262 108)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>

        {/* Inner left leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="95" cy="95" rx="8.5" ry="5" fill="url(#leafG1)" transform="rotate(-35 95 95)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="85" cy="75" rx="8" ry="4.5" fill="url(#leafG2)" transform="rotate(-25 85 75)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="108" cy="82" rx="7" ry="4.5" fill="url(#leafG3)" transform="rotate(-15 108 82)" stroke="#996515" strokeWidth="0.6" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="118" cy="100" rx="7.5" ry="4" fill="url(#leafG1)" transform="rotate(-10 118 100)" stroke="#996515" strokeWidth="0.6" opacity="0.8"/></g>

        {/* Inner right leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="245" cy="95" rx="8.5" ry="5" fill="url(#leafG1)" transform="rotate(35 245 95)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="255" cy="75" rx="8" ry="4.5" fill="url(#leafG2)" transform="rotate(25 255 75)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="232" cy="82" rx="7" ry="4.5" fill="url(#leafG3)" transform="rotate(15 232 82)" stroke="#996515" strokeWidth="0.6" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="222" cy="100" rx="7.5" ry="4" fill="url(#leafG1)" transform="rotate(10 222 100)" stroke="#996515" strokeWidth="0.6" opacity="0.8"/></g>

        {/* Top crown leaves */}
        <g filter="url(#glow)"><ellipse cx="170" cy="28" rx="12" ry="7" fill="url(#leafG1)" transform="rotate(5 170 28)" stroke="#996515" strokeWidth="1" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="128" cy="22" rx="10" ry="6" fill="url(#leafG1)" transform="rotate(-25 128 22)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="212" cy="22" rx="10" ry="6" fill="url(#leafG1)" transform="rotate(25 212 22)" stroke="#996515" strokeWidth="0.8" opacity="0.95"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="145" cy="40" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(-15 145 40)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="195" cy="40" rx="9" ry="5.5" fill="url(#leafG2)" transform="rotate(15 195 40)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="155" cy="55" rx="8" ry="5" fill="url(#leafG3)" transform="rotate(-10 155 55)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="185" cy="55" rx="8" ry="5" fill="url(#leafG3)" transform="rotate(10 185 55)" stroke="#996515" strokeWidth="0.7" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="135" cy="68" rx="7.5" ry="4.5" fill="url(#leafG1)" transform="rotate(-12 135 68)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="205" cy="68" rx="7.5" ry="4.5" fill="url(#leafG1)" transform="rotate(12 205 68)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>

        {/* Mid crown leaves */}
        <g filter="url(#leafShadow)"><ellipse cx="160" cy="75" rx="8" ry="5" fill="url(#leafG2)" transform="rotate(-5 160 75)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="180" cy="75" rx="8" ry="5" fill="url(#leafG2)" transform="rotate(5 180 75)" stroke="#996515" strokeWidth="0.7" opacity="0.9"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="140" cy="90" rx="7" ry="4" fill="url(#leafG1)" transform="rotate(-8 140 90)" stroke="#996515" strokeWidth="0.6" opacity="0.85"/></g>
        <g filter="url(#leafShadow)"><ellipse cx="200" cy="90" rx="7" ry="4" fill="url(#leafG1)" transform="rotate(8 200 90)" stroke="#996515" strokeWidth="0.6" opacity="0.85"/></g>

        {/* === SPARKLES / GOLDEN GLOW DOTS === */}
        <g filter="url(#sparkle)">
          <circle cx="28" cy="48" r="2" fill="#FFD700" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin="0s"/>
          </circle>
          <circle cx="170" cy="24" r="2.5" fill="#FFF8DC" opacity="0.9">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2.5s" repeatCount="indefinite" begin="0.3s"/>
          </circle>
          <circle cx="312" cy="48" r="2" fill="#FFD700" opacity="0.9">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" begin="0.6s"/>
          </circle>
          <circle cx="55" cy="78" r="1.8" fill="#FFFACD" opacity="0.8">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.8s" repeatCount="indefinite" begin="0.9s"/>
          </circle>
          <circle cx="285" cy="78" r="1.8" fill="#FFFACD" opacity="0.8">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.6s" repeatCount="indefinite" begin="1.2s"/>
          </circle>
          <circle cx="128" cy="28" r="1.5" fill="#FFD700" opacity="0.7">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" begin="0.5s"/>
          </circle>
          <circle cx="212" cy="28" r="1.5" fill="#FFD700" opacity="0.7">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.2s" repeatCount="indefinite" begin="1s"/>
          </circle>
          <circle cx="170" cy="55" r="2" fill="#FFD700" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" begin="0.2s"/>
          </circle>
          <circle cx="95" cy="88" r="1.5" fill="#FFF8DC" opacity="0.7">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.7s" repeatCount="indefinite" begin="1.5s"/>
          </circle>
          <circle cx="245" cy="88" r="1.5" fill="#FFF8DC" opacity="0.7">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.9s" repeatCount="indefinite" begin="1.8s"/>
          </circle>
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
