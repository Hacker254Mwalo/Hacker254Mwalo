import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const adminPhone = import.meta.env.VITE_ADMIN_PHONE
  const isAdmin = user && adminPhone && user.phone === adminPhone
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
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#111]/90 backdrop-blur border-b border-[#1a1a1a] px-6 py-3 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-[#D4AF37]">
            Dumiropay
          </span>
          <span className="text-xs bg-[#D4AF37] text-black px-2 py-0.5 rounded-full font-semibold">KE</span>
        </div>
        <div className="flex items-center gap-1">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-gray-500 hover:text-white hover:bg-[#0a0a0a]'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className="ml-1 px-3 py-1.5 text-xs bg-[#D4AF37] hover:bg-[#E5C04B] text-black rounded-lg font-semibold transition-colors">
              Admin
            </NavLink>
          )}
          {user && waPhone && (
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-colors flex items-center gap-1.5"
            >
              <span className="text-base">💬</span>
              <span className="hidden lg:inline">Message</span>
            </a>
          )}
          <button onClick={handleLogout} className="ml-2 px-4 py-2 text-sm text-gray-500 hover:text-red-400 rounded-lg hover:bg-[#0a0a0a] transition-colors">
            Logout
          </button>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#111]/90 backdrop-blur border-t border-[#1a1a1a] flex">
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                isActive ? 'text-[#D4AF37]' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl mb-0.5">{l.icon}</span>
            {l.label}
          </NavLink>
        ))}
        {user && waPhone && (
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex flex-col items-center py-3 text-xs font-medium text-gray-500"
          >
            <span className="text-xl mb-0.5">💬</span>
            Message
          </a>
        )}
      </nav>
    </>
  )
}
