import Link from 'next/link'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { people: true, rooms: true } },
    },
  })

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vacation Room Planner</h1>
        <Link
          href="/trips/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-4">No trips yet.</p>
          <Link
            href="/trips/new"
            className="text-blue-600 hover:underline font-medium"
          >
            Create your first trip
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{trip.name}</h2>
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
                <div className="text-right text-sm text-gray-400">
                  <div>{trip._count.people} people</div>
                  <div>{trip._count.rooms} rooms</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {new Date(trip.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
