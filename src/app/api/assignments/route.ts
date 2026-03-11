import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  const { personId, bedId } = await req.json()
  if (!personId || !bedId) {
    return NextResponse.json({ error: 'personId and bedId required' }, { status: 400 })
  }
  // Remove any existing assignment for this person (one bed at a time)
  await prisma.assignment.deleteMany({ where: { personId } })
  const assignment = await prisma.assignment.create({
    data: { personId, bedId },
    include: {
      person: { include: { family: true } },
    },
  })
  return NextResponse.json(assignment, { status: 201 })
}

export async function DELETE(req: Request) {
  const { personId } = await req.json()
  if (!personId) {
    return NextResponse.json({ error: 'personId required' }, { status: 400 })
  }
  await prisma.assignment.deleteMany({ where: { personId } })
  return NextResponse.json({ ok: true })
}
