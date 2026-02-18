import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const API = 'https://snag-backend.onrender.com'

const SEVERITY_BADGE = {
  Low: 'badge-blue',
  Medium: 'badge-orange',
  High: 'badge-red',
}

export default function ContractorPage() {
  const { engineer } = useAuth()
  const [issues, setIssues] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ contractor_name: '', issue_description: '', severity: 'Medium', notes: '' })

  const fetchIssues = () =>
    axios.get(`${API}/contractors`).then(r => setIssues(r.data)).catch(() => {})

  useEffect(() => { fetchIssues() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.contractor_name || !form.issue_description) { toast.error('Fill all required fields'); return }
    try {
      await axios.post(`${API}/contractors`, { ...form, reported_by_id: engineer.id })
      setForm({ contractor_name: '', issue_description: '', severity: 'Medium', notes: '' })
      setShowAdd(false)
      await fetchIssues()
      toast.success('Issue reported!')
    } catch {
      toast.error('Failed to add issue')
    }
  }

  const toggleResolved = async (id) => {
    try {
      await axios.patch(`${API}/contractors/${id}/resolve`)
      await fetchIssues()
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900">Contractor Issues 👷</h1>
        <button onClick={() => setShowAdd(s => !s)} className="btn-orange btn-sm">+ Report Issue</button>
      </div>

      {showAdd && (
        <div className="card animate-slideDown">
          <h2 className="font-bold text-gray-900 mb-4">Report Contractor Issue</h2>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={form.contractor_name}
                onChange={e => setForm(f => ({ ...f, contractor_name: e.target.value }))}
                placeholder="Contractor name *"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              >
                {['Low', 'Medium', 'High'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <textarea
              value={form.issue_description}
              onChange={e => setForm(f => ({ ...f, issue_description: e.target.value }))}
              placeholder="Describe the issue *"
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-orange btn-sm">Report</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-left">
              <th className="pb-3 pr-3 font-semibold">Contractor</th>
              <th className="pb-3 pr-3 font-semibold">Issue</th>
              <th className="pb-3 pr-3 font-semibold">Severity</th>
              <th className="pb-3 pr-3 font-semibold">Reported By</th>
              <th className="pb-3 pr-3 font-semibold">Date</th>
              <th className="pb-3 pr-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-center">Resolved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {issues.map(issue => (
              <tr key={issue.id} className={`hover:bg-orange-50 transition-colors ${issue.resolved ? 'opacity-60' : ''}`}>
                <td className="py-3 pr-3 font-medium text-gray-900">{issue.contractor_name}</td>
                <td className="py-3 pr-3 text-gray-600 max-w-[200px]">
                  <p className="truncate">{issue.issue_description}</p>
                </td>
                <td className="py-3 pr-3">
                  <span className={SEVERITY_BADGE[issue.severity] || 'badge-gray'}>{issue.severity}</span>
                </td>
                <td className="py-3 pr-3 text-gray-600">{issue.reported_by?.name || '—'}</td>
                <td className="py-3 pr-3 text-gray-500 whitespace-nowrap text-xs">
                  {format(new Date(issue.reported_at), 'dd MMM HH:mm')}
                </td>
                <td className="py-3 pr-3">
                  <span className={issue.resolved ? 'badge-green' : 'badge-orange'}>{issue.status}</span>
                </td>
                <td className="py-3 text-center">
                  <button
                    onClick={() => toggleResolved(issue.id)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all active:scale-90
                      ${issue.resolved ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-orange-400'}`}
                  >
                    {issue.resolved && '✓'}
                  </button>
                </td>
              </tr>
            ))}
            {issues.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <span className="text-4xl block mb-2">👷</span>
                  No contractor issues logged
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
