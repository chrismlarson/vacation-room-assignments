'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const BED_TYPES = ['King', 'Queen', 'Full', 'Twin', 'Sofa Bed', 'Bunk']

interface Bed { id: string; type: string; label?: string | null; order: number }
interface Room { id: string; name: string; order: number; beds: Bed[] }
interface Trip { id: string; name: string; rooms: Room[] }

export default function SetupPage() {
  const { id } = useParams<{ id: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

  // Room form
  const [newRoomName, setNewRoomName] = useState('')
  const [addingRoom, setAddingRoom] = useState(false)

  // Bed form per room
  const [bedForms, setBedForms] = useState<Record<string, { type: string; label: string; open: boolean }>>({})

  // Rename room
  const [editingRoom, setEditingRoom] = useState<string | null>(null)
  const [editRoomName, setEditRoomName] = useState('')

  const fetchTrip = useCallback(async () => {
    const res = await fetch(`/api/trips/${id}`)
    if (res.ok) {
      const data = await res.json()
      setTrip(data)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchTrip() }, [fetchTrip])

  function getBedForm(roomId: string) {
    return bedForms[roomId] ?? { type: 'King', label: '', open: false }
  }

  function updateBedForm(roomId: string, patch: Partial<{ type: string; label: string; open: boolean }>) {
    setBedForms((prev) => ({
      ...prev,
      [roomId]: { ...getBedForm(roomId), ...patch },
    }))
  }

  async function handleAddRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoomName.trim()) return
    setAddingRoom(true)
    const res = await fetch(`/api/trips/${id}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoomName.trim() }),
    })
    if (res.ok) {
      setNewRoomName('')
      await fetchTrip()
    }
    setAddingRoom(false)
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Delete this room and all its beds?')) return
    await fetch(`/api/trips/${id}/rooms/${roomId}`, { method: 'DELETE' })
    await fetchTrip()
  }

  async function handleRenameRoom(roomId: string) {
    if (!editRoomName.trim()) return
    await fetch(`/api/trips/${id}/rooms/${roomId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editRoomName.trim() }),
    })
    setEditingRoom(null)
    await fetchTrip()
  }

  async function handleAddBed(e: React.FormEvent, roomId: string) {
    e.preventDefault()
    const form = getBedForm(roomId)
    const res = await fetch(`/api/trips/${id}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, type: form.type, label: form.label.trim() || null }),
    })
    if (res.ok) {
      updateBedForm(roomId, { label: '', open: false })
      await fetchTrip()
    }
  }

  async function handleDeleteBed(bedId: string) {
    await fetch(`/api/trips/${id}/beds/${bedId}`, { method: 'DELETE' })
    await fetchTrip()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-500">Trip not found.</p>
        <Link href="/" className="text-blue-600 hover:underline">Back to trips</Link>
      </div>
    )
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/trips/${id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to planner
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Room Setup</h1>
          <p className="text-sm text-gray-500">{trip.name}</p>
        </div>
      </div>

      {/* Room list */}
      <div className="space-y-6 mb-8">
        {trip.rooms.length === 0 && (
          <p className="text-gray-400 text-sm italic">No rooms yet. Add one below.</p>
        )}

        {trip.rooms.map((room) => {
          const bedForm = getBedForm(room.id)
          const isEditing = editingRoom === room.id

          return (
            <div key={room.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Room header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                {isEditing ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRenameRoom(room.id) }}
                    className="flex gap-2 flex-1"
                  >
                    <input
                      autoFocus
                      value={editRoomName}
                      onChange={(e) => setEditRoomName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                      onKeyDown={(e) => e.key === 'Escape' && setEditingRoom(null)}
                    />
                    <button
                      type="submit"
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoom(null)}
                      className="text-sm text-gray-400 hover:text-gray-600 px-2"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="font-semibold text-gray-900">{room.name}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingRoom(room.id); setEditRoomName(room.name) }}
                        className="text-xs text-gray-400 hover:text-blue-500"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Beds */}
              <div className="p-4">
                {room.beds.length === 0 ? (
                  <p className="text-sm text-gray-400 italic mb-3">No beds yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {room.beds.map((bed) => (
                      <div
                        key={bed.id}
                        className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-3 py-1.5 text-sm"
                      >
                        <span className="font-medium text-gray-800">
                          {bed.label ? `${bed.label} (${bed.type})` : bed.type}
                        </span>
                        <button
                          onClick={() => handleDeleteBed(bed.id)}
                          className="text-gray-300 hover:text-red-400 text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add bed */}
                {bedForm.open ? (
                  <form onSubmit={(e) => handleAddBed(e, room.id)} className="flex items-center gap-2 flex-wrap">
                    <select
                      value={bedForm.type}
                      onChange={(e) => updateBedForm(room.id, { type: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      {BED_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      value={bedForm.label}
                      onChange={(e) => updateBedForm(room.id, { label: e.target.value })}
                      placeholder="Label (optional)"
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-40"
                    />
                    <button
                      type="submit"
                      className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Add Bed
                    </button>
                    <button
                      type="button"
                      onClick={() => updateBedForm(room.id, { open: false })}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => updateBedForm(room.id, { open: true })}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    + Add bed
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add room form */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Room</h2>
        <form onSubmit={handleAddRoom} className="flex gap-2">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name (e.g. Master Bedroom)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={addingRoom || !newRoomName.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Add Room
          </button>
        </form>
      </div>
    </main>
  )
}
