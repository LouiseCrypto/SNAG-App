import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const API = 'https://snag-backend.onrender.com'

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
  const { engineer, logout, updateEngineer } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [shifting, setShifting] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleShift = async () => {
    setShifting(true)
    try {
      const res = await axios.post(`${API}/engineers/shift-toggle`, { engineer_id: engineer.id })
      updateEngineer({ is_on_shift: res.data.is_on_shift, shift_start: res.data.shift_start })
      toast.success(res.data.is_on_shift ? '✅ Shift started!' : '👋 Shift finished!')
    } catch {
      toast.error('Failed to toggle shift')
    } finally {
      setShifting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Sticky header wrapper (nav bar + mobile action bar together) ── */}
      <header className="sticky top-0 z-40 bg-white shadow-sm">

        {/* ── Main nav bar ── */}
        <div className="border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg shadow-md shadow-orange-200">
                S
              </div>
              <span className="font-black text-xl tracking-tight text-gray-900">SNAG</span>
            </div>

            {/* Desktop Nav — only on lg+ */}
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
            <div className="flex items-center gap-2">
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0"
                style={{ backgroundColor: engineer?.avatar_color || '#F97316' }}
              >
                {engineer?.name?.[0] ?? '?'}
              </div>

              {/* Name — hidden on tiny screens */}
              <span className="hidden sm:block text-sm font-semibold text-gray-700">
                {engineer?.name}
              </span>

              {/* Desktop shift button — only on lg+ where there's space */}
              <button
                onClick={toggleShift}
                disabled={shifting}
                title={engineer?.is_on_shift ? 'Finish Shift' : 'Start Shift'}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 disabled:opacity-60 ${
                  engineer?.is_on_shift
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                }`}
              >
                {shifting ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : engineer?.is_on_shift ? (
                  <>🔴 Finish Shift</>
                ) : (
                  <>🟢 Start Shift</>
                )}
              </button>

              {/* Desktop sign out — only on lg+ */}
              <button
                onClick={handleLogout}
                className="hidden lg:flex btn btn-ghost btn-sm text-sm"
              >
                Sign out
              </button>

              {/* Mobile / tablet hamburger — hidden on lg+ */}
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle menu"
              >
                <div className="space-y-1.5">
                  <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                  <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${menuOpen ? 'opacity-0' : ''}`} />
                  <span className={`block w-6 h-0.5 bg-gray-700 transition-all duration-200 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile / Tablet Shift Action Bar — always visible, below nav ── */}
        {/* Hidden on lg+ (desktop handles it with the compact button above)   */}
        <div className="lg:hidden">
          <button
            onClick={toggleShift}
            disabled={shifting}
            className={`
              w-full flex items-center justify-center gap-3
              py-4 px-6
              font-black text-white text-base tracking-wide
              transition-all duration-200 active:brightness-90
              disabled:opacity-70
              ${engineer?.is_on_shift
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : 'bg-gradient-to-r from-green-500 to-green-600'
              }
            `}
          >
            {shifting ? (
              <>
                <span className="animate-spin inline-block text-xl">⟳</span>
                <span>Updating…</span>
              </>
            ) : engineer?.is_on_shift ? (
              <>
                <span className="text-xl">🔴</span>
                <span>FINISH SHIFT</span>
                {engineer?.shift_start && (
                  <span className="text-sm font-medium opacity-80">
                    · since {format(new Date(engineer.shift_start), 'HH:mm')}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-xl">🟢</span>
                <span>START SHIFT</span>
              </>
            )}
          </button>
        </div>

        {/* ── Mobile Nav Dropdown (hamburger) ── */}
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

      {/* ── Page Content ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  )
}
