import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { verifyPassword } from '@/lib/auth/password'
import { getSession } from '@/lib/auth/session'

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim(), deletedAt: null },
    select: { id: true, passwordHash: true, name: true, email: true, role: true, deptId: true },
  })

  if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const session = await getSession()
  session.isLoggedIn = true
  session.userId = user.id
  session.deptId = user.deptId
  session.role = user.role
  session.name = user.name ?? user.email
  session.email = user.email
  await session.save()

  return NextResponse.json({ data: { ok: true }, error: null })
}
