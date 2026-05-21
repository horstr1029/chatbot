import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { getSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/api/rateLimit'
import { headers } from 'next/headers'
import { z } from 'zod'

const Schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  try {
    await rateLimit(`change-pw:${ip}:${session.userId}`, 5, 3600)
  } catch {
    return NextResponse.json({ error: 'Too many password change attempts. Try again later.' }, { status: 429 })
  }

  const body = Schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true, isSuperAdmin: true, mustChangePassword: true, departments: { select: { deptId: true, role: true } } },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const valid = await verifyPassword(body.data.currentPassword, user.passwordHash)
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })

  if (body.data.newPassword === body.data.currentPassword) {
    return NextResponse.json({ error: 'New password must be different from your current password' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.data.newPassword), mustChangePassword: false },
  })

  // Complete session setup now that password is changed
  session.mustChangePassword = false

  if (user.isSuperAdmin) {
    session.role = 'SUPER_ADMIN'
    session.deptId = null
    await session.save()
    return NextResponse.json({ data: { redirect: '/superadmin' }, error: null })
  }

  if (user.departments.length === 0) {
    session.role = 'MEMBER'
    session.deptId = null
    await session.save()
    return NextResponse.json({ data: { redirect: '/pending' }, error: null })
  }

  if (user.departments.length === 1) {
    session.deptId = user.departments[0].deptId
    session.role = user.departments[0].role
    await session.save()
    return NextResponse.json({ data: { redirect: '/chat' }, error: null })
  }

  session.deptId = null
  session.role = 'MEMBER'
  await session.save()
  return NextResponse.json({ data: { redirect: '/select-dept' }, error: null })
}
