import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; personId: string } }
) {
  await prisma.person.delete({ where: { id: params.personId } })
  return NextResponse.json({ ok: true })
}
