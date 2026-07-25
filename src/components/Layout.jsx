import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/login')
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at center, #0a1628 0%, #030712 70%)',
        }}
      >
        {/* Animated AI Brain Image */}
        <div className="relative mb-6">
          <img
            src="/ai-loading.webp"
            alt="AI Computing"
            className="w-48 h-48 object-contain"
            style={{
              animation: 'aiPulse 2.5s ease-in-out infinite, aiFloat 4s ease-in-out infinite',
              filter: 'drop-shadow(0 0 30px rgba(56, 189, 248, 0.4))',
            }}
          />
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              animation: 'aiRing 2s ease-in-out infinite',
              border: '2px solid rgba(56, 189, 248, 0.3)',
            }}
          />
        </div>

        {/* Loading text */}
        <p
          className="text-sm font-semibold tracking-widest uppercase"
          style={{
            color: '#38bdf8',
            animation: 'aiFade 2s ease-in-out infinite',
          }}
        >
          AI Compute Engine
        </p>
        <p
          className="text-xs mt-1 tracking-wide"
          style={{
            color: 'rgba(148, 163, 184, 0.6)',
          }}
        >
          Initializing neural nodes...
        </p>

        {/* Animated loading bar */}
        <div className="w-48 h-1 rounded-full mt-5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: '30%',
              background: 'linear-gradient(90deg, #0ea5e9, #38bdf8, #0ea5e9)',
              backgroundSize: '200% 100%',
              animation: 'aiSlide 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <Outlet />
      </main>
    </>
  )
}
