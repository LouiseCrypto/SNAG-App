import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns'

const API = import.meta.env.VITE_API_URL

export default function CalendarPage() {
  const { engineer } = useAuth()
  const [events, setEvents] = useState([])
  const [notes, setNotes] = useState([])
  const [current, setCurrent] = useState(new Date())
  const [selected, setSelected] = useState(null)
  const [newNote, setNewNote] = useState('')
  const noteInputRef = useRef(null)

  const fetchNotes = () =>
    axios.get(`${API}/calendar-notes`).then(r => setNotes(r.data)).catch(() => {})

  useEffect(() => {
    axios.get(`${API}/calendar`).then(r => setEvents(r.data)).catch(() => {})
    fetchNotes()
  }, [])

  // Focus note input when a day is selected
  useEffect(() => {
    if (selected && noteInputRef.current) {
      setTimeout(() => noteInputRef.current?.focus(), 50)
    }
  }, [selected])

  const days = eachDayOfInterval({
    start: startOfMonth(current),
    end: endOfMonth(current),
  })

  const eventsOnDay = (day) =>
    events.filter(e => e.date === format(day, 'yyyy-MM-dd'))

  const notesOnDay = (day) =>
    notes.filter(n => n.date === format(day, 'yyyy-MM-dd'))

  const selectedEvents = selected ? eventsOnDay(selected) : []
  const selectedNotes = selected ? notesOnDay(selected) : []

  const prev = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const next = () => setCurrent(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const startDay = startOfMonth(current).getDay()
  const paddingDays = Array(startDay).fill(null)

  const addNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim() || !selected) return
    try {
      await axios.post(`${API}/calendar-notes`, {
        date: format(selected, 'yyyy-MM-dd'),
        note: newNote.trim(),
        engineer_id: engineer.id,
      })
      setNewNote('')
      await fetchNotes()
      toast.success('Note added!')
    } catch {
      toast.error('Failed to add note')
    }
  }

  const deleteNote = async (noteId) => {
    try {
      await axios.delete(`${API}/calendar-notes/${noteId}`)
      await fetchNotes()
    } catch {
      toast.error('Failed to delete note')
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <h1 className="text-3xl font-black text-gray-900">Calendar 📅</h1>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <div className="card lg:col-span-2">
          {/* Nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prev} className="btn-ghost btn-sm">◀</button>
            <h2 className="text-lg font-bold text-gray-900">
              {format(current, 'MMMM yyyy')}
            </h2>
            <button onClick={next} className="btn-ghost btn-sm">▶</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const dayEvents = eventsOnDay(day)
              const dayNotes = notesOnDay(day)
              const hasPPM = dayEvents.some(e => e.type === 'ppm')
              const hasReactive = dayEvents.some(e => e.type === 'reactive')
              const hasNotes = dayNotes.length > 0
              const isSelected = selected && isSameDay(day, selected)
              const today = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => {
                    setSelected(isSelected ? null : day)
                    setNewNote('')
                  }}
                  className={`
                    relative flex flex-col items-center p-1 rounded-xl min-h-[52px] text-sm font-medium
                    transition-all duration-150 active:scale-95
                    ${isSelected ? 'ring-2 ring-orange-500 bg-orange-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm
                    ${today ? 'bg-orange-500 text-white font-black' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  {/* Dots */}
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {hasPPM && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                    {hasReactive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {hasNotes && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> PPM Jobs
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Reactive Jobs
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400" /> Notes
            </div>
          </div>
        </div>

        {/* Day Detail Panel */}
        <div className="card flex flex-col gap-4">
          {selected ? (
            <>
              <h3 className="font-bold text-gray-900">{format(selected, 'EEEE, d MMMM')}</h3>

              {/* Add Note */}
              <form onSubmit={addNote} className="flex gap-2">
                <input
                  ref={noteInputRef}
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="e.g. Holiday, Morning Shift…"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim()}
                  className="btn-orange btn-sm px-3 disabled:opacity-40"
                >
                  +
                </button>
              </form>

              {/* Custom Notes */}
              {selectedNotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</p>
                  {selectedNotes.map(n => (
                    <div key={n.id} className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2">
                      <div
                        className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: n.engineer_color }}
                      >
                        {n.engineer_name?.[0]}
                      </div>
                      <span className="flex-1 text-sm text-gray-800">{n.note}</span>
                      <button
                        onClick={() => deleteNote(n.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Job Events */}
              {selectedEvents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Jobs</p>
                  {selectedEvents.map((e, i) => (
                    <div key={i} className={`p-3 rounded-2xl ${e.type === 'ppm' ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge ${e.type === 'ppm' ? 'badge-red' : 'badge-blue'}`}>{e.type.toUpperCase()}</span>
                        <span className={`badge ${e.status === 'Completed' ? 'badge-green' : 'badge-gray'}`}>{e.status}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{e.title}</p>
                    </div>
                  ))}
                </div>
              )}

              {selectedNotes.length === 0 && selectedEvents.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Nothing yet — add a note above!
                </p>
              )}
            </>
          ) : (
            <div className="text-center py-10 text-gray-400 flex-1 flex flex-col items-center justify-center">
              <span className="text-4xl block mb-2">📅</span>
              <p className="text-sm">Click any day to add notes or view jobs</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
