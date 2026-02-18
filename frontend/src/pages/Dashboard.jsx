import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const API = '/api'

function StatCard({ icon, label, value, color }) {
  return (
    <div className={`card flex flex-col gap-2 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <span className="text-3xl">{icon}</span>
        <span className="text-4xl font-black text-gray-900">{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const { engineer, updateEngineer } = useAuth()
  const [stats, setStats] = useState({ ppm: 0, reactive: 0, overtime: 0 })
  const [shifting, setShifting] = useState(false)

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
                <span>🟢</span> Since {format(new Date(engineer.shift_start), 'HH:mm')}
              </span>
            )}
          </div>
        </div>
        {/* Shift status indicator */}
        {engineer?.is_on_shift && (
          <div className="badge-green text-sm px-3 py-1.5 hidden sm:flex">On Shift</div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="🔧" label="Open PPM Jobs"      value={stats.ppm}      color="border-orange-400" />
        <StatCard icon="⚡" label="Open Reactive Jobs" value={stats.reactive}  color="border-blue-400"   />
        <StatCard icon="⏰" label="Overtime Entries"   value={stats.overtime}  color="border-green-400"  />
      </div>

      {/* Giant Shift Toggle */}
      <div className="card flex flex-col items-center gap-6 py-12">
        <p className="text-gray-500 font-medium text-lg">
          {engineer?.is_on_shift ? 'Currently on shift' : 'Not on shift'}
        </p>
        <button
          onClick={toggleShift}
          disabled={shifting}
          className={`
            relative w-48 h-48 rounded-full font-black text-xl text-white shadow-2xl
            transition-all duration-200 active:scale-95 select-none
            ${engineer?.is_on_shift
              ? 'bg-gradient-to-br from-red-400 to-red-600 shadow-red-200 hover:shadow-red-300'
              : 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-200 hover:shadow-green-300 animate-pulse2'
            }
          `}
        >
          {shifting ? (
            <span className="text-4xl animate-spin inline-block">⟳</span>
          ) : engineer?.is_on_shift ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl">🔴</span>
              <span>Finish Shift</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl">🟢</span>
              <span>Start Shift</span>
            </div>
          )}
        </button>
        <p className="text-xs text-gray-400 max-w-xs text-center">
          Press to toggle your shift status. This will be logged and visible to all engineers.
        </p>
      </div>
    </div>
  )
}
