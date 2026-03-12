import Link from 'next/link'
import { prisma } from '@/lib/db'
import TripCard from './components/TripCard'

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
        <h1 className="text-3xl font-bold text-gray-50">Vacation Room Planner</h1>
        <Link
          href="/trips/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + New Trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
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
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </main>
  )
}
