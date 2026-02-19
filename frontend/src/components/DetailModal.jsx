import React from 'react'
import { format } from 'date-fns'

const API = 'https://snag-backend.onrender.com'

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-32 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 flex-1">{value}</span>
    </div>
  )
}

function fmtDate(d) {
  if (!d) return null
  try { return format(new Date(d), 'dd MMM yyyy, HH:mm') } catch { return d }
}

export default function DetailModal({ item, type, onClose }) {
  if (!item) return null

  const isJob = type === 'ppm' || type === 'reactive'
  const isContractor = type === 'contractor'

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-slideDown max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              {/* Type badge */}
              {type === 'ppm' && <span className="badge badge-red">PPM</span>}
              {type === 'reactive' && <span className="badge badge-blue">Reactive</span>}
              {type === 'contractor' && <span className="badge badge-orange">Contractor</span>}

              {/* Status badge */}
              {item.status && (
                <span className={`badge ${
                  item.status === 'Completed' || item.status === 'Resolved' ? 'badge-green' :
                  item.status === 'In Progress' ? 'badge-orange' :
                  item.status === 'On Hold' ? 'badge-yellow' : 'badge-gray'
                }`}>{item.status}</span>
              )}

              {/* Priority badge (reactive) */}
              {item.priority && (
                <span className={`badge ${
                  item.priority === 'Critical' ? 'badge-red' :
                  item.priority === 'High' ? 'badge-orange' :
                  item.priority === 'Low' ? 'badge-blue' : 'badge-gray'
                }`}>{item.priority}</span>
              )}

              {/* Severity badge (contractor) */}
              {item.severity && (
                <span className={`badge ${
                  item.severity === 'High' ? 'badge-red' :
                  item.severity === 'Medium' ? 'badge-orange' : 'badge-blue'
                }`}>{item.severity}</span>
              )}
            </div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              {item.title || item.contractor_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none font-light flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Job fields */}
          {isJob && (
            <div>
              {/* ── Completed By Banner ── */}
              {item.status === 'Completed' && item.engineer_name && (
                <div className="mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: item.engineer_color || '#10B981' }}
                  >
                    {item.engineer_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Completed by</p>
                    <p className="font-bold text-gray-900">{item.engineer_name}</p>
                    {item.completed_at && (
                      <p className="text-xs text-gray-500">{fmtDate(item.completed_at)}</p>
                    )}
                  </div>
                  <span className="text-2xl flex-shrink-0">✅</span>
                </div>
              )}

              {/* ── On Hold Banner ── */}
              {item.status === 'On Hold' && (
                <div className="mb-4 bg-yellow-50 border border-yellow-300 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">⏸</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">On Hold</p>
                      {item.on_hold_at && <p className="text-xs text-gray-500">{fmtDate(item.on_hold_at)}</p>}
                    </div>
                    {item.engineer_name && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
                          style={{ backgroundColor: item.engineer_color || '#F59E0B' }}
                        >
                          {item.engineer_name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{item.engineer_name}</span>
                      </div>
                    )}
                  </div>
                  {item.on_hold_note && (
                    <p className="text-sm text-yellow-900 bg-yellow-100 rounded-xl px-3 py-2 leading-relaxed">
                      {item.on_hold_note}
                    </p>
                  )}
                </div>
              )}

              <Row label="Location"  value={item.location} />
              <Row label="Scheduled" value={fmtDate(item.scheduled_date)} />
              <Row label="Reported"  value={fmtDate(item.reported_at)} />
              <Row label="Started"   value={fmtDate(item.started_at)} />
              {item.status !== 'Completed' && (
                <Row label="Completed" value={fmtDate(item.completed_at)} />
              )}
              {item.status !== 'Completed' && item.status !== 'On Hold' && (
                <Row label="Engineer" value={item.engineer_name} />
              )}

              {item.notes && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</p>
                    {item.notes_edited_at && (
                      <span className="text-xs text-gray-400 italic">· edited {fmtDate(item.notes_edited_at)}</span>
                    )}
                  </div>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {item.notes}
                  </div>
                </div>
              )}
              {item.photo_path && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Photo</p>
                  <img
                    src={`${API}${item.photo_path}`}
                    alt="Job photo"
                    className="rounded-2xl w-full object-cover max-h-64"
                  />
                </div>
              )}
            </div>
          )}

          {/* Contractor fields */}
          {isContractor && (
            <div>
              <Row label="Reported By" value={item.reported_by?.name || item.reported_by_name} />
              <Row label="Date"        value={fmtDate(item.reported_at)} />
              <Row label="Resolved"    value={item.resolved ? 'Yes' : 'No'} />
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Full Issue Description</p>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {item.issue_description}
                </div>
              </div>
              {item.notes && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Additional Notes</p>
                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {item.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="btn-ghost w-full btn-sm">Close</button>
        </div>
      </div>
    </div>
  )
}
