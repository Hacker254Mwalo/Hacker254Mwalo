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
        // Refresh balance/data from DB on mount
        getUser(session.phone).then(fresh => {
          const u = fresh ? { ...fresh, id: fresh.phone } : session
          setUser(u)
          localStorage.setItem(SESSION_KEY, JSON.stringify(u))
        }).catch(() => {
          setUser(session)
        }).finally(() => setLoading(false))
      } catch {
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
      const updated = { ...prev, ...updates }
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
