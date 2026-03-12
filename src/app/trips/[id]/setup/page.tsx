'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { parseRoomsText } from '@/lib/parse-rooms-text'
import type { ScrapedRoom } from '@/lib/scrape-vrbo'

const BED_TYPES = ['King', 'Queen', 'Full', 'Twin', 'Sofa Bed', 'Bunk']

const BED_ORDER: Record<string, number> = {
  King: 0, Queen: 1, Full: 2, Twin: 3, 'Sofa Bed': 4, Bunk: 5,
}
const BED_SIZE: Record<string, string> = {
  King:       'px-4 py-2 text-sm',
  Queen:      'px-3.5 py-1.5 text-sm',
  Full:       'px-3 py-1.5 text-xs',
  Twin:       'px-2.5 py-1 text-xs',
  'Sofa Bed': 'px-3 py-1.5 text-xs',
  Bunk:       'px-2.5 py-1 text-xs',
}

interface Bed { id: string; type: string; label?: string | null; order: number }
interface Room { id: string; name: string; order: number; beds: Bed[] }
interface Trip { id: string; name: string; listingUrl?: string | null; rooms: Room[] }

export default function SetupPage() {
  const { id } = useParams<{ id: string }>()
  const searchParams = useSearchParams()
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

  // Paste import
  const [pasteText, setPasteText] = useState('')
  const [pasteOpen, setPasteOpen] = useState(false)
  const [parsedPreview, setParsedPreview] = useState<ScrapedRoom[]>([])
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(
    searchParams.get('importFailed') ? { type: 'error', message: 'Auto-import failed — paste your room list below to import manually.' } : null
  )

  const fetchTrip = useCallback(async () => {
    const res = await apiFetch(`/api/trips/${id}`)
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
    const res = await apiFetch(`/api/trips/${id}/rooms`, {
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
    await apiFetch(`/api/trips/${id}/rooms/${roomId}`, { method: 'DELETE' })
    await fetchTrip()
  }

  async function handleRenameRoom(roomId: string) {
    if (!editRoomName.trim()) return
    await apiFetch(`/api/trips/${id}/rooms/${roomId}`, {
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
    const res = await apiFetch(`/api/trips/${id}/beds`, {
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
    await apiFetch(`/api/trips/${id}/beds/${bedId}`, { method: 'DELETE' })
    await fetchTrip()
  }

  function handlePasteChange(text: string) {
    setPasteText(text)
    setParsedPreview(text.trim() ? parseRoomsText(text) : [])
  }

  async function handlePasteImport() {
    if (!parsedPreview.length) return
    const hasRooms = trip!.rooms.length > 0
    if (hasRooms && !confirm('This will delete all existing rooms and re-import from your pasted text. Continue?')) return
    setImporting(true)
    const res = await apiFetch(`/api/trips/${id}/rooms/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rooms: parsedPreview, clearExisting: hasRooms }),
    })
    const data = await res.json()
    if (data.success) {
      setImportStatus({ type: 'success', message: `Imported ${data.roomsCreated} rooms.` })
      setPasteText('')
      setParsedPreview([])
      setPasteOpen(false)
      await fetchTrip()
    } else {
      setImportStatus({ type: 'error', message: `Import failed: ${data.error}` })
    }
    setImporting(false)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-gray-500">Loading...</div>
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-400">Trip not found.</p>
        <Link href="/" className="text-blue-600 hover:underline">Back to trips</Link>
      </div>
    )
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/trips/${id}`}
            className="text-sm text-gray-400 hover:text-gray-300"
          >
            ← Back to planner
          </Link>
          <h1 className="text-2xl font-bold text-gray-50 mt-1">Room Setup</h1>
          <p className="text-sm text-gray-400">{trip.name}</p>
        </div>
      </div>

      {/* Status banner */}
      {importStatus && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          importStatus.type === 'success'
            ? 'bg-green-900/40 text-green-300 border border-green-700'
            : 'bg-yellow-900/40 text-yellow-300 border border-yellow-700'
        }`}>
          {importStatus.message}
        </div>
      )}

      {/* Paste import section */}
      <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => setPasteOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-gray-100"
        >
          <span>Import rooms from listing text</span>
          <span className="text-gray-500">{pasteOpen ? '▲' : '▼'}</span>
        </button>

        {pasteOpen && (
          <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
            <p className="text-xs text-gray-500">
              On the VRBO listing page, find the &quot;Sleeping arrangements&quot; section, select and copy all the room/bed text, then paste it below.
            </p>
            <textarea
              value={pasteText}
              onChange={e => handlePasteChange(e.target.value)}
              rows={6}
              placeholder={"Bedroom 1\n1 Queen Bed\nBedroom 2\n1 King Bed and 1 Sofa Bed"}
              className="w-full border border-gray-600 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {parsedPreview.length > 0 && (
              <div className="text-xs text-gray-400 space-y-1">
                <p className="font-medium text-gray-300">Preview ({parsedPreview.length} rooms):</p>
                {parsedPreview.map((r, i) => (
                  <div key={i}>
                    <span className="text-gray-200">{r.name}</span>
                    {' — '}
                    {r.beds.map(b => b.type).join(', ')}
                  </div>
                ))}
              </div>
            )}
            {pasteText.trim() && parsedPreview.length === 0 && (
              <p className="text-xs text-yellow-500">No recognizable rooms found — check the pasted format.</p>
            )}
            <button
              onClick={handlePasteImport}
              disabled={importing || parsedPreview.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {importing ? 'Importing…' : `Import ${parsedPreview.length} room${parsedPreview.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Room list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {trip.rooms.length === 0 && (
          <p className="text-gray-500 text-sm italic">No rooms yet. Add one below.</p>
        )}

        {trip.rooms.map((room) => {
          const bedForm = getBedForm(room.id)
          const isEditing = editingRoom === room.id

          return (
            <div key={room.id} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
              {/* Room header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
                {isEditing ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRenameRoom(room.id) }}
                    className="flex gap-2 flex-1"
                  >
                    <input
                      autoFocus
                      value={editRoomName}
                      onChange={(e) => setEditRoomName(e.target.value)}
                      className="flex-1 border border-gray-600 bg-gray-800 text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                      className="text-sm text-gray-500 hover:text-gray-300 px-2"
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <h2 className="font-semibold text-gray-50">{room.name}</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingRoom(room.id); setEditRoomName(room.name) }}
                        className="text-xs text-gray-500 hover:text-blue-500"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="text-xs text-gray-500 hover:text-red-500"
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
                  <p className="text-sm text-gray-500 italic mb-3">No beds yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[...room.beds]
                      .sort((a, b) => (BED_ORDER[a.type] ?? 99) - (BED_ORDER[b.type] ?? 99))
                      .map((bed) => (
                        <div
                          key={bed.id}
                          className={`flex items-center gap-1.5 bg-gray-800 rounded-lg ${BED_SIZE[bed.type] ?? 'px-3 py-1.5 text-sm'}`}
                        >
                          <span className="font-medium text-gray-100">
                            {bed.label ? `${bed.label} (${bed.type})` : bed.type}
                          </span>
                          <button
                            onClick={() => handleDeleteBed(bed.id)}
                            className="text-gray-600 hover:text-red-400 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* Add bed */}
                {bedForm.open ? (
                  <form onSubmit={(e) => handleAddBed(e, room.id)} className="flex items-center gap-2 flex-wrap">
                    <select
                      value={bedForm.type}
                      onChange={(e) => updateBedForm(room.id, { type: e.target.value })}
                      className="border border-gray-600 bg-gray-800 text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      {BED_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <input
                      value={bedForm.label}
                      onChange={(e) => updateBedForm(room.id, { label: e.target.value })}
                      placeholder="Label (optional)"
                      className="border border-gray-600 bg-gray-800 text-gray-100 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 w-40"
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
                      className="text-sm text-gray-500 hover:text-gray-300"
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
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Add Room</h2>
        <form onSubmit={handleAddRoom} className="flex gap-2">
          <input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name (e.g. Master Bedroom)"
            className="flex-1 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
