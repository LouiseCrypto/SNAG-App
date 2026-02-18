import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const API = 'https://snag-backend.onrender.com'

export default function PartsOrderPage() {
  const { engineer } = useAuth()
  const [orders, setOrders] = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ part_name: '', part_number: '', quantity: 1, supplier: '', notes: '' })

  const fetchOrders = () =>
    axios.get(`${API}/parts`).then(r => setOrders(r.data)).catch(() => {})

  useEffect(() => { fetchOrders() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.part_name) { toast.error('Enter a part name'); return }
    try {
      await axios.post(`${API}/parts`, { ...form, ordered_by_id: engineer.id })
      setForm({ part_name: '', part_number: '', quantity: 1, supplier: '', notes: '' })
      setShowAdd(false)
      await fetchOrders()
      toast.success('Parts order added!')
    } catch {
      toast.error('Failed to add order')
    }
  }

  const toggleReceived = async (id) => {
    try {
      await axios.patch(`${API}/parts/${id}/receive`)
      await fetchOrders()
    } catch {
      toast.error('Failed to update')
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-900">Parts Orders 📦</h1>
        <button onClick={() => setShowAdd(s => !s)} className="btn-orange btn-sm">+ New Order</button>
      </div>

      {showAdd && (
        <div className="card animate-slideDown">
          <h2 className="font-bold text-gray-900 mb-4">New Parts Order</h2>
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 gap-3">
            <input
              value={form.part_name}
              onChange={e => setForm(f => ({ ...f, part_name: e.target.value }))}
              placeholder="Part name *"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
            <input
              value={form.part_number}
              onChange={e => setForm(f => ({ ...f, part_number: e.target.value }))}
              placeholder="Part number"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) }))}
              placeholder="Quantity"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
            <input
              value={form.supplier}
              onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
              placeholder="Supplier"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={2}
              className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none"
            />
            <div className="sm:col-span-2 flex gap-2">
              <button type="submit" className="btn-orange btn-sm">Add Order</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost btn-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 text-left">
              <th className="pb-3 pr-3 font-semibold">Part Name</th>
              <th className="pb-3 pr-3 font-semibold">Part #</th>
              <th className="pb-3 pr-3 font-semibold text-center">Qty</th>
              <th className="pb-3 pr-3 font-semibold">Supplier</th>
              <th className="pb-3 pr-3 font-semibold">Ordered</th>
              <th className="pb-3 pr-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold text-center">Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map(order => (
              <tr key={order.id} className={`hover:bg-orange-50 transition-colors ${order.received ? 'opacity-60' : ''}`}>
                <td className="py-3 pr-3 font-medium text-gray-900">{order.part_name}</td>
                <td className="py-3 pr-3 text-gray-500 font-mono text-xs">{order.part_number || '—'}</td>
                <td className="py-3 pr-3 text-center font-semibold">{order.quantity}</td>
                <td className="py-3 pr-3 text-gray-600">{order.supplier || '—'}</td>
                <td className="py-3 pr-3 text-gray-500 whitespace-nowrap text-xs">
                  {format(new Date(order.ordered_at), 'dd MMM HH:mm')}
                </td>
                <td className="py-3 pr-3">
                  <span className={order.received ? 'badge-green' : 'badge-orange'}>{order.status}</span>
                </td>
                <td className="py-3 text-center">
                  <button
                    onClick={() => toggleReceived(order.id)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all active:scale-90
                      ${order.received ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-orange-400'}`}
                  >
                    {order.received && '✓'}
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-400">
                  <span className="text-4xl block mb-2">📦</span>
                  No parts orders yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
