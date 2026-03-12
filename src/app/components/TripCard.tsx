'use client'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api'

interface Trip {
  id: string
  name: string
  listingUrl: string | null
  createdAt: string
  _count: { people: number; rooms: number }
}

export default function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter()

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Delete "${trip.name}"? This cannot be undone.`)) return
    await apiFetch(`/api/trips/${trip.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div
      onClick={() => router.push(`/trips/${trip.id}`)}
      className="cursor-pointer bg-gray-900 border border-gray-700 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-50">{trip.name}</h2>
          {trip.listingUrl && (
            <a
              href={trip.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-blue-500 hover:underline mt-1 inline-block"
            >
              View listing
            </a>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-right text-sm text-gray-500">
            <div>{trip._count.people} people</div>
            <div>{trip._count.rooms} rooms</div>
          </div>
          <button
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {new Date(trip.createdAt).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
      </div>
    </div>
  )
}
