import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getUser } from '../lib/db'

const AuthContext = createContext(null)
const SESSION_KEY = 'dumiropay_session'

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
        }).catch(() => {
          setUser({ ...session, id: session.phone })
        }).finally(() => setLoading(false))
      } catch {
        localStorage.removeItem(SESSION_KEY)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback((userData) => {
    const u = { ...userData, id: userData.phone || userData.id }
    setUser(u)
    localStorage.setItem(SESSION_KEY, JSON.stringify(u))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
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
