import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'
import JobModal from '../components/JobModal'
import DetailModal from '../components/DetailModal'

const API = 'https://snag-backend.onrender.com'

const PRIORITY_BADGE = {
  Low: 'badge-blue',
  Normal: 'badge-gray',
  High: 'badge-orange',
  Critical: 'badge-red',
}
const STATUS_BADGE = {
  Pending: 'badge-gray',
  'In Progress': 'badge-orange',
  Completed: 'badge-green',
  'On Hold': 'badge-yellow',
}

export default function ReactivePage() {
  const { engineer } = useAuth()
  const [jobs, setJobs] = useState([])
  const [modal, setModal] = useState(null)          // { job, action: 'start'|'finish' }
  const [holdModal, setHoldModal] = useState(null)  // job being put on hold
  const [holdNote, setHoldNote] = useState('')
  const [detail, setDetail] = useState(null)
  const [filter, setFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [newJob, setNewJob] = useState({ title: '', location: '', priority: 'Normal' })
  const [editNotesJob, setEditNotesJob] = useState(null)
  const [editNotesText, setEditNotesText] = useState('')

  const fetchJobs = () =>
    axios.get(`${API}/reactive`).then(r => setJobs(r.data)).catch(() => {})

  useEffect(() => { fetchJobs() }, [])

  const handleConfirm = async (notes, photo) => {
    const { job, action } = modal
    try {
      if (action === 'start') {
        await axios.post(`${API}/reactive/${job.id}/start`, { engineer_id: engineer.id, notes })
      } else {
        await axios.post(`${API}/reactive/${job.id}/finish`, { engineer_id: engineer.id, notes })
      }
      if (photo) {
        const fd = new FormData()
        fd.append('file', photo)
        await axios.post(`${API}/reactive/${job.id}/photo`, fd)
      }
      toast.success(action === 'start' ? 'Job started!' : 'Job completed! ✅')
      await fetchJobs()
    } catch {
      toast.error('Failed to update job')
    } finally {
      setModal(null)
    }
  }

  const handleHold = async () => {
    if (!holdNote.trim()) { toast.error('Please provide a reason for putting this job on hold'); return }
    try {
      await axios.post(`${API}/reactive/${holdModal.id}/hold`, { engineer_id: engineer.id, note: holdNote })
      toast.success('Job placed on hold ⏸')
      setHoldModal(null)
      setHoldNote('')
      await fetchJobs()
    } catch {
      toast.error('Failed to place job on hold')
    }
  }

  const handleResume = async (job) => {
    try {
      await axios.post(`${API}/reactive/${job.id}/resume`, { engineer_id: engineer.id })
      toast.success('Job resumed ▶')
      await fetchJobs()
    } catch {
      toast.error('Failed to resume job')
    }
  }

  const handleEditNotes = async () => {
    try {
      await axios.patch(`${API}/reactive/${editNotesJob.id}/notes`, { engineer_id: engineer.id, notes: editNotesText })
      toast.success('Notes updated ✏️')
      setEditNotesJob(null)
      await fetchJobs()
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Only the assigned engineer can edit these notes')
      } else {
        toast.error('Failed to update notes')
      }
    }
  }

  const addJob = async (e) => {
    e.preventDefault()
    if (!newJob.title || !newJob.location) { toast.error('Fill all fields'); return }
    try {
      await axios.post(`${API}/reactive`, newJob)
      setNewJob({ title: '', location: '', priority: 'Normal' })
      setShowAdd(false)
      await fetchJobs()
      toast.success('Reactive job added!')
    } catch {
      toast.error('Failed to add job')
    }
  }

  const statuses = ['All', 'Pending', 'In Progress', 'Completed']

  // Show: every Pending job (anyone can pick one up) + jobs assigned to this engineer
  const myJobs = jobs.filter(j =>
    j.status === 'Pending' || j.engineer_id === engineer?.id
  )
  const onHoldJobs = myJobs.filter(j => j.status === 'On Hold')
  const filtered = filter === 'All'
    ? myJobs.filter(j => j.status !== 'On Hold')
    : myJobs.filter(j => j.status === filter)

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Reactive Jobs ⚡</h1>
          <p className="text-xs text-gray-400 mt-0.5">Showing your jobs &amp; all unassigned pending jobs</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`btn btn-sm ${filter === s ? 'btn-black' : 'btn-ghost'}`}>
              {s}
            </button>
          ))}
          <button onClick={() => setShowAdd(true)} className="btn-orange btn-sm">+ Add</button>
        </div>
      </div>

      {showAdd && (
        <div className="card animate-slideDown">
          <h2 className="font-bold text-gray-900 mb-4">New Reactive Job</h2>
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
            <select
              value={newJob.priority}
              onChange={e => setNewJob(j => ({ ...j, priority: e.target.value }))}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            >
              {['Low', 'Normal', 'High', 'Critical'].map(p => <option key={p}>{p}</option>)}
            </select>
            <div className="flex gap-2">
              <button type="submit" className="btn-orange btn-sm">Add Job</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Main Job List */}
      <div className="grid gap-4">
        {filtered.map(job => (
          <div
            key={job.id}
            className="card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setDetail(job)}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                  <h3 className="font-bold text-gray-900">{job.title}</h3>
                  <div className="flex gap-2">
                    <span className={PRIORITY_BADGE[job.priority] || 'badge-gray'}>{job.priority}</span>
                    <span className={STATUS_BADGE[job.status] || 'badge-gray'}>{job.status}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                  <span>📍 {job.location}</span>
                  <span>📅 {format(new Date(job.reported_at), 'dd MMM HH:mm')}</span>
                  {job.engineer_name && <span>👷 {job.engineer_name}</span>}
                </div>
                {job.notes && (
                  <div className="mt-2 flex items-start gap-1">
                    <p className="text-sm text-gray-500 italic flex-1">📝 {job.notes.slice(0, 80)}{job.notes.length > 80 ? '…' : ''}</p>
                    {job.notes_edited_at && (
                      <span className="text-xs text-gray-400 flex-shrink-0">(edited)</span>
                    )}
                    {job.engineer_id === engineer?.id && (
                      <button
                        onClick={e => { e.stopPropagation(); setEditNotesJob(job); setEditNotesText(job.notes || '') }}
                        className="text-xs text-orange-500 hover:text-orange-700 flex-shrink-0 ml-1 font-medium"
                        title="Edit notes"
                      >
                        ✏️ Edit
                      </button>
                    )}
                  </div>
                )}
                {!job.notes && job.engineer_id === engineer?.id && job.status !== 'Pending' && (
                  <button
                    onClick={e => { e.stopPropagation(); setEditNotesJob(job); setEditNotesText('') }}
                    className="mt-2 text-xs text-orange-500 hover:text-orange-700 font-medium"
                  >
                    ✏️ Add notes
                  </button>
                )}
              </div>
              <div className="flex gap-2 sm:flex-col" onClick={e => e.stopPropagation()}>
                {job.status === 'Pending' && (
                  <button onClick={() => setModal({ job, action: 'start' })} className="btn-orange btn-sm">▶ Start</button>
                )}
                {job.status === 'In Progress' && (
                  <>
                    <button onClick={() => setModal({ job, action: 'finish' })} className="btn-black btn-sm whitespace-nowrap">✅ Complete</button>
                    <button
                      onClick={() => { setHoldModal(job); setHoldNote('') }}
                      className="btn btn-sm whitespace-nowrap border border-yellow-400 text-yellow-700 bg-yellow-50 hover:bg-yellow-100"
                    >
                      ⏸ On Hold
                    </button>
                  </>
                )}
                {job.ticked && job.status === 'Completed' && <span className="text-xl">✅</span>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card text-center py-16 text-gray-400">
            <span className="text-5xl block mb-3">⚡</span>
            No reactive jobs found
          </div>
        )}
      </div>

      {/* On Hold Section */}
      {onHoldJobs.length > 0 && (
        <div className="mt-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⏸</span>
            <h2 className="text-lg font-bold text-gray-700">On Hold</h2>
            <span className="badge badge-yellow text-xs">{onHoldJobs.length}</span>
          </div>
          <div className="grid gap-3">
            {onHoldJobs.map(job => (
              <div
                key={job.id}
                className="card border-l-4 border-yellow-400 bg-yellow-50/40 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetail(job)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{job.title}</h3>
                      <div className="flex gap-2">
                        <span className={PRIORITY_BADGE[job.priority] || 'badge-gray'}>{job.priority}</span>
                        <span className="badge badge-yellow">On Hold</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-1">
                      <span>📍 {job.location}</span>
                      {job.engineer_name && <span>👷 {job.engineer_name}</span>}
                      {job.on_hold_at && (
                        <span>🕒 {formatDistanceToNow(new Date(job.on_hold_at), { addSuffix: true })}</span>
                      )}
                    </div>
                    {job.on_hold_note && (
                      <div className="mt-2 bg-yellow-100 border border-yellow-200 rounded-xl px-3 py-2">
                        <p className="text-xs font-semibold text-yellow-800 mb-0.5">Hold Reason</p>
                        <p className="text-sm text-yellow-900">{job.on_hold_note}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 sm:flex-col" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleResume(job)}
                      className="btn-orange btn-sm whitespace-nowrap"
                    >
                      ▶ Resume
                    </button>
                    <button
                      onClick={() => setModal({ job, action: 'finish' })}
                      className="btn-black btn-sm whitespace-nowrap"
                    >
                      ✅ Complete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* On Hold Modal */}
      {holdModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setHoldModal(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slideDown">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">⏸ Place Job On Hold</h2>
              <p className="text-gray-600 mt-1 font-medium">{holdModal.title}</p>
              <p className="text-sm text-gray-400">{holdModal.location}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                autoFocus
                value={holdNote}
                onChange={e => setHoldNote(e.target.value)}
                placeholder="Explain why this job is being placed on hold…"
                rows={4}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 resize-none"
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setHoldModal(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={handleHold}
                className="flex-1 px-4 py-2 rounded-2xl font-semibold text-sm bg-yellow-400 hover:bg-yellow-500 text-yellow-900 transition-colors"
              >
                ⏸ Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notes Modal */}
      {editNotesJob && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setEditNotesJob(null)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slideDown">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">✏️ Edit Notes</h2>
              <p className="text-gray-600 mt-1 font-medium">{editNotesJob.title}</p>
            </div>
            <div className="p-6">
              <textarea
                autoFocus
                value={editNotesText}
                onChange={e => setEditNotesText(e.target.value)}
                rows={5}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
              />
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setEditNotesJob(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleEditNotes} className="btn-orange flex-1">Save Notes</button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <JobModal
          job={modal.job}
          actionLabel={modal.action === 'start' ? 'Start Job' : 'Complete Job'}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
        />
      )}

      {detail && (
        <DetailModal item={detail} type="reactive" onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
