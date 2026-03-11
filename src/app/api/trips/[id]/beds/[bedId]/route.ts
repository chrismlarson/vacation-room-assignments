import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; bedId: string } }
) {
  await prisma.bed.delete({ where: { id: params.bedId } })
  return NextResponse.json({ ok: true })
}
