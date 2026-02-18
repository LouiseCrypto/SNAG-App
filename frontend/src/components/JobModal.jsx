import React, { useState } from 'react'

export default function JobModal({ job, onConfirm, onCancel, actionLabel = 'Start Job', color = 'orange' }) {
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-slideDown">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">{actionLabel}</h2>
          <p className="text-gray-600 mt-1 font-medium">{job.title}</p>
          <p className="text-sm text-gray-400">{job.location}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this job…"
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-4 cursor-pointer hover:border-orange-400 transition-colors">
              {preview ? (
                <img src={preview} alt="preview" className="max-h-32 rounded-xl object-cover" />
              ) : (
                <>
                  <span className="text-3xl mb-1">📷</span>
                  <span className="text-sm text-gray-500">Tap to add a photo</span>
                </>
              )}
              <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
            </label>
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={() => onConfirm(notes, photo)}
            className="btn-orange flex-1"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
