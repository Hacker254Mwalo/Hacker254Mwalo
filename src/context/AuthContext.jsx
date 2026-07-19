/**
 * AuthContext.jsx — Dumiropay Auth Bridge
 *
 * Uses Clerk for identity (sign-in / sign-up / session management).
 * Bridges to the existing Supabase `users` table via clerk_id so that
 * all balance, investment, and admin data continues to work unchanged.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { getUserByClerkId, createUserFromClerk } from '../lib/db'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { isLoaded: clerkLoaded, isSignedIn, user: clerkUser } = useUser()
  const { signOut: clerkSignOut } = useClerk()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Sync Clerk identity → Supabase user profile
  useEffect(() => {
    if (!clerkLoaded) return

    if (!isSignedIn || !clerkUser) {
      setUser(null)
      setLoading(false)
      return
    }

    async function syncUser() {
      try {
        // Try to find existing Supabase user by clerk_id
        let dbUser = await getUserByClerkId(clerkUser.id)

        if (!dbUser) {
          // First sign-in: create Supabase profile linked to Clerk identity
          const phone = clerkUser.unsafeMetadata?.phone || ''
          const name = clerkUser.fullName || clerkUser.firstName || clerkUser.username || 'User'
          dbUser = await createUserFromClerk({
            clerkId: clerkUser.id,
            phone,
            name,
            email: clerkUser.primaryEmailAddress?.emailAddress || '',
          })
        }

        setUser(dbUser)
      } catch (err) {
        console.error('AuthContext syncUser error:', err)
        // Fallback: minimal user from Clerk data
        setUser({
          id: clerkUser.id,
          clerkId: clerkUser.id,
          phone: clerkUser.unsafeMetadata?.phone || '',
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          balance: 0,
          bonusBalance: 0,
          isAdmin: false,
        })
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    syncUser()
  }, [clerkLoaded, isSignedIn, clerkUser])

  // Refresh user from DB (call after balance-changing operations)
  const refreshUser = useCallback(async () => {
    if (!clerkUser) return
    try {
      const fresh = await getUserByClerkId(clerkUser.id)
      if (fresh) setUser(fresh)
    } catch { /* silently fail */ }
  }, [clerkUser])

  // Update local user state (for optimistic UI updates)
  const updateUser = useCallback((updates) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev)
  }, [])

  // Logout via Clerk
  const logout = useCallback(async () => {
    setUser(null)
    await clerkSignOut()
  }, [clerkSignOut])

  // Legacy login shim — kept for backward compat with pages that call login()
  const login = useCallback((userData) => {
    setUser(prev => prev ? { ...prev, ...userData } : userData)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      loading: !clerkLoaded || loading,
      login,
      logout,
      updateUser,
      refreshUser,
      isSignedIn: !!isSignedIn,
      clerkUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
