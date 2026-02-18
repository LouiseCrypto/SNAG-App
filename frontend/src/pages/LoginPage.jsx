import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'

const API = '/api'
const SECRET = '1234'

export default function LoginPage() {
  const { login, engineer } = useAuth()
  const navigate = useNavigate()
  const [showPicker, setShowPicker] = useState(false)
  const [engineers, setEngineers] = useState([])
  const [handover, setHandover] = useState([])
  const [loading, setLoading] = useState(false)
  // Password step
  const [pendingEng, setPendingEng] = useState(null)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState(false)

  useEffect(() => {
    if (engineer) navigate('/app')
  }, [engineer])

  useEffect(() => {
    axios.get(`${API}/engineers`).then(r => setEngineers(r.data)).catch(() => {})
    axios.get(`${API}/handover`).then(r => setHandover(r.data)).catch(() => {})
  }, [])

  // Step 1: pick a name → show password screen
  const handleSelect = (eng) => {
    setPendingEng(eng)
    setPassword('')
    setPwError(false)
  }

  // Step 2: submit password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    if (password !== SECRET) {
      setPwError(true)
      setPassword('')
      return
    }
    setLoading(true)
    try {
      const res = await axios.get(`${API}/engineers/${pendingEng.id}`)
      login(res.data)
      navigate('/app')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fadeIn">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-200 animate-pulse2">
            <span className="text-white font-black text-4xl">S</span>
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tighter text-gray-900">SNAG</h1>
            <p className="text-gray-500 font-medium mt-1 text-lg">Engineering Hub</p>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={() => setShowPicker(true)}
          className="btn-orange text-lg px-10 py-4 rounded-3xl shadow-xl shadow-orange-200 text-white font-bold
                     hover:scale-105 active:scale-95 transition-transform duration-150"
        >
          🔑 Login
        </button>

        {/* Stats row */}
        <div className="mt-10 flex gap-6 flex-wrap justify-center">
          {[
            { label: 'Engineers', value: '8', icon: '👷' },
            { label: 'Active Today', value: engineers.filter(e => e.is_on_shift).length, icon: '🟢' },
            { label: 'Latest Handover', value: handover.length ? '1 post' : 'None', icon: '📢' },
          ].map(stat => (
            <div key={stat.label} className="card px-6 py-4 flex flex-col items-center min-w-[110px]">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-2xl font-black text-gray-900">{stat.value}</span>
              <span className="text-xs text-gray-500 font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Read-Only Handover Feed ────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200 px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">📢</span>
            <h2 className="text-xl font-bold text-gray-900">Latest Shift Handover</h2>
            <span className="badge-gray ml-auto">Read-only</span>
          </div>

          {handover.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <span className="text-4xl block mb-2">📭</span>
              No handover notes yet.
            </div>
          ) : (
            <div className="space-y-4">
              {handover.slice(0, 5).map(post => (
                <div key={post.id} className="card p-4 animate-fadeIn">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-sm shadow"
                      style={{ backgroundColor: post.engineer_color }}
                    >
                      {post.engineer_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm">{post.engineer_name}</span>
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{post.content}</p>
                      {/* Reactions summary */}
                      {Object.keys(post.reactions || {}).length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {Object.entries(post.reactions).map(([emoji, count]) => (
                            <span key={emoji} className="badge-gray text-sm px-2 py-0.5">
                              {emoji} {count}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Replies preview */}
                      {post.replies?.length > 0 && (
                        <div className="mt-2 pl-3 border-l-2 border-orange-200 space-y-1">
                          {post.replies.slice(0, 2).map(r => (
                            <p key={r.id} className="text-xs text-gray-600">
                              <span className="font-semibold">{r.engineer_name}:</span> {r.content}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Name Picker Modal ─────────────────────────────────────── */}
      {showPicker && !pendingEng && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowPicker(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm animate-slideDown">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900">Who are you?</h2>
              <p className="text-gray-500 text-sm mt-1">Select your name to continue</p>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {engineers.map(eng => (
                <button
                  key={eng.id}
                  onClick={() => handleSelect(eng)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-transparent
                             hover:border-orange-300 hover:bg-orange-50 active:scale-95
                             transition-all duration-150 cursor-pointer group"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md
                               group-hover:scale-110 transition-transform duration-150"
                    style={{ backgroundColor: eng.avatar_color }}
                  >
                    {eng.name[0]}
                  </div>
                  <span className="font-semibold text-gray-900 text-sm">{eng.name}</span>
                  {eng.is_on_shift && (
                    <span className="badge-green text-xs">On Shift</span>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button onClick={() => setShowPicker(false)} className="btn-ghost w-full btn-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Password Modal ────────────────────────────────────────── */}
      {pendingEng && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xs animate-slideDown">
            <div className="p-6 flex flex-col items-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg"
                style={{ backgroundColor: pendingEng.avatar_color }}
              >
                {pendingEng.name[0]}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-black text-gray-900">Hi, {pendingEng.name}!</h2>
                <p className="text-gray-500 text-sm mt-1">Enter your password to continue</p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="w-full space-y-3">
                <input
                  autoFocus
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPwError(false) }}
                  placeholder="Password"
                  className={`w-full border-2 rounded-2xl px-4 py-3 text-center text-lg tracking-widest font-bold
                    focus:outline-none transition-colors
                    ${pwError ? 'border-red-400 bg-red-50 text-red-600 animate-squish' : 'border-gray-200 focus:border-orange-400'}`}
                />
                {pwError && (
                  <p className="text-red-500 text-sm text-center font-medium animate-fadeIn">
                    ❌ Wrong password, try again
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="btn-orange w-full disabled:opacity-50"
                >
                  {loading ? 'Logging in…' : '🔓 Enter'}
                </button>
                <button
                  type="button"
                  onClick={() => { setPendingEng(null); setPwError(false) }}
                  className="btn-ghost w-full btn-sm"
                >
                  ← Back
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
