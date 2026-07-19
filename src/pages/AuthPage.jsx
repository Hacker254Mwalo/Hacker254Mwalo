/**
 * AuthPage.jsx — Dumiropay Login / Register
 *
 * Uses Clerk for identity management (phone+password or email+password).
 * After Clerk auth, the AuthContext syncs the user profile with Supabase.
 * The existing phone+PIN UI is preserved for familiarity.
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { createPasswordResetRequest } from '../lib/db'
import { canRequestPasswordReset, recordPasswordResetRequest } from '../lib/storage'

export default function AuthPage({ mode }) {
  const [tab, setTab] = useState(mode === 'register' ? 'register' : 'login')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [name, setName] = useState('')
  const [refCode, setRefCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [verifyMode, setVerifyMode] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')

  const failRef = useRef({ count: 0, lockedUntil: 0 })
  const navigate = useNavigate()

  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn()
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp()

  function normalizePhone(p) {
    p = p.replace(/\s/g, '')
    if (p.startsWith('07') || p.startsWith('01')) return '+254' + p.slice(1)
    if (p.startsWith('254')) return '+' + p
    return p
  }

  // Convert phone+PIN to Clerk-compatible email+password
  function phoneToEmail(normalPhone) {
    return normalPhone.replace('+', '') + '@dumiropay.app'
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

    // Forgot password flow
    if (forgotMode) {
      const rate = canRequestPasswordReset(normalPhone)
      if (!rate.allowed) {
        setError('Too many reset requests. Please try again in 1 hour.')
        setLoading(false)
        return
      }
      try {
        await createPasswordResetRequest(normalPhone)
        recordPasswordResetRequest(normalPhone)
        setForgotSent(true)
      } catch {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      setLoading(false)
      return
    }

    const clerkEmail = phoneToEmail(normalPhone)

    try {
      if (tab === 'login') {
        // Rate-limit check
        if (Date.now() < failRef.current.lockedUntil) {
          const secs = Math.ceil((failRef.current.lockedUntil - Date.now()) / 1000)
          setError(`Too many failed attempts. Try again in ${secs}s.`)
          setLoading(false)
          return
        }

        if (!signInLoaded) { setError('Auth not ready. Please wait.'); setLoading(false); return }

        const result = await signIn.create({
          identifier: clerkEmail,
          password: pin,
        })

        if (result.status === 'complete') {
          failRef.current = { count: 0, lockedUntil: 0 }
          await setSignInActive({ session: result.createdSessionId })
          navigate('/dashboard')
        } else {
          setError('Login incomplete. Please try again.')
        }
      } else {
        // Register
        if (!name.trim()) { setError('Please enter your full name'); setLoading(false); return }
        if (!signUpLoaded) { setError('Auth not ready. Please wait.'); setLoading(false); return }

        // Store phone and referral code in Clerk unsafeMetadata
        const result = await signUp.create({
          emailAddress: clerkEmail,
          password: pin,
          firstName: name.trim().split(' ')[0],
          lastName: name.trim().split(' ').slice(1).join(' ') || '',
          unsafeMetadata: {
            phone: normalPhone,
            name: name.trim(),
            referralCode: refCode.trim().toUpperCase() || null,
          },
        })

        if (result.status === 'complete') {
          await setSignUpActive({ session: result.createdSessionId })
          navigate('/dashboard')
        } else if (result.status === 'missing_requirements') {
          // May need email verification
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setVerifyMode(true)
        } else {
          setError('Registration incomplete. Please try again.')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || ''

      if (tab === 'login') {
        failRef.current.count += 1
        if (failRef.current.count >= 5) {
          failRef.current.lockedUntil = Date.now() + 60_000
          failRef.current.count = 0
          setError('Too many failed attempts. Locked for 60 seconds.')
        } else if (msg.includes('password') || msg.includes('identifier') || msg.includes('Invalid')) {
          setError('Account not found or incorrect PIN')
        } else {
          setError(msg || 'Something went wrong. Please try again.')
        }
      } else {
        if (msg.includes('already') || msg.includes('taken') || msg.includes('exists')) {
          setError('Account already exists. Please login.')
        } else {
          setError(msg || 'Something went wrong. Please try again.')
        }
      }
    }
    setLoading(false)
  }

  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verifyCode })
      if (result.status === 'complete') {
        await setSignUpActive({ session: result.createdSessionId })
        navigate('/dashboard')
      } else {
        setError('Verification failed. Please check the code.')
      }
    } catch (err) {
      setError(err?.errors?.[0]?.message || 'Verification failed.')
    }
    setLoading(false)
  }

  // Email verification screen
  if (verifyMode) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
            Dumiropay
          </h1>
        </div>
        <div className="w-full max-w-md">
          <div className="card">
            <h3 className="text-lg font-bold mb-1">Verify Your Email</h3>
            <p className="text-gray-400 text-sm mb-6">
              A verification code has been sent. Enter it below to complete registration.
            </p>
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Verification Code</label>
                <input
                  className="input-field"
                  placeholder="Enter code"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="bg-red-900/40 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full text-center">
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
            <p className="text-center mt-4">
              <button
                type="button"
                onClick={() => setVerifyMode(false)}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
          Dumiropay
        </h1>
        <p className="text-gray-400 mt-1 text-sm">Kenya's Premier Investment Platform</p>
      </div>
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
                  ? 'If the account exists, your request has been received. Our team will contact you shortly.'
                  : 'Enter your registered phone number to request a password reset.'}
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
