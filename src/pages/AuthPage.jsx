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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden" style={{ backgroundImage: 'url(/ai-splash-bg.webp)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
      {/* Dark overlay over AI background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(3, 7, 18, 0.65)', zIndex: 0 }} />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)', animation: 'floatSymbol 12s ease-in-out infinite' }}/>
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)', animation: 'floatSymbol 15s ease-in-out infinite', animationDelay: '3s' }}/>
        <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', animation: 'floatSymbol 10s ease-in-out infinite', animationDelay: '6s' }}/>
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
        <p className="text-gray-300 mt-1 text-sm tracking-wide">Kenya's Premier AI Compute Network</p>
        <p className="mt-0.5 text-xs font-bold tracking-widest uppercase" style={{ background: 'linear-gradient(90deg, #FFD700, #DAA520)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DECENTRALIZED GPU NODE INFRASTRUCTURE</p>
        <div className="mt-3 h-px w-32 mx-auto" style={{ background: 'linear-gradient(90deg, transparent, #FFD700, #DAA520, transparent)' }}/>
      </div>

      <div className="relative mx-auto mb-4 z-10 w-full max-w-xs">
        <img
          src="/datacenter-ai.webp"
          alt="AI Datacenter"
          className="w-full h-auto object-contain rounded-2xl drop-shadow-lg"
          style={{
            filter: 'brightness(1.05)',
            maxHeight: '200px',
            animation: 'coinHeartbeat 4s ease-in-out infinite',
          }}
        />
      </div>
      {/* AI Datacenter image above, tree SVG replaced */}
      <svg width="0" height="0" viewBox="0 0 0 0" className="hidden" aria-hidden="true">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="45%" r="45%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="0.2"/>
            <stop offset="60%" stopColor="#FFA500" stopOpacity="0.1"/>
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
          
          <linearGradient id="leafGold1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE44D"/>
            <stop offset="30%" stopColor="#FFD700"/>
            <stop offset="70%" stopColor="#FFA500"/>
            <stop offset="100%" stopColor="#CC8400"/>
          </linearGradient>
          
          <linearGradient id="leafGold2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFED4E"/>
            <stop offset="40%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#FFA500"/>
          </linearGradient>
          
          <linearGradient id="leafGold3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFACD"/>
            <stop offset="50%" stopColor="#FFED4E"/>
            <stop offset="100%" stopColor="#FFD700"/>
          </linearGradient>
          
          <linearGradient id="coinG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF8DC"/>
            <stop offset="30%" stopColor="#FFD700"/>
            <stop offset="100%" stopColor="#B8860B"/>
          </linearGradient>
          <filter id="leafShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#8B6914" floodOpacity="0.3"/>
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
      
        
        <ellipse cx="130" cy="100" rx="90" ry="70" fill="url(#bgGlow)"/>
      
        
        <g>
          <rect x="30" y="88" width="48" height="82" rx="6" fill="#1a1a2e" stroke="#DAA520" strokeWidth="1.2"/>
          <rect x="34" y="97" width="40" height="62" rx="1.5" fill="#0d0d1a"/>
          <rect x="48" y="91" width="12" height="1.5" rx="0.7" fill="#333"/>
          
          <rect x="37" y="143" width="3.5" height="10" rx="0.5" fill="#FFD700" opacity="0.8"/>
          <rect x="43" y="136" width="3.5" height="17" rx="0.5" fill="#FFD700" opacity="0.9"/>
          <rect x="49" y="128" width="3.5" height="25" rx="0.5" fill="#FFD700"/>
          <rect x="55" y="133" width="3.5" height="20" rx="0.5" fill="#FFA500"/>
          <rect x="61" y="125" width="3.5" height="28" rx="0.5" fill="#FFA500"/>
          <circle cx="54" cy="170" r="2.5" fill="none" stroke="#DAA520" strokeWidth="1"/>
        </g>
      
        
        <path d="M130 190 C126 168, 134 148, 130 118" stroke="url(#trunkG)" strokeWidth="10" strokeLinecap="round" fill="none"/>
        
        <path d="M128 175 C127 170, 129 165, 128 160" stroke="#3D2010" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
        <path d="M132 180 C131 174, 133 168, 132 162" stroke="#3D2010" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5"/>
      
        
        <path d="M130 118 C110 105, 85 95, 65 82" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <path d="M130 118 C150 105, 175 95, 195 82" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
        <path d="M130 118 C130 95, 128 72, 130 40" stroke="url(#branchG)" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
      
        
        <path d="M95 105 C75 92, 55 75, 40 55" stroke="url(#branchG)" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <path d="M165 105 C185 92, 205 75, 220 55" stroke="url(#branchG)" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
        <path d="M130 80 C115 68, 102 52, 90 32" stroke="url(#branchG)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
        <path d="M130 80 C145 68, 158 52, 170 32" stroke="url(#branchG)" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
        <path d="M65 82 C48 75, 32 62, 22 48" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M195 82 C212 75, 228 62, 238 48" stroke="url(#branchG)" strokeWidth="2" strokeLinecap="round" fill="none"/>
        
        <path d="M90 32 C80 22, 70 14, 60 8" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M170 32 C180 22, 190 14, 200 8" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M40 55 C28 48, 16 40, 8 32" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M220 55 C232 48, 244 40, 252 32" stroke="url(#branchG)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      
        
        <g filter="url(#leafShadow)">
          
          <circle cx="130" cy="32" r="8" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="118" cy="24" r="7" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="142" cy="24" r="7" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="130" cy="16" r="6.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="125" cy="28" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="135" cy="28" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
      
          
          <circle cx="65" cy="76" r="8" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="48" cy="68" r="7" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="78" cy="72" r="6.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="40" cy="56" r="6.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="30" cy="46" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="55" cy="82" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
      
          
          <circle cx="195" cy="76" r="8" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="212" cy="68" r="7" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="182" cy="72" r="6.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="220" cy="56" r="6.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="230" cy="46" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="205" cy="82" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
      
          
          <circle cx="90" cy="26" r="7" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="75" cy="16" r="6.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="60" cy="10" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="82" cy="32" r="5.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
      
          
          <circle cx="170" cy="26" r="7" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="185" cy="16" r="6.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="200" cy="10" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="178" cy="32" r="5.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
      
          
          <circle cx="115" cy="68" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="145" cy="68" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="108" cy="56" r="5.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="152" cy="56" r="5.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="122" cy="52" r="5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <circle cx="138" cy="52" r="5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
        </g>
      
        
        <g filter="url(#coinGlow)">
          
          <circle cx="65" cy="90" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="65" y="93.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#5C3D0E">$</text>
          
          <circle cx="195" cy="90" r="6" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="195" y="93.5" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#5C3D0E">$</text>
          
          <circle cx="130" cy="48" r="5.5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="130" y="51.5" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#5C3D0E">$</text>
          
          <circle cx="40" cy="62" r="5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="40" y="65" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#5C3D0E">$</text>
          
          <circle cx="220" cy="62" r="5" fill="url(#coinG)" stroke="#B8860B" strokeWidth="0.8"/>
          <text x="220" y="65" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#5C3D0E">$</text>
        </g>
      
        
        <g filter="url(#glow)">
          <circle cx="130" cy="14" r="1.8" fill="#FFFACD">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="r" values="1.2;2;1.2" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="40" cy="48" r="1.4" fill="#FFD700">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.5s" repeatCount="indefinite" begin="0.5s"/>
          </circle>
          <circle cx="220" cy="48" r="1.4" fill="#FFD700">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.2s" repeatCount="indefinite" begin="1s"/>
          </circle>
          <circle cx="90" cy="16" r="1.2" fill="#FFED4E">
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="3s" repeatCount="indefinite" begin="0.8s"/>
          </circle>
          <circle cx="170" cy="16" r="1.2" fill="#FFED4E">
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2.8s" repeatCount="indefinite" begin="1.4s"/>
          </circle>
          
          <circle cx="65" cy="83" r="1" fill="#FFF8DC">
            <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.3s"/>
          </circle>
          <circle cx="195" cy="83" r="1" fill="#FFF8DC">
            <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.9s"/>
          </circle>
          
          <circle cx="118" cy="22" r="0.8" fill="#FFED4E">
            <animate attributeName="opacity" values="0;0.8;0" dur="2.3s" repeatCount="indefinite" begin="0.2s"/>
          </circle>
          <circle cx="142" cy="22" r="0.8" fill="#FFED4E">
            <animate attributeName="opacity" values="0;0.8;0" dur="2.3s" repeatCount="indefinite" begin="1.1s"/>
          </circle>
        </g>
      </svg>

      <div className="w-full max-w-sm relative z-10">
        {/* Investor Stats Banner */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="text-center p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(218,165,32,0.04) 100%)', border: '1px solid rgba(255,215,0,0.12)' }}>
            <div className="flex items-center justify-center gap-1.5 mb-1 relative">
              <div className="icon-glow-ring" style={{ position: 'absolute', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)', top: '2px' }}></div>
              <img src="/icons/stat-yield.webp" alt="AI Yield" className="w-8 h-8 rounded-full object-contain icon-heartbeat" style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <p className="text-lg font-bold" style={{ color: '#FFD700' }}>AI Yield</p>
            <p className="text-[10px] text-gray-400 tracking-wide">Earn Daily Compute Returns</p>
          </div>
          <div className="text-center p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(218,165,32,0.04) 100%)', border: '1px solid rgba(255,215,0,0.12)' }}>
            <div className="flex items-center justify-center gap-1.5 mb-1 relative">
              <div className="icon-glow-ring" style={{ position: 'absolute', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)', top: '2px' }}></div>
              <img src="/icons/stat-withdrawal.webp" alt="24/7" className="w-8 h-8 rounded-full object-contain icon-heartbeat" style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <p className="text-lg font-bold" style={{ color: '#FFD700' }}>24/7</p>
            <p className="text-[10px] text-gray-400 tracking-wide">Instant M-Pesa Withdrawals</p>
          </div>
          <div className="text-center p-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.08) 0%, rgba(218,165,32,0.04) 100%)', border: '1px solid rgba(255,215,0,0.12)' }}>
            <div className="flex items-center justify-center gap-1.5 mb-1 relative">
              <div className="icon-glow-ring" style={{ position: 'absolute', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)', top: '2px' }}></div>
              <img src="/icons/stat-node.webp" alt="Node" className="w-8 h-8 rounded-full object-contain icon-heartbeat" style={{ position: 'relative', zIndex: 1 }} />
            </div>
            <p className="text-lg font-bold" style={{ color: '#FFD700' }}>Instant Node</p>
            <p className="text-[10px] text-gray-400 tracking-wide">Deploy Rigs & Cash Out Directly</p>
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
                  ) : tab === 'login' ? 'Access Compute Console →' : 'Deploy Your First Node'}
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
