import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { format } from 'date-fns'

const API = 'https://snag-backend.onrender.com'

function StatCard({ icon, label, value, color, onClick }) {
  return (
    <div
      className={`card flex flex-col gap-2 border-l-4 ${color} cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 active:scale-95 select-none`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-3xl">{icon}</span>
        <span className="text-4xl font-black text-gray-900">{value}</span>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="text-xs text-gray-400">→</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { engineer } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ ppm: 0, reactive: 0, overtime: 0 })

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/ppm`),
      axios.get(`${API}/reactive`),
      axios.get(`${API}/overtime`),
    ]).then(([ppm, reactive, ot]) => {
      setStats({
        ppm: ppm.data.filter(j => j.status !== 'Completed').length,
        reactive: reactive.data.filter(j => j.status !== 'Completed').length,
        overtime: ot.data.filter(o => o.engineer_name === engineer?.name).length,
      })
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Engineer Profile Card */}
      <div className="card flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-xl flex-shrink-0"
          style={{ backgroundColor: engineer?.avatar_color }}
        >
          {engineer?.name?.[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gray-900">{engineer?.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <span>🪪</span> {engineer?.engineer_id}
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-600">
              <span>📞</span> {engineer?.phone}
            </span>
            {engineer?.is_on_shift && engineer?.shift_start && (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <span>🟢</span> On shift since {format(new Date(engineer.shift_start), 'HH:mm')}
              </span>
            )}
          </div>
        </div>
        {engineer?.is_on_shift && (
          <div className="badge-green text-sm px-3 py-1.5 hidden sm:flex">On Shift</div>
        )}
      </div>

      {/* Clickable Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon="🔧"
          label="Open PPM Jobs"
          value={stats.ppm}
          color="border-orange-400"
          onClick={() => navigate('/app/ppm')}
        />
        <StatCard
          icon="⚡"
          label="Open Reactive Jobs"
          value={stats.reactive}
          color="border-blue-400"
          onClick={() => navigate('/app/reactive')}
        />
        <StatCard
          icon="⏰"
          label="My Overtime Entries"
          value={stats.overtime}
          color="border-green-400"
          onClick={() => navigate('/app/overtime')}
        />
      </div>

      {/* Quick Links */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: '📢', label: 'Handover', path: '/app/handover' },
            { icon: '📅', label: 'Calendar', path: '/app/calendar' },
            { icon: '📦', label: 'Parts', path: '/app/parts' },
            { icon: '✅', label: 'Completed', path: '/app/completed' },
          ].map(({ icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl hover:bg-orange-50 hover:text-orange-600 text-gray-600 transition-all duration-150 active:scale-95"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
