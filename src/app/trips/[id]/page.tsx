'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable } from '@dnd-kit/core'
import PersonChip, { PersonChipStatic } from '@/components/PersonChip'
import BedCard from '@/components/BedCard'

const BED_ORDER: Record<string, number> = {
  King: 0, Queen: 1, Full: 2, Twin: 3, 'Sofa Bed': 4, Bunk: 5, Floor: 6, 'Pack & Play': 7,
}

const FAMILY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4',
]

const FLOOR_TYPES = new Set(['Floor', 'Pack & Play'])

interface Family { id: string; name: string; color: string }
interface Person { id: string; name: string; familyId: string | null; family?: Family | null }
interface Assignment { id: string; personId: string; bedId: string; person: Person & { family: Family | null } }
interface Bed { id: string; type: string; label?: string | null; order: number; assignments: Assignment[] }
interface Room { id: string; name: string; order: number; beds: Bed[] }
interface Trip {
  id: string
  name: string
  listingUrl?: string | null
  totalCost?: number | null
  costMode?: string | null
  families: Family[]
  people: Person[]
  rooms: Room[]
}

function SidebarDropZone({ children }: { children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id: 'sidebar-unassign' })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] rounded-lg transition-colors ${isOver ? 'bg-gray-800 ring-2 ring-gray-600' : ''}`}
    >
      {children}
    </div>
  )
}

export default function TripPlannerPage() {
  const { id } = useParams<{ id: string }>()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeChip, setActiveChip] = useState<{ personId: string; name: string; color: string } | null>(null)
  const [totalCost, setTotalCost] = useState<number | ''>('')
  const [costMode, setCostMode] = useState('per_room')
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showAddSpot, setShowAddSpot] = useState<string | null>(null) // roomId

  // Add family form
  const [newFamilyName, setNewFamilyName] = useState('')
  const [newFamilyColor, setNewFamilyColor] = useState(FAMILY_COLORS[0])
  const [addingFamily, setAddingFamily] = useState(false)

  // Add person form
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonFamily, setNewPersonFamily] = useState<string>('')
  const [addingPerson, setAddingPerson] = useState(false)
  const [showPersonForm, setShowPersonForm] = useState<string | null>(null) // familyId or 'unassigned'

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const fetchTrip = useCallback(async () => {
    const res = await apiFetch(`/api/trips/${id}`)
    if (res.ok) {
      const data = await res.json()
      setTrip(data)
      setTotalCost(data.totalCost ?? '')
      setCostMode(data.costMode ?? 'per_room')
    }
    setLoading(false)
  }, [id])

  useEffect(() => { fetchTrip() }, [fetchTrip])

  async function savePricing(cost: number | '', mode: string) {
    if (!trip) return
    await apiFetch(`/api/trips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trip.name,
        listingUrl: trip.listingUrl,
        totalCost: cost === '' ? null : cost,
        costMode: mode,
      }),
    })
  }

  function scheduleSave(cost: number | '', mode: string) {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => savePricing(cost, mode), 600)
  }

  // Compute assignment map: personId → bedId
  const assignmentMap = new Map<string, string>()
  trip?.rooms.forEach((room) =>
    room.beds.forEach((bed) =>
      bed.assignments.forEach((a) => assignmentMap.set(a.personId, bed.id))
    )
  )

  const unassignedPeople = trip?.people.filter((p) => !p.familyId) ?? []

  function getPeopleForBed(bed: Bed): { id: string; name: string; color: string }[] {
    return bed.assignments.map((a) => ({
      id: a.person.id,
      name: a.person.name,
      color: a.person.family?.color ?? '#94A3B8',
    }))
  }

  async function handleAddFamily(e: React.FormEvent) {
    e.preventDefault()
    if (!newFamilyName.trim()) return
    setAddingFamily(true)
    const res = await apiFetch(`/api/trips/${id}/families`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFamilyName.trim(), color: newFamilyColor }),
    })
    if (res.ok) {
      setNewFamilyName('')
      const usedColors = trip?.families.map((f) => f.color) ?? []
      const nextColor = FAMILY_COLORS.find((c) => !usedColors.includes(c)) ?? FAMILY_COLORS[0]
      setNewFamilyColor(nextColor)
      await fetchTrip()
    }
    setAddingFamily(false)
  }

  async function handleDeleteFamily(familyId: string) {
    await apiFetch(`/api/trips/${id}/families/${familyId}`, { method: 'DELETE' })
    await fetchTrip()
  }

  async function handleAddPerson(e: React.FormEvent, familyId: string | null) {
    e.preventDefault()
    if (!newPersonName.trim()) return
    setAddingPerson(true)
    const res = await apiFetch(`/api/trips/${id}/people`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPersonName.trim(), familyId }),
    })
    if (res.ok) {
      setNewPersonName('')
      setShowPersonForm(null)
      await fetchTrip()
    }
    setAddingPerson(false)
  }

  async function handleDeletePerson(personId: string) {
    await apiFetch(`/api/trips/${id}/people/${personId}`, { method: 'DELETE' })
    await fetchTrip()
  }

  async function handleAddFloorSpot(roomId: string, type: string) {
    await apiFetch(`/api/trips/${id}/beds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, type, label: null }),
    })
    await fetchTrip()
    setShowAddSpot(null)
  }

  async function handleDeleteBed(bedId: string) {
    await apiFetch(`/api/trips/${id}/beds/${bedId}`, { method: 'DELETE' })
    await fetchTrip()
  }

  async function handleUnassign(personId: string) {
    await apiFetch('/api/assignments', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId }),
    })
    await fetchTrip()
  }

  async function handleAssign(personId: string, bedId: string) {
    await apiFetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, bedId }),
    })
    await fetchTrip()
  }

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { personId: string; name: string; color: string }
    setActiveChip(data)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveChip(null)
    const { active, over } = event
    if (!over) return
    const personId = (active.data.current as { personId: string }).personId
    const overId = over.id as string

    if (overId === 'sidebar-unassign') {
      await handleUnassign(personId)
    } else if (overId.startsWith('bed-')) {
      const bedId = overId.replace('bed-', '')
      await handleAssign(personId, bedId)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading...
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-400">Trip not found.</p>
        <Link href="/" className="text-blue-600 hover:underline">Back to trips</Link>
      </div>
    )
  }

  // Cost calculations
  const cost = typeof totalCost === 'number' && totalCost > 0 ? totalCost : 0
  const roomCount = trip.rooms.length
  const bedCount = trip.rooms.reduce(
    (n, r) => n + r.beds.filter(b => !FLOOR_TYPES.has(b.type)).length, 0
  )
  const personCount = trip.people.length
  const unitCost =
    costMode === 'per_room' ? (roomCount > 0 ? cost / roomCount : 0)
    : costMode === 'per_bed'  ? (bedCount  > 0 ? cost / bedCount  : 0)
    : /* per_head */            (personCount > 0 ? cost / personCount : 0)

  const familyCostMap = new Map<string, number>()
  if (cost > 0) {
    if (costMode === 'per_room') {
      trip.rooms.forEach((room) => {
        const peopleInRoom = room.beds.flatMap((b) => b.assignments.map((a) => a.person))
        const total = peopleInRoom.length
        if (total === 0) return
        peopleInRoom.forEach((person) => {
          if (!person.familyId) return
          familyCostMap.set(person.familyId, (familyCostMap.get(person.familyId) ?? 0) + unitCost / total)
        })
      })
    } else if (costMode === 'per_bed') {
      trip.rooms.forEach((room) =>
        room.beds.filter(b => !FLOOR_TYPES.has(b.type)).forEach((bed) => {
          const occupants = bed.assignments.length
          if (occupants === 0) return
          bed.assignments.forEach((a) => {
            if (!a.person.familyId) return
            familyCostMap.set(
              a.person.familyId,
              (familyCostMap.get(a.person.familyId) ?? 0) + unitCost / occupants
            )
          })
        })
      )
    } else {
      trip.families.forEach((family) => {
        const count = trip.people.filter((p) => p.familyId === family.id).length
        familyCostMap.set(family.id, count * unitCost)
      })
    }
  }

  return (
    <DndContext sensors={sensors} autoScroll={false} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm flex-shrink-0">
              ← Trips
            </Link>
            <h1 className="text-lg font-bold text-gray-50 truncate">{trip.name}</h1>
            {trip.listingUrl && (
              <a
                href={trip.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:underline flex-shrink-0"
              >
                View listing ↗
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                value={totalCost}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Number(e.target.value)
                  setTotalCost(val)
                  scheduleSave(val, costMode)
                }}
                onBlur={() => {
                  if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
                  savePricing(totalCost, costMode)
                }}
                placeholder="Total cost"
                className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            <span className="text-sm text-gray-400 flex-shrink-0">Split by</span>
            <select
              value={costMode}
              onChange={(e) => { setCostMode(e.target.value); savePricing(totalCost, e.target.value) }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="per_room">room</option>
              <option value="per_bed">bed</option>
              <option value="per_head">person</option>
            </select>
          </div>
          <Link
            href={`/trips/${id}/setup`}
            className="flex-shrink-0 bg-gray-800 text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            Edit Rooms
          </Link>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0 bg-gray-900 border-r border-gray-700 flex flex-col overflow-y-auto">
            <div className="p-3 flex-1">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Families</h2>

              {/* Family list */}
              {trip.families.map((family) => {
                const members = trip.people.filter((p) => p.familyId === family.id)
                return (
                  <div key={family.id} className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: family.color }}
                        />
                        <span className="text-sm font-semibold text-gray-100">{family.name}</span>
                      </div>
                      {cost > 0 && (
                        <span className="text-xs text-gray-400 ml-auto mr-1">
                          ${(familyCostMap.get(family.id) ?? 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteFamily(family.id)}
                        className="text-gray-600 hover:text-red-400 text-xs"
                        title="Remove family"
                      >
                        ✕
                      </button>
                    </div>

                    <SidebarDropZone>
                      <div className="flex flex-wrap gap-1 pl-5 mb-1">
                        {members.map((person) => (
                          <div key={person.id} className="flex items-center gap-0.5">
                            <PersonChip
                              id={person.id}
                              name={person.name}
                              color={family.color}
                              compact
                              unassigned={!assignmentMap.has(person.id)}
                            />
                            <button
                              onClick={() => handleDeletePerson(person.id)}
                              className="text-gray-600 hover:text-red-400 text-xs leading-none"
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </SidebarDropZone>

                    {showPersonForm === family.id ? (
                      <form
                        onSubmit={(e) => handleAddPerson(e, family.id)}
                        className="pl-5 flex gap-1 mt-1"
                      >
                        <input
                          autoFocus
                          value={newPersonName}
                          onChange={(e) => setNewPersonName(e.target.value)}
                          placeholder="Name"
                          className="flex-1 border border-gray-600 bg-gray-800 text-gray-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                          onKeyDown={(e) => e.key === 'Escape' && setShowPersonForm(null)}
                        />
                        <button
                          type="submit"
                          disabled={addingPerson}
                          className="text-xs bg-blue-500 text-white px-2 rounded hover:bg-blue-600 disabled:opacity-50"
                        >
                          Add
                        </button>
                      </form>
                    ) : (
                      <button
                        onClick={() => { setShowPersonForm(family.id); setNewPersonName('') }}
                        className="pl-5 text-xs text-gray-500 hover:text-blue-500 mt-0.5"
                      >
                        + Add person
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Add family form */}
              {addingFamily === false && (
                <div className="mt-1 mb-4">
                  <form onSubmit={handleAddFamily} className="space-y-1.5">
                    <input
                      value={newFamilyName}
                      onChange={(e) => setNewFamilyName(e.target.value)}
                      placeholder="New family name..."
                      className="w-full border border-gray-700 bg-gray-800 text-gray-100 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {FAMILY_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewFamilyColor(c)}
                          className={`w-5 h-5 rounded-full border-2 ${newFamilyColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <button
                        type="submit"
                        disabled={!newFamilyName.trim()}
                        className="ml-auto text-xs bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Unassigned people */}
              {unassignedPeople.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-800">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Unassigned</h3>
                  <SidebarDropZone>
                    <div className="flex flex-wrap gap-1">
                      {unassignedPeople.map((person) => (
                        <div key={person.id} className="flex items-center gap-0.5">
                          <PersonChip
                            id={person.id}
                            name={person.name}
                            color={person.family?.color ?? '#94A3B8'}
                            compact
                            unassigned={!assignmentMap.has(person.id)}
                          />
                          <button
                            onClick={() => handleDeletePerson(person.id)}
                            className="text-gray-600 hover:text-red-400 text-xs"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </SidebarDropZone>
                </div>
              )}

              {/* Add unassigned person */}
              <div className="mt-3">
                {showPersonForm === 'unassigned' ? (
                  <form
                    onSubmit={(e) => handleAddPerson(e, null)}
                    className="flex gap-1"
                  >
                    <input
                      autoFocus
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="Name"
                      className="flex-1 border border-gray-600 bg-gray-800 text-gray-100 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      onKeyDown={(e) => e.key === 'Escape' && setShowPersonForm(null)}
                    />
                    <button
                      type="submit"
                      disabled={addingPerson}
                      className="text-xs bg-blue-500 text-white px-2 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setShowPersonForm('unassigned'); setNewPersonName('') }}
                    className="text-xs text-gray-500 hover:text-blue-500"
                  >
                    + Add unassigned person
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">
            {trip.rooms.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <p className="text-lg mb-3">No rooms yet.</p>
                <Link
                  href={`/trips/${id}/setup`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Set up rooms →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {trip.rooms.map((room) => (
                  <section key={room.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-gray-100">{room.name}</h2>
                      {cost > 0 && costMode === 'per_room' && (
                        <span className="text-xs text-gray-400">${unitCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                      )}
                    </div>
                    {room.beds.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No beds in this room.</p>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        {[...room.beds]
                          .sort((a, b) => (BED_ORDER[a.type] ?? 99) - (BED_ORDER[b.type] ?? 99))
                          .map((bed) => (
                          <BedCard
                            key={bed.id}
                            id={bed.id}
                            type={bed.type}
                            label={bed.label}
                            assignedPeople={getPeopleForBed(bed)}
                            onUnassign={handleUnassign}
                            cost={cost > 0 && costMode === 'per_bed' && !FLOOR_TYPES.has(bed.type) ? unitCost : undefined}
                            onDelete={FLOOR_TYPES.has(bed.type) ? () => handleDeleteBed(bed.id) : undefined}
                          />
                        ))}
                      </div>
                    )}
                    <div className="flex justify-end mt-2">
                      {showAddSpot === room.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleAddFloorSpot(room.id, 'Floor')}
                            className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded hover:bg-gray-600">Floor</button>
                          <button onClick={() => handleAddFloorSpot(room.id, 'Pack & Play')}
                            className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded hover:bg-gray-600">Pack &amp; Play</button>
                          <button onClick={() => setShowAddSpot(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddSpot(room.id)}
                          className="text-gray-500 hover:text-blue-400 text-sm font-bold leading-none">+</button>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeChip ? (
          <PersonChipStatic name={activeChip.name} color={activeChip.color} />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
