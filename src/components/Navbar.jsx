import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getWhatsAppSettings, checkIsAdmin, getUserNotifications } from '../lib/db'

export default function Navbar() {
  const { user, logout, updateUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [waPhone, setWaPhone] = useState('')
  const [waGroupLink, setWaGroupLink] = useState('')
  const [notifications, setNotifications] = useState([])

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    if (!user?.phone) return
    checkIsAdmin(user.phone).then(serverAdmin => {
      setIsAdmin(serverAdmin === true)
    }).catch(() => {
      setIsAdmin(user.isAdmin === true)
    })
    getWhatsAppSettings().then(s => {
      setWaPhone(s.whatsapp_phone || '')
      setWaGroupLink(s.whatsapp_group_link || '')
    }).catch(() => {})
  }, [user?.phone])

  // Load notifications
  useEffect(() => {
    if (!user?.phone) return
    const load = () => {
      getUserNotifications(user.phone).then(setNotifications).catch(() => {})
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user?.phone])

  useEffect(() => {
    if (user && isAdmin === true && user.isAdmin !== true) {
      updateUser({ isAdmin: true })
    }
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Tab colour config
  const tabColors = {
    dashboard: { active: 'from-blue-500 to-cyan-500',   dot: '#3b82f6', icon: '#38bdf8' },
    invest:    { active: 'from-emerald-500 to-green-400', dot: '#10b981', icon: '#34d399' },
    history:   { active: 'from-violet-500 to-purple-500', dot: '#8b5cf6', icon: '#a78bfa' },
    notifications: { active: 'from-amber-500 to-orange-400', dot: '#f59e0b', icon: '#fbbf24' },
  }

  // Professional SVG icon paths
  const icons = {
    dashboard: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
    invest: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
    history: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    bell: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
    profile: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    theme: {
      light: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
      dark: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )
    },
    whatsapp: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    admin: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  }

  // Navigation links — notifications only in bottom
  const links = [
    { to: '/dashboard',      label: 'Dashboard',      key: 'dashboard',      icon: icons.dashboard },
    { to: '/plans',          label: 'Invest',         key: 'invest',         icon: icons.invest },
    { to: '/history',        label: 'History',        key: 'history',        icon: icons.history },
    { to: '/notifications',  label: 'Alerts',         key: 'notifications',  icon: icons.bell },
  ]

  const waDigits = waPhone.replace(/\D/g, '')

  return (
    <>
      {/* ── Desktop top bar ─────────────────────────────────────────────── */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 border-b px-6 py-3 items-center justify-between"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
      >
        {/* Left: Logo + Profile Button */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
            Dumiropay
          </span>
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">KE</span>

          {/* Profile button */}
          {user && (
            <button
              onClick={() => navigate('/profile')}
              className="ml-3 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-all hover:scale-110 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ef4444, #ec4899)', color: '#fff' }}
              title="Profile"
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </button>
          )}
        </div>

        {/* Center: Navigation links */}
        <div className="flex items-center gap-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? `bg-gradient-to-r ${tabColors[l.key]?.active || 'from-red-600 to-pink-600'} text-white shadow-lg`
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}

          {isAdmin && (
            <NavLink
              to="/admin"
              className="ml-1 px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-semibold transition-colors flex items-center gap-1"
            >
              {icons.admin}
              <span>Admin</span>
            </NavLink>
          )}
        </div>

        {/* Right: Theme toggle, Support, Logout */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-800"
            style={{ color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? icons.theme.light : icons.theme.dark}
          </button>

          {user && waDigits && (
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center gap-1.5"
            >
              <span className="w-4 h-4">{icons.whatsapp}</span>
              <span className="hidden lg:inline">Support</span>
            </a>
          )}

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom nav — Colourful & Attractive ─────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Glassy background with gradient border top */}
        <div
          className="relative flex items-end"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(5,5,15,0.98) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Coloured top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500 via-emerald-400 via-violet-500 via-amber-400 to-blue-500 opacity-70" />

          {links.map(l => {
            const col = tabColors[l.key] || { active: 'from-red-500 to-pink-500', dot: '#ef4444', icon: '#f87171' }
            return (
              <NavLink
                key={l.to}
                to={l.to}
                className="flex-1 flex flex-col items-center pt-3 pb-2 relative"
              >
                {({ isActive }) => (
                  <>
                    {/* Active pill background */}
                    {isActive && (
                      <span
                        className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-br ${col.active} opacity-20 blur-sm`}
                      />
                    )}
                    {/* Active top indicator dot */}
                    {isActive && (
                      <span
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full"
                        style={{ background: col.dot }}
                      />
                    )}
                    {/* Icon container */}
                    <div
                      className={`relative mb-1 transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
                      style={{ color: isActive ? col.icon : '#6b7280' }}
                    >
                      {l.icon}
                      {/* Notification badge on bell icon */}
                      {l.key === 'notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 flex items-center justify-center text-[8px] font-black bg-red-500 text-white rounded-full px-0.5">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-bold tracking-wide transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-50'}`}
                      style={{ color: isActive ? col.icon : '#6b7280' }}
                    >
                      {l.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex-1 flex flex-col items-center pt-3 pb-2 text-[9px] font-bold tracking-wide text-gray-500 hover:text-gray-300 transition-colors duration-200"
          >
            <div className="mb-1 text-gray-500">
              {theme === 'dark' ? icons.theme.light : icons.theme.dark}
            </div>
            <span className="opacity-50">{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>

          {user && waDigits && (
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center pt-3 pb-2 text-[9px] font-bold tracking-wide transition-colors duration-200"
              style={{ color: '#22c55e' }}
            >
              <div className="mb-1">
                {icons.whatsapp}
              </div>
              <span className="opacity-70">Support</span>
            </a>
          )}

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center pt-3 pb-2 text-[9px] font-bold tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              <div className="mb-1">
                {icons.admin}
              </div>
              <span className="opacity-70">Admin</span>
            </NavLink>
          )}
        </div>
      </nav>
    </>
  )
}
