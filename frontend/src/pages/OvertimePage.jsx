import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import confetti from 'canvas-confetti'
import { format } from 'date-fns'

const API = '/api'

function fireConfetti() {
  const end = Date.now() + 2000
  const colors = ['#F97316', '#000000', '#ffffff']
  ;(function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    })
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}

export default function OvertimePage() {
  const { engineer } = useAuth()
  const [logs, setLogs] = useState([])
  const [form, setForm] = useState({ date: format(new Date(), 'yyyy-MM-dd'), hours: '', reason: '' })
  const [saving, setSaving] = useState(false)

  const fetchLogs = () =>
    axios.get(`${API}/overtime`).then(r => setLogs(r.data)).catch(() => {})

  useEffect(() => { fetchLogs() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.hours || !form.reason) { toast.error('Fill in all fields'); return }
    setSaving(true)
    try {
      await axios.post(`${API}/overtime`, {
        engineer_id: engineer.id,
        date: form.date,
        hours: parseFloat(form.hours),
        reason: form.reason,
      })
      setForm({ date: format(new Date(), 'yyyy-MM-dd'), hours: '', reason: '' })
      await fetchLogs()
      toast.success('Overtime logged!')
      fireConfetti()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const myTotal = logs
    .filter(l => l.engineer_name === engineer?.name)
    .reduce((sum, l) => sum + l.hours, 0)

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <h1 className="text-3xl font-black text-gray-900">Overtime Tracker ⏰</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <span className="text-4xl font-black text-orange-500">{myTotal.toFixed(1)}h</span>
          <p className="text-sm text-gray-500 mt-1">My Total Overtime</p>
        </div>
        <div className="card text-center">
          <span className="text-4xl font-black text-gray-900">{logs.length}</span>
          <p className="text-sm text-gray-500 mt-1">All Entries</p>
        </div>
      </div>

      {/* Log Form */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-5">Log Overtime</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                placeholder="e.g. 2.5"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Why did you work overtime?"
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-orange w-full disabled:opacity-50 text-base py-3"
          >
            {saving ? 'Saving…' : '🎉 Save Overtime'}
          </button>
        </form>
      </div>

      {/* Log Table */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">All Overtime Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-left">
                <th className="pb-2 font-semibold">Engineer</th>
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Hours</th>
                <th className="pb-2 font-semibold">Reason</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: log.engineer_color }}
                      >
                        {log.engineer_name?.[0]}
                      </div>
                      {log.engineer_name}
                    </div>
                  </td>
                  <td className="py-3 text-gray-600">{format(new Date(log.date), 'dd MMM yy')}</td>
                  <td className="py-3 font-semibold text-orange-600">{log.hours}h</td>
                  <td className="py-3 text-gray-600 max-w-[200px] truncate">{log.reason}</td>
                  <td className="py-3">
                    <span className={log.approved ? 'badge-green' : 'badge-gray'}>
                      {log.approved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-400">No overtime logged yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
