import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { Errors } from '@/lib/errors'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) throw Errors.UNAUTHORIZED()

  const { deptId } = await req.json()

  if (deptId === null) {
    session.deptId = null
    session.role = session.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'MEMBER'
    await session.save()
    return NextResponse.json({ data: { ok: true }, error: null })
  }

  if (session.role === 'SUPER_ADMIN') {
    const dept = await prisma.department.findUnique({ where: { id: deptId }, select: { id: true } })
    if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    session.deptId = deptId
    await session.save()
    return NextResponse.json({ data: { ok: true }, error: null })
  }

  // Regular user — verify they belong to this dept
  const membership = await prisma.userDepartment.findUnique({
    where: { userId_deptId: { userId: session.userId, deptId } },
    select: { role: true },
  })
  if (!membership) return NextResponse.json({ error: 'Not a member of that department' }, { status: 403 })

  session.deptId = deptId
  session.role = membership.role
  await session.save()
  return NextResponse.json({ data: { ok: true }, error: null })
}
