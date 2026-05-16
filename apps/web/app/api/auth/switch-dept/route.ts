import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { Errors } from '@/lib/errors'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) throw Errors.UNAUTHORIZED()
  if (session.role !== 'SUPER_ADMIN') throw Errors.INVALID_ROLE('SUPER_ADMIN')

  const { deptId } = await req.json()

  if (deptId !== null) {
    const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true } })
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })
  }

  session.deptId = deptId ?? null
  await session.save()

  return NextResponse.json({ data: { ok: true }, error: null })
}
