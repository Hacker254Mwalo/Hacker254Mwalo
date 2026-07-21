import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getWhatsAppSettings, checkIsAdmin } from '../lib/db'

export default function Navbar() {
  const { user, logout, updateUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [waPhone, setWaPhone] = useState('')
  const [waGroupLink, setWaGroupLink] = useState('')

  useEffect(() => {
    if (!user?.phone) return
    // Verify admin status server-side — only override if RPC succeeds
    checkIsAdmin(user.phone).then(serverAdmin => {
      setIsAdmin(serverAdmin === true)
    }).catch(() => {
      // On error, fall back to the value from login session (user.isAdmin)
      setIsAdmin(user.isAdmin === true)
    })
    // Load WhatsApp settings from DB
    getWhatsAppSettings().then(s => {
      setWaPhone(s.whatsapp_phone || '')
      setWaGroupLink(s.whatsapp_group_link || '')
    }).catch(() => {})
  }, [user?.phone])

  // Keep isAdmin in user object in sync — only update if server confirmed
  useEffect(() => {
    if (user && isAdmin === true && user.isAdmin !== true) {
      updateUser({ isAdmin: true })
    }
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogout() {
    logout()
    navigate('/login')
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

  const links = [
    { to: '/dashboard', label: 'Dashboard', key: 'dashboard', icon: icons.dashboard },
    { to: '/plans',     label: 'Invest',    key: 'invest',    icon: icons.invest },
    { to: '/history',   label: 'History',   key: 'history',   icon: icons.history },
    { to: '/profile',   label: 'Profile',   key: 'profile',   icon: icons.profile },
  ]

  const waDigits = waPhone.replace(/\D/g, '')

  return (
    <>
      {/* Desktop top bar */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-50 border-b px-6 py-3 items-center justify-between"
        style={{ background: 'var(--nav-bg)', borderColor: 'var(--border)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent">
            Dumiropay
          </span>
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full">KE</span>
        </div>

        <div className="flex items-center gap-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white'
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

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="ml-2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-800"
            style={{ color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? icons.theme.light : icons.theme.dark}
          </button>

          {user && waDigits && (
            <a
              href={`https://wa.me/${waDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center gap-1.5"
            >
              <span className="w-4 h-4">{icons.whatsapp}</span>
              <span className="hidden lg:inline">Support</span>
            </a>
          )}

          <button
            onClick={handleLogout}
            className="ml-1 px-4 py-2 text-sm text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav — Professional */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex items-end"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center pt-3 pb-2 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                isActive
                  ? 'text-red-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <div className="relative mb-1">
              {l.icon}
            </div>
            <span>{l.label}</span>
          </NavLink>
        ))}

        {/* Active indicator dot */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-500 via-pink-500 to-red-600 opacity-0 transition-opacity duration-200 pointer-events-none" id="nav-active-indicator" />

        {/* Theme toggle on mobile */}
        <button
          onClick={toggleTheme}
          className="flex-1 flex flex-col items-center pt-3 pb-2 text-[10px] font-semibold tracking-wide text-gray-500 hover:text-gray-300 transition-colors duration-200"
        >
          <div className="mb-1">
            {theme === 'dark' ? icons.theme.light : icons.theme.dark}
          </div>
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {user && waDigits && (
          <a
            href={`https://wa.me/${waDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center pt-3 pb-2 text-[10px] font-semibold tracking-wide text-gray-500 hover:text-gray-300 transition-colors duration-200"
          >
            <div className="mb-1 text-green-500">
              {icons.whatsapp}
            </div>
            <span>Support</span>
          </a>
        )}

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center pt-3 pb-2 text-[10px] font-semibold tracking-wide transition-colors duration-200 ${
                isActive ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'
              }`
            }
          >
            <div className="mb-1">
              {icons.admin}
            </div>
            <span>Admin</span>
          </NavLink>
        )}
      </nav>
    </>
  )
}
