export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'
import { z } from 'zod'
import type { FormField } from '@/lib/llm/formFiller'

type Ctx = { params: { id: string } }

const fieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'date', 'select', 'textarea', 'number']),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  fields: z.array(fieldSchema).min(1).optional(),
  active: z.boolean().optional(),
})

async function getOwnedTemplate(templateId: string, deptId: string, role: string) {
  const template = await prisma.formTemplate.findUnique({ where: { id: templateId } })
  if (!template) throw Errors.NOT_FOUND('FormTemplate')
  if (role !== 'SUPER_ADMIN' && template.deptId !== deptId) throw Errors.DEPT_MISMATCH()
  return template
}

export const PUT = withErrorHandler(async (req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')

  const body = updateSchema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  await getOwnedTemplate(params.id, authCtx.dept_id, authCtx.role)

  const updated = await prisma.formTemplate.update({
    where: { id: params.id },
    data: {
      ...(body.data.name !== undefined && { name: body.data.name }),
      ...(body.data.fields !== undefined && { fields: body.data.fields }),
      ...(body.data.active !== undefined && { active: body.data.active }),
    },
  })

  return apiResponse.success({
    id: updated.id,
    name: updated.name,
    fields: updated.fields as FormField[],
    active: updated.active,
    updatedAt: updated.updatedAt,
  })
})

export const DELETE = withErrorHandler(async (_req, ctx) => {
  const { params } = ctx as Ctx
  const authCtx = await deptMiddleware()
  requireRole(authCtx.role, 'MANAGER')

  await getOwnedTemplate(params.id, authCtx.dept_id, authCtx.role)

  await prisma.formTemplate.update({
    where: { id: params.id },
    data: { active: false },
  })

  return apiResponse.success({ deactivated: true })
})
