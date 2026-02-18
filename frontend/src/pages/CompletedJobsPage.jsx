import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import DetailModal from '../components/DetailModal'

const API = 'https://snag-backend.onrender.com'

export default function CompletedJobsPage() {
  const [ppm, setPpm] = useState([])
  const [reactive, setReactive] = useState([])
  const [tab, setTab] = useState('ppm')
  const [detail, setDetail] = useState(null)
  const [detailType, setDetailType] = useState('ppm')

  useEffect(() => {
    axios.get(`${API}/ppm`).then(r => setPpm(r.data.filter(j => j.status === 'Completed'))).catch(() => {})
    axios.get(`${API}/reactive`).then(r => setReactive(r.data.filter(j => j.status === 'Completed'))).catch(() => {})
  }, [])

  const jobs = tab === 'ppm' ? ppm : reactive

  const openDetail = (job) => {
    setDetailType(tab)
    setDetail(job)
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <h1 className="text-3xl font-black text-gray-900">Completed Jobs ✅</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('ppm')} className={`btn btn-sm ${tab === 'ppm' ? 'btn-black' : 'btn-ghost'}`}>
          PPM ({ppm.length})
        </button>
        <button onClick={() => setTab('reactive')} className={`btn btn-sm ${tab === 'reactive' ? 'btn-black' : 'btn-ghost'}`}>
          Reactive ({reactive.length})
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-left">
              <th className="pb-3 pr-3 font-semibold w-8">#</th>
              <th className="pb-3 pr-3 font-semibold">Job Title</th>
              <th className="pb-3 pr-3 font-semibold">Location</th>
              <th className="pb-3 pr-3 font-semibold">Engineer</th>
              <th className="pb-3 pr-3 font-semibold">Completed</th>
              <th className="pb-3 pr-3 font-semibold">Notes</th>
              <th className="pb-3 font-semibold text-center">Done</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {jobs.map((job, i) => (
              <tr
                key={job.id}
                onClick={() => openDetail(job)}
                className="hover:bg-orange-50 transition-colors cursor-pointer"
              >
                <td className="py-3 pr-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                <td className="py-3 pr-3 font-medium text-gray-900">{job.title}</td>
                <td className="py-3 pr-3 text-gray-600">{job.location}</td>
                <td className="py-3 pr-3 text-gray-600">{job.engineer_name || '—'}</td>
                <td className="py-3 pr-3 text-gray-500 whitespace-nowrap">
                  {job.completed_at ? format(new Date(job.completed_at), 'dd MMM HH:mm') : '—'}
                </td>
                <td className="py-3 pr-3 text-gray-500 max-w-[200px] truncate">{job.notes || '—'}</td>
                <td className="py-3 text-center">
                  <span className="text-green-500 text-lg">✅</span>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <span className="text-4xl block mb-2">📋</span>
                  No completed jobs yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <DetailModal item={detail} type={detailType} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}
