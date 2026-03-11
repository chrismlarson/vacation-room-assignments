import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { ScrapedRoom } from '@/lib/scrape-vrbo'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { rooms, clearExisting }: { rooms: ScrapedRoom[]; clearExisting?: boolean } = await req.json()

  if (!Array.isArray(rooms) || rooms.length === 0) {
    return NextResponse.json({ error: 'No rooms provided' }, { status: 400 })
  }

  const trip = await prisma.trip.findUnique({ where: { id: params.id }, select: { id: true } })
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (clearExisting) {
    await prisma.room.deleteMany({ where: { tripId: params.id } })
  }

  for (let i = 0; i < rooms.length; i++) {
    const room = await prisma.room.create({
      data: { name: rooms[i].name, tripId: params.id, order: i },
    })
    for (let j = 0; j < rooms[i].beds.length; j++) {
      await prisma.bed.create({
        data: { type: rooms[i].beds[j].type, roomId: room.id, order: j },
      })
    }
  }

  return NextResponse.json({ success: true, roomsCreated: rooms.length })
}
