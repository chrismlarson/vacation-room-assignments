import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { name } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  const count = await prisma.room.count({ where: { tripId: params.id } })
  const room = await prisma.room.create({
    data: { name: name.trim(), tripId: params.id, order: count },
    include: { beds: true },
  })
  return NextResponse.json(room, { status: 201 })
}
