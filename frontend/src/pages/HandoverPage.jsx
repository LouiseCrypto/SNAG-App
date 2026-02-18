import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'

const API = import.meta.env.VITE_API_URL
const EMOJIS = ['👍', '❤️', '😂', '😮', '🔥', '✅']

export default function HandoverPage() {
  const { engineer } = useAuth()
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState('')
  const [replyMap, setReplyMap] = useState({})
  const [openReply, setOpenReply] = useState(null)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const fetchPosts = () =>
    axios.get(`${API}/handover`).then(r => setPosts(r.data)).catch(() => {})

  useEffect(() => { fetchPosts() }, [])

  const submitPost = async () => {
    if (!newPost.trim()) return
    setLoading(true)
    try {
      await axios.post(`${API}/handover`, { content: newPost, engineer_id: engineer.id })
      setNewPost('')
      await fetchPosts()
      toast.success('Posted!')
    } catch {
      toast.error('Failed to post')
    } finally {
      setLoading(false)
    }
  }

  const submitReply = async (postId) => {
    const content = replyMap[postId]?.trim()
    if (!content) return
    try {
      await axios.post(`${API}/handover/${postId}/reply`, { content, engineer_id: engineer.id })
      setReplyMap(m => ({ ...m, [postId]: '' }))
      setOpenReply(null)
      await fetchPosts()
      toast.success('Reply added!')
    } catch {
      toast.error('Failed to reply')
    }
  }

  const react = async (postId, emoji) => {
    try {
      await axios.post(`${API}/handover/${postId}/react`, { emoji, engineer_id: engineer.id })
      await fetchPosts()
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fadeIn">
      <h1 className="text-3xl font-black text-gray-900">Handover Feed 📢</h1>

      {/* Compose */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold shadow"
            style={{ backgroundColor: engineer?.avatar_color }}
          >
            {engineer?.name?.[0]}
          </div>
          <div className="flex-1">
            <textarea
              value={newPost}
              onChange={e => setNewPost(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.metaKey && submitPost()}
              placeholder="Share a shift update with the team…"
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none transition-colors"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">⌘ + Enter to post</span>
              <button
                onClick={submitPost}
                disabled={loading || !newPost.trim()}
                className="btn-orange btn-sm disabled:opacity-50"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <span className="text-5xl block mb-3">📭</span>
          No posts yet. Be the first!
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="card animate-fadeIn">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold shadow"
                style={{ backgroundColor: post.engineer_color }}
              >
                {post.engineer_name?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{post.engineer_name}</span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            </div>

            {/* Emoji reactions */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {EMOJIS.map(emoji => {
                const count = post.reactions?.[emoji] || 0
                return (
                  <button
                    key={emoji}
                    onClick={() => react(post.id, emoji)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all duration-150 active:scale-95
                      ${count > 0 ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
                  >
                    {emoji} {count > 0 && <span className="font-semibold">{count}</span>}
                  </button>
                )
              })}
            </div>

            {/* Replies */}
            {post.replies?.length > 0 && (
              <div className="mt-4 pl-4 border-l-2 border-orange-100 space-y-3">
                {post.replies.map(r => (
                  <div key={r.id} className="flex items-start gap-2">
                    <div
                      className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow"
                      style={{ backgroundColor: r.engineer_color }}
                    >
                      {r.engineer_name?.[0]}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{r.engineer_name} </span>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                      <p className="text-sm text-gray-700 mt-0.5">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            <div className="mt-3">
              {openReply === post.id ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={replyMap[post.id] || ''}
                    onChange={e => setReplyMap(m => ({ ...m, [post.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && submitReply(post.id)}
                    placeholder="Write a reply…"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                  />
                  <button onClick={() => submitReply(post.id)} className="btn-orange btn-sm">Send</button>
                  <button onClick={() => setOpenReply(null)} className="btn-ghost btn-sm">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setOpenReply(post.id)}
                  className="text-sm text-gray-400 hover:text-orange-500 transition-colors font-medium"
                >
                  ↩ Reply
                </button>
              )}
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
