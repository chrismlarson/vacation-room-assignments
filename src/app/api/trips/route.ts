import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { people: true, rooms: true } },
    },
  })
  return NextResponse.json(trips)
}

export async function POST(req: Request) {
  const { name, listingUrl } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  const trip = await prisma.trip.create({
    data: { name: name.trim(), listingUrl: listingUrl || null },
  })
  return NextResponse.json(trip, { status: 201 })
}
