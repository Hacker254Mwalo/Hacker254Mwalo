import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { getWhatsAppSettings, checkIsAdmin, getUserNotifications, markNotificationRead, markAllNotificationsRead } from '../lib/db'

export default function Navbar() {
  const { user, logout, updateUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [isAdmin, setIsAdmin] = useState(false)
  const [waPhone, setWaPhone] = useState('')
  const [waGroupLink, setWaGroupLink] = useState('')

  // Notifications state
  const [notifications, setNotifications] = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const notifRef = useRef(null)

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

  // Close notif panel on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifPanel(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (user && isAdmin === true && user.isAdmin !== true) {
      updateUser({ isAdmin: true })
    }
  }, [isAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleLogout() {
    logout()
    navigate('/login')
  }

  async function handleMarkAllRead() {
    if (!user?.phone) return
    await markAllNotificationsRead(user.phone).catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  async function handleMarkRead(id) {
    await markNotificationRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  // Tab colour config — each tab gets its own colour identity
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

  // Navigation links — profile replaced with notifications
  const links = [
    { to: '/dashboard',      label: 'Dashboard',      key: 'dashboard',      icon: icons.dashboard },
    { to: '/plans',          label: 'Invest',         key: 'invest',         icon: icons.invest },
    { to: '/history',        label: 'History',        key: 'history',        icon: icons.history },
    { to: '/notifications',  label: 'Alerts',         key: 'notifications',  icon: icons.bell },
  ]

  const waDigits = waPhone.replace(/\D/g, '')

  // Notification dropdown panel
  const NotifPanel = () => (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl z-[200] overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.05))' }}>
        <div className="flex items-center gap-2">
          <span className="text-amber-400">{icons.bell}</span>
          <span className="font-bold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold transition-colors">
            Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <div className="text-3xl mb-2">🔔</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No notifications yet</p>
          </div>
        ) : (
          notifications.slice(0, 20).map(n => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-white/5 border-b last:border-0"
              style={{
                borderColor: 'var(--border)',
                background: n.is_read ? 'transparent' : 'rgba(245,158,11,0.06)'
              }}
            >
              <div className="mt-0.5 flex-shrink-0">
                <span className="text-lg">{n.icon || '📢'}</span>
              </div>
              <div className="flex-1 min-w-0">
                {n.title && <p className="text-xs font-bold mb-0.5 truncate">{n.title}</p>}
                <p className="text-xs leading-relaxed" style={{ color: n.is_read ? 'var(--text-muted)' : 'var(--text-primary)' }}>{n.message}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.created_at)}</p>
              </div>
              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t text-center" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => { navigate('/notifications'); setShowNotifPanel(false) }}
          className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
        >
          View all notifications →
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop top bar ─────────────────────────────────────────────── */}
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

          {/* Notification bell — desktop top bar */}
          <div className="relative ml-1" ref={notifRef}>
            <button
              onClick={() => setShowNotifPanel(v => !v)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-amber-500/20"
              style={{ color: unreadCount > 0 ? '#f59e0b' : 'var(--text-secondary)' }}
              title="Notifications"
            >
              {icons.bell}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full px-0.5 shadow-lg animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {showNotifPanel && <NotifPanel />}
          </div>

          {/* User name/avatar */}
          {user && (
            <div className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-input)' }}>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-[10px] font-black text-white">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-semibold max-w-[80px] truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.name?.split(' ')[0] || 'User'}
              </span>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="ml-1 px-4 py-2 text-sm text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
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

      {/* Mobile notification bell — floating near user name in top-right */}
      <div className="md:hidden fixed top-3 right-3 z-[60] flex items-center gap-2">
        {/* User avatar + name */}
        {user && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-[9px] font-black text-white">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-[10px] font-semibold text-white max-w-[60px] truncate">
              {user?.name?.split(' ')[0] || 'User'}
            </span>
          </div>
        )}

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifPanel(v => !v)}
            className="relative w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95"
            style={{
              background: unreadCount > 0
                ? 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.15))'
                : 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${unreadCount > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
              color: unreadCount > 0 ? '#f59e0b' : '#9ca3af',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-black bg-red-500 text-white rounded-full px-0.5 shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifPanel && (
            <div className="absolute right-0 top-full mt-2 w-72" style={{ zIndex: 200 }}>
              <NotifPanel />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
