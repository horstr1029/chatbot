import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  managerId: z.string().min(1),
  systemPrompt: z.string().optional(),
  llmModel: z.string().optional(),
  embedModel: z.string().optional(),
})

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()

  // SUPER_ADMIN gets full metadata; DEPT_ADMIN gets a slim list for selectors
  if (ctx.role === 'SUPER_ADMIN') {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true, documentSources: true } } },
    })
    return apiResponse.success(departments)
  }

  requireRole(ctx.role, 'DEPT_ADMIN')

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  })

  return apiResponse.success(departments)
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const body = createSchema.parse(await req.json())

  const dept = await prisma.$transaction(async (tx) => {
    const created = await tx.department.create({
      data: {
        name: body.name,
        managerId: body.managerId,
        systemPrompt: body.systemPrompt,
        llmModel: body.llmModel,
        embedModel: body.embedModel,
      },
    })
    await tx.userDepartment.upsert({
      where: { userId_deptId: { userId: body.managerId, deptId: created.id } },
      create: { userId: body.managerId, deptId: created.id, role: 'DEPT_ADMIN' },
      update: { role: 'DEPT_ADMIN' },
    })
    return created
  })

  return apiResponse.success(dept, undefined, 201)
})
