export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { z } from 'zod'
import type { FormField } from '@/lib/llm/formFiller'

const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'date', 'select', 'textarea', 'number']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
})

const createSchema = z.object({
  name: z.string().min(1),
  fields: z.array(fieldSchema).min(1),
})

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'MANAGER')

  const templates = await prisma.formTemplate.findMany({
    where: { deptId: ctx.dept_id, active: true },
    orderBy: { createdAt: 'desc' },
  })

  return apiResponse.success(
    templates.map((t) => ({
      id: t.id,
      name: t.name,
      fields: t.fields as FormField[],
      active: t.active,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  )
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'MANAGER')

  const body = createSchema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  const template = await prisma.formTemplate.create({
    data: {
      deptId: ctx.dept_id,
      name: body.data.name,
      fields: body.data.fields,
    },
  })

  return apiResponse.success({
    id: template.id,
    name: template.name,
    fields: template.fields as FormField[],
    active: template.active,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  })
})
