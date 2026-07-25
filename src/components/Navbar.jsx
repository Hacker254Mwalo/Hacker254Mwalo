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
  }, [isAdmin])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Realistic image icons for bottom nav
  const navIcons = {
    dashboard: '/icons/nav-dashboard.png',
    invest: '/icons/nav-invest.png',
    history: '/icons/nav-history.png',
    notifications: '/icons/nav-alerts.png',
    profile: '/icons/nav-profile.png',
    support: '/icons/nav-support.png',
    admin: '/icons/nav-admin.png',
  }

  const tabColors = {
    dashboard: { active: 'from-blue-500 to-cyan-500',   dot: '#3b82f6', icon: '#38bdf8' },
    invest:    { active: 'from-emerald-500 to-green-400', dot: '#10b981', icon: '#34d399' },
    history:   { active: 'from-violet-500 to-purple-500', dot: '#8b5cf6', icon: '#a78bfa' },
    notifications: { active: 'from-amber-500 to-orange-400', dot: '#f59e0b', icon: '#fbbf24' },
    profile:   { active: 'from-pink-500 to-rose-500', dot: '#ec4899', icon: '#f43f5e' },
  }

  // SVG icons for desktop nav (kept for desktop text-based nav)
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
      <img src="/icons/whatsapp-support.png" alt="WhatsApp" className="w-5 h-5 object-contain" />
    ),
    admin: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  }

  const links = [
    { to: '/dashboard',      label: 'Dashboard',      key: 'dashboard',      icon: icons.dashboard, img: navIcons.dashboard },
    { to: '/plans',          label: 'Invest',         key: 'invest',         icon: icons.invest, img: navIcons.invest },
    { to: '/history',        label: 'History',        key: 'history',        icon: icons.history, img: navIcons.history },
    { to: '/notifications',  label: 'Alerts',         key: 'notifications',  icon: icons.bell, img: navIcons.notifications },
  ]

  const waDigits = waPhone.replace(/\D/g, '')

  return (
    <>
      {/* ── Desktop top bar ─────────────────────────────────────────────── */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 border-b px-6 py-3 items-center justify-between"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
            Dumiropay
          </span>
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">KE</span>

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

      {/* ── Mobile bottom nav — Realistic Image Icons ─────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="relative flex items-end"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,20,0.92) 0%, rgba(5,5,15,0.98) 100%)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
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
                    {isActive && (
                      <span
                        className={`absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-br ${col.active} opacity-20 blur-sm`}
                      />
                    )}
                    {isActive && (
                      <span
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full"
                        style={{ background: col.dot }}
                      />
                    )}
                    {/* Realistic image icon */}
                    <div
                      className={`relative mb-1 transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
                    >
                      <img
                        src={l.img}
                        alt={l.label}
                        className="w-10 h-10 object-contain"
                        style={{ filter: isActive ? 'brightness(1.05) saturate(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.4))' : 'brightness(0.7) saturate(0.6)' }}
                      />
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

          {/* Profile tab */}
          {user && (
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center pt-3 pb-2 text-[9px] font-bold tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-rose-400' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 opacity-20 blur-sm"
                    />
                  )}
                  {isActive && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full"
                      style={{ background: '#ec4899' }}
                    />
                  )}
                  <div
                    className={`relative mb-1 transition-all duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}
                  >
                    <img
                      src={navIcons.profile}
                      alt="Profile"
                      className="w-10 h-10 object-contain"
                      style={{ filter: isActive ? 'brightness(1.05) saturate(1.1) drop-shadow(0 0 6px rgba(255,255,255,0.4))' : 'brightness(0.7) saturate(0.6)' }}
                    />
                  </div>
                  <span
                    className={`text-[9px] font-bold tracking-wide transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-50'}`}
                    style={{ color: isActive ? '#f43f5e' : '#6b7280' }}
                  >
                    Profile
                  </span>
                </>
              )}
            </NavLink>
          )}

          {user && waDigits && (
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex flex-col items-center pt-3 pb-2 text-[9px] font-bold tracking-wide transition-colors duration-200"
              style={{ color: '#22c55e' }}
            >
              <div className="mb-1">
                <img
                  src={navIcons.support}
                  alt="Support"
                  className="w-10 h-10 object-contain"
                  style={{ filter: 'brightness(0.7) saturate(0.6)' }}
                />
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
                <img
                  src={navIcons.admin}
                  alt="Admin"
                  className="w-10 h-10 object-contain"
                  style={{ filter: 'brightness(0.7) saturate(0.6)' }}
                />
              </div>
              <span className="opacity-70">Admin</span>
            </NavLink>
          )}
        </div>
      </nav>
    </>
  )
}
