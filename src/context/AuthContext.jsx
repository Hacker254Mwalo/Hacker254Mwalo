import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUser } from '../lib/db'

const AuthContext = createContext(null)
const SESSION_KEY = 'dumiropay_session'
const SESSION_COOKIE = 'dp_session'

function syncSessionCookie(hasSession) {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  const maxAge = hasSession ? 60 * 60 * 24 * 30 : 0
  document.cookie = `${SESSION_COOKIE}=${hasSession ? '1' : '0'}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        const session = JSON.parse(saved)
        // Removed: client-side process_daily_profits() — this RPC is now
        // handled exclusively by Vercel cron (0 0 * * *) and refreshUser() calls.
        // Calling it from every browser on app load exhausts free-tier limits
        // at 600 concurrent users.
        getUser(session.phone).then(fresh => {
          const u = fresh
            ? { ...fresh, id: fresh.phone }
            : { ...session, id: session.phone }
          setUser(u)
          localStorage.setItem(SESSION_KEY, JSON.stringify(u))
          syncSessionCookie(true)
        }).catch(() => {
          setUser({ ...session, id: session.phone })
          syncSessionCookie(true)
        }).finally(() => setLoading(false))
      } catch {
        localStorage.removeItem(SESSION_KEY)
        syncSessionCookie(false)
        setLoading(false)
      }
    } else {
      syncSessionCookie(false)
      setLoading(false)
    }
  }, [])

  const login = useCallback((userData) => {
    const u = { ...userData, id: userData.phone || userData.id }
    setUser(u)
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
    syncSessionCookie(true)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
    syncSessionCookie(false)
  }, [])

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      if (!prev) return prev
      const updated = { ...prev, ...updates }
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  // Refresh user from DB (call after balance-changing operations)
  // Removed: process_daily_profits() call — cron handles this server-side.
  const refreshUser = useCallback(async () => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (!saved) return
    try {
      const session = JSON.parse(saved)
      const fresh = await getUser(session.phone)
      if (fresh) {
        const u = { ...fresh, id: fresh.phone }
        setUser(u)
        localStorage.setItem(SESSION_KEY, JSON.stringify(u))
        syncSessionCookie(true)
      }
    } catch { /* silently fail */ }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
