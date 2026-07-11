import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUser, saveUser, generateReferralCode, findUserByReferralCode, addReferral } from '../lib/storage'
import { REF_L1, REF_L2 } from '../lib/plans'

export default function AuthPage() {
  const [tab, setTab] = useState('login')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [refCode, setRefCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      setLoading(false)
      return
    }

    try {
      if (tab === 'login') {
        const userData = getUser(normalPhone)
        if (!userData) { setError('Account not found. Please register.'); setLoading(false); return }
        if (userData.pin !== pin) { setError('Incorrect PIN'); setLoading(false); return }
        login(userData)
        navigate('/dashboard')
      } else {
        if (!name.trim()) { setError('Please enter your full name'); setLoading(false); return }
        const existing = getUser(normalPhone)
        if (existing) { setError('Account already exists. Please login.'); setLoading(false); return }

        const referralCode = generateReferralCode(normalPhone)
        const userData = {
          id: normalPhone,
          phone: normalPhone,
          name: name.trim(),
          pin,
          balance: 0,
          referralCode,
          referredBy: null,
          createdAt: new Date().toISOString(),
        }

        // Handle referral
        if (refCode.trim()) {
          const referrer = findUserByReferralCode(refCode.trim().toUpperCase())
          if (referrer) {
            userData.referredBy = referrer.phone
          }
        }

        saveUser(normalPhone, userData)
        login(userData)
        navigate('/dashboard')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
          Dumiropay
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Kenya's Premier Investment Platform</p>
      </div>

      <div className="w-full max-w-md">
        <div className="card">
          {/* Tabs */}
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
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By using Dumiropay you agree to our Terms & Conditions.
        </p>
      </div>
    </div>
  )
}
