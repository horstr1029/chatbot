import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { hashPassword } from '@/lib/auth/password'
import { generateTempPassword } from '@/lib/auth/tempPassword'
import { sendWelcomeEmail } from '@/lib/email/mailer'
import { withErrorHandler, apiResponse } from '@/lib/api/response'
import { z } from 'zod'

const CreateUserSchema = z.object({
  email: z.string().email(),
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
    const alreadyMember = await prisma.userDepartment.findUnique({
      where: { userId_deptId: { userId: existing.id, deptId: targetDeptId } },
    })
    if (alreadyMember) {
      return NextResponse.json(apiResponse.error('EMAIL_TAKEN', 'This user is already in the department'), { status: 409 })
    }
    await prisma.userDepartment.create({
      data: { userId: existing.id, deptId: targetDeptId, role: body.role },
    })
    return NextResponse.json(apiResponse.success({ id: existing.id, email: existing.email, name: existing.name, role: body.role, createdAt: existing.createdAt }), { status: 201 })
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email: body.email.toLowerCase().trim(),
        passwordHash,
        name: body.name ?? null,
        mustChangePassword: true,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    })
    await tx.userDepartment.create({
      data: { userId: u.id, deptId: targetDeptId, role: body.role },
    })
    return u
  })

  // Send welcome email — non-blocking, don't fail the request if email fails
  sendWelcomeEmail(user.email, user.name, tempPassword).catch((err) => {
    process.stderr.write(`[email] Failed to send welcome email to ${user.email}: ${err}\n`)
  })

  return NextResponse.json(apiResponse.success({ ...user, role: body.role }), { status: 201 })
})
