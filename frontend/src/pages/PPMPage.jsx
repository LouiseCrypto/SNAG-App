import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import JobModal from '../components/JobModal'

const API = import.meta.env.VITE_API_URL

const PRIORITY_COLOR = {
  Pending: 'badge-gray',
  'In Progress': 'badge-orange',
  Completed: 'badge-green',
}

export default function PPMPage() {
  const { engineer } = useAuth()
  const [jobs, setJobs] = useState([])
  const [modal, setModal] = useState(null) // { job, action: 'start'|'finish' }
  const [filter, setFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [newJob, setNewJob] = useState({ title: '', location: '', scheduled_date: format(new Date(), 'yyyy-MM-dd') })

  const fetchJobs = () =>
    axios.get(`${API}/ppm`).then(r => setJobs(r.data)).catch(() => {})

  useEffect(() => { fetchJobs() }, [])

  const handleConfirm = async (notes, photo) => {
    const { job, action } = modal
    try {
      if (action === 'start') {
        await axios.post(`${API}/ppm/${job.id}/start`, { engineer_id: engineer.id, notes })
      } else {
        await axios.post(`${API}/ppm/${job.id}/finish`, { engineer_id: engineer.id, notes })
      }
      if (photo) {
        const fd = new FormData()
        fd.append('file', photo)
        await axios.post(`${API}/ppm/${job.id}/photo`, fd)
      }
      toast.success(action === 'start' ? 'Job started!' : 'Job completed! ✅')
      await fetchJobs()
    } catch {
      toast.error('Failed to update job')
    } finally {
      setModal(null)
    }
  }

  const addJob = async (e) => {
    e.preventDefault()
    if (!newJob.title || !newJob.location) { toast.error('Fill all fields'); return }
    try {
      await axios.post(`${API}/ppm`, newJob)
      setNewJob({ title: '', location: '', scheduled_date: format(new Date(), 'yyyy-MM-dd') })
      setShowAdd(false)
      await fetchJobs()
      toast.success('PPM job added!')
    } catch {
      toast.error('Failed to add job')
    }
  }

  const statuses = ['All', 'Pending', 'In Progress', 'Completed']
  const filtered = filter === 'All' ? jobs : jobs.filter(j => j.status === filter)

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-gray-900">PPM Jobs 🔧</h1>
        <div className="flex gap-2 flex-wrap items-center">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`btn btn-sm ${filter === s ? 'btn-black' : 'btn-ghost'}`}
            >
              {s}
            </button>
          ))}
          <button onClick={() => setShowAdd(true)} className="btn-orange btn-sm">+ Add</button>
        </div>
      </div>

      {showAdd && (
        <div className="card animate-slideDown">
          <h2 className="font-bold text-gray-900 mb-4">New PPM Job</h2>
          <form onSubmit={addJob} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                value={newJob.title}
                onChange={e => setNewJob(j => ({ ...j, title: e.target.value }))}
                placeholder="Job title"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
              <input
                value={newJob.location}
                onChange={e => setNewJob(j => ({ ...j, location: e.target.value }))}
                placeholder="Location"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Scheduled Date</label>
              <input
                type="date"
                value={newJob.scheduled_date}
                onChange={e => setNewJob(j => ({ ...j, scheduled_date: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-orange btn-sm">Add Job</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {filtered.map(job => (
          <div key={job.id} className="card hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-bold text-gray-900">{job.title}</h3>
                  <span className={PRIORITY_COLOR[job.status] || 'badge-gray'}>{job.status}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                  <span>📍 {job.location}</span>
                  <span>📅 {job.scheduled_date ? format(new Date(job.scheduled_date), 'dd MMM yyyy') : '—'}</span>
                  {job.engineer_name && <span>👷 {job.engineer_name}</span>}
                </div>
                {job.notes && (
                  <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">
                    {job.notes}
                  </p>
                )}
                {job.photo_path && (
                  <img
                    src={job.photo_path}
                    alt="job"
                    className="mt-2 max-h-32 rounded-xl object-cover"
                  />
                )}
              </div>
              <div className="flex gap-2 sm:flex-col">
                {job.status === 'Pending' && (
                  <button
                    onClick={() => setModal({ job, action: 'start' })}
                    className="btn-orange btn-sm whitespace-nowrap"
                  >
                    ▶ Start
                  </button>
                )}
                {job.status === 'In Progress' && (
                  <button
                    onClick={() => setModal({ job, action: 'finish' })}
                    className="btn-black btn-sm whitespace-nowrap"
                  >
                    ✅ Finish
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">🔧</span>
            No PPM jobs found
          </div>
        )}
      </div>

      {modal && (
        <JobModal
          job={modal.job}
          actionLabel={modal.action === 'start' ? 'Start Job' : 'Complete Job'}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
