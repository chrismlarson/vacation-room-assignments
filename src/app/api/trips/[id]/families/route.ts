import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { name, color } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  const family = await prisma.family.create({
    data: { name: name.trim(), color, tripId: params.id },
  })
  return NextResponse.json(family, { status: 201 })
}
