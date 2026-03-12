import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { scrapeVrbo } from '@/lib/scrape-vrbo'

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { people: true, rooms: true } },
    },
  })
  return NextResponse.json(trips)
}

function slugify(name: string): string {
  return name.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || 'trip'
  let slug = base
  let i = 1
  while (await prisma.trip.findUnique({ where: { id: slug } })) {
    slug = `${base}-${i++}`
  }
  return slug
}

export async function POST(req: Request) {
  const { name, listingUrl } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  const id = await uniqueSlug(name)
  const trip = await prisma.trip.create({
    data: { id, name: name.trim(), listingUrl: listingUrl || null },
  })

  let importError: string | null = null

  if (listingUrl?.includes('vrbo.com')) {
    try {
      const result = await scrapeVrbo(listingUrl)
      if (result.success && result.rooms.length > 0) {
        for (let i = 0; i < result.rooms.length; i++) {
          const room = await prisma.room.create({
            data: { name: result.rooms[i].name, tripId: trip.id, order: i },
          })
          for (let j = 0; j < result.rooms[i].beds.length; j++) {
            await prisma.bed.create({
              data: { type: result.rooms[i].beds[j].type, roomId: room.id, order: j },
            })
          }
        }
      } else {
        importError = result.error ?? 'No rooms found in listing'
      }
    } catch (err) {
      console.error('[scrapeVrbo]', err)
      importError = String(err)
    }
  }

  return NextResponse.json({ ...trip, importError }, { status: 201 })
}
