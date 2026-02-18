import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/app',            label: 'Dashboard',    icon: '🏠', end: true },
  { to: '/app/ppm',        label: 'PPM',          icon: '🔧' },
  { to: '/app/reactive',   label: 'Reactive',     icon: '⚡' },
  { to: '/app/handover',   label: 'Handover',     icon: '📢' },
  { to: '/app/overtime',   label: 'Overtime',     icon: '⏰' },
  { to: '/app/calendar',   label: 'Calendar',     icon: '📅' },
  { to: '/app/completed',  label: 'Completed',    icon: '✅' },
  { to: '/app/parts',      label: 'Parts',        icon: '📦' },
  { to: '/app/contractors',label: 'Contractors',  icon: '👷' },
]

export default function Layout() {
  const { engineer, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-200">
              S
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900">SNAG</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(({ to, label, icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <span className="text-base">{icon}</span>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
              style={{ backgroundColor: engineer?.avatar_color || '#F97316' }}
            >
              {engineer?.name?.[0] ?? '?'}
            </div>
            <span className="hidden sm:block text-sm font-semibold text-gray-700">
              {engineer?.name}
            </span>
            <button
              onClick={handleLogout}
              className="btn btn-ghost btn-sm text-sm hidden sm:flex"
            >
              Sign out
            </button>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <div className="space-y-1.5">
                <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white shadow-lg animate-slideDown">
            <nav className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 gap-1">
              {navItems.map(({ to, label, icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <span>{icon}</span> {label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="col-span-2 mt-2 btn btn-ghost btn-sm text-sm"
              >
                Sign out
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
