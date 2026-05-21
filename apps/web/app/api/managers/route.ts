export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { hashPassword } from '@/lib/auth/password'
import { generateTempPassword } from '@/lib/auth/tempPassword'
import { sendWelcomeEmail } from '@/lib/email/mailer'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  deptIds: z.array(z.string()).min(1, 'Assign at least one department'),
})

// GET — list all managers with their assigned departments
export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const managers = await prisma.user.findMany({
    where: {
      deletedAt: null,
      departments: { some: { role: 'MANAGER' } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      departments: {
        where: { role: 'MANAGER' },
        select: { deptId: true, dept: { select: { name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return apiResponse.success(managers)
})

// POST — create a new manager account and assign to departments
export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const body = createSchema.parse(await req.json())

  const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
  if (existing) {
    await prisma.$transaction(
      body.deptIds.map((deptId) =>
        prisma.userDepartment.upsert({
          where: { userId_deptId: { userId: existing.id, deptId } },
          create: { userId: existing.id, deptId, role: 'MANAGER' },
          update: { role: 'MANAGER' },
        })
      )
    )
    return apiResponse.success({ id: existing.id })
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  const manager = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
        mustChangePassword: true,
      },
    })
    await Promise.all(
      body.deptIds.map((deptId) =>
        tx.userDepartment.create({ data: { userId: user.id, deptId, role: 'MANAGER' } })
      )
    )
    return user
  })

  sendWelcomeEmail(manager.email, manager.name, tempPassword).catch((err) => {
    process.stderr.write(`[email] Failed to send welcome email to ${manager.email}: ${err}\n`)
  })

  return apiResponse.success({ id: manager.id }, undefined, 201)
})
