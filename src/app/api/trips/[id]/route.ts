import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const trip = await prisma.trip.findUnique({
    where: { id: params.id },
    include: {
      families: true,
      people: true,
      rooms: {
        orderBy: { order: 'asc' },
        include: {
          beds: {
            orderBy: { order: 'asc' },
            include: {
              assignments: {
                include: { person: { include: { family: true } } },
              },
            },
          },
        },
      },
    },
  })
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(trip)
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { name, listingUrl } = await req.json()
  const trip = await prisma.trip.update({
    where: { id: params.id },
    data: { name, listingUrl },
  })
  return NextResponse.json(trip)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await prisma.trip.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
