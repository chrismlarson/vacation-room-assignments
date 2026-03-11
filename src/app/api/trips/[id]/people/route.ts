import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { name, familyId } = await req.json()
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 })
  }
  const person = await prisma.person.create({
    data: {
      name: name.trim(),
      familyId: familyId || null,
      tripId: params.id,
    },
    include: { family: true },
  })
  return NextResponse.json(person, { status: 201 })
}
