import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const adminPhone = import.meta.env.VITE_ADMIN_PHONE
  const isAdmin = user && (user.is_admin === true || (adminPhone && user.phone === adminPhone))
  const waPhone = adminPhone ? adminPhone.replace(/\D/g, '') : ''

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/plans',     label: 'Invest',    icon: '📈' },
    { to: '/history',   label: 'History',   icon: '📋' },
    { to: '/profile',   label: 'Profile',   icon: '👤' },
  ]

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
              className="ml-1 px-3 py-1.5 text-xs bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-semibold transition-colors"
            >
              ⚙️ Admin
            </NavLink>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
            className="ml-2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-800 text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {user && waPhone && (
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition-colors flex items-center gap-1.5"
            >
              <span className="text-base">💬</span>
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

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t flex"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-red-400' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl mb-0.5">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}

        {/* Theme toggle on mobile */}
        <button
          onClick={toggleTheme}
          className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-500 transition-colors"
        >
          <span className="text-xl mb-0.5">{theme === 'dark' ? '☀️' : '🌙'}</span>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>

        {user && waPhone && (
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-500"
          >
            <span className="text-xl mb-0.5">💬</span>
            Support
          </a>
        )}
      </nav>
    </>
  )
}
