import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  req: Request,
  { params }: { params: { id: string; roomId: string } }
) {
  const { name } = await req.json()
  const room = await prisma.room.update({
    where: { id: params.roomId },
    data: { name },
    include: { beds: true },
  })
  return NextResponse.json(room)
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; roomId: string } }
) {
  await prisma.room.delete({ where: { id: params.roomId } })
  return NextResponse.json({ ok: true })
}
