import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { hashPassword } from '@/lib/auth/password'
import { withErrorHandler } from '@/lib/api/errorHandler'
import { apiResponse } from '@/lib/api/response'
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  role: z.enum(['MEMBER', 'DEPT_ADMIN']).default('MEMBER'),
  deptId: z.string().optional(),
})

export const POST = withErrorHandler(async (req: Request) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'DEPT_ADMIN')

  const body = CreateUserSchema.parse(await req.json())

  const targetDeptId = ctx.role === 'SUPER_ADMIN' && body.deptId ? body.deptId : ctx.dept_id

  const existing = await prisma.user.findUnique({
    where: { email: body.email.toLowerCase().trim() },
  })
  if (existing) {
    return NextResponse.json(apiResponse.error('EMAIL_TAKEN', 'A user with that email already exists'), { status: 409 })
  }

  const passwordHash = await hashPassword(body.password)

  const user = await prisma.user.create({
    data: {
      email: body.email.toLowerCase().trim(),
      passwordHash,
      name: body.name ?? null,
      role: body.role,
      deptId: targetDeptId,
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  return NextResponse.json(apiResponse.success(user), { status: 201 })
})
