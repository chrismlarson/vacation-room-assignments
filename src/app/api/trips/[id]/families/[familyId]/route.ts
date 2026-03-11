import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; familyId: string } }
) {
  await prisma.family.delete({ where: { id: params.familyId } })
  return NextResponse.json({ ok: true })
}
