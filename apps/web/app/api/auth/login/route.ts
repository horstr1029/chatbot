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
    select: {
      id: true, passwordHash: true, name: true, email: true, isSuperAdmin: true,
      departments: { select: { deptId: true, role: true } },
    },
  })

  if (!user || !(await verifyPassword(String(password), user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const session = await getSession()
  session.isLoggedIn = true
  session.userId = user.id
  session.name = user.name ?? user.email
  session.email = user.email
  session.deptIds = user.departments.map((d) => d.deptId)

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

  // Multiple departments — let the user pick
  session.deptId = null
  session.role = 'MEMBER'
  await session.save()
  return NextResponse.json({ data: { redirect: '/select-dept' }, error: null })
}
