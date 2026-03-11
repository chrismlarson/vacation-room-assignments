import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { roomId, type, label } = await req.json()
  if (!roomId || !type) {
    return NextResponse.json({ error: 'roomId and type required' }, { status: 400 })
  }
  const count = await prisma.bed.count({ where: { roomId } })
  const bed = await prisma.bed.create({
    data: { roomId, type, label: label || null, order: count },
    include: {
      assignments: {
        include: { person: { include: { family: true } } },
      },
    },
  })
  return NextResponse.json(bed, { status: 201 })
}
