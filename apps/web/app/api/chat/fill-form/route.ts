export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/db/client'
import { deptMiddleware } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { Errors } from '@/lib/errors'
import { getDept } from '@/lib/dept/getDept'
import { fillForm } from '@/lib/llm/formFiller'
import { z } from 'zod'
import type { FormField } from '@/lib/llm/formFiller'

const bodySchema = z.object({
  templateId: z.string().min(1),
  description: z.string().min(1),
})

export const POST = withErrorHandler(async (req) => {
  const ctx = await deptMiddleware()

  const body = bodySchema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  const template = await prisma.formTemplate.findUnique({
    where: { id: body.data.templateId },
  })
  if (!template) throw Errors.NOT_FOUND('FormTemplate')
  if (template.deptId !== ctx.dept_id) throw Errors.DEPT_MISMATCH()
  if (!template.active) return apiResponse.error('NOT_FOUND', 'Form template not available', 404)

  const dept = await getDept(ctx.dept_id)
  const fields = template.fields as FormField[]

  const filled = await fillForm(
    body.data.description,
    { id: template.id, name: template.name, fields },
    dept.llmModel,
  )

  return apiResponse.success({
    template: { id: template.id, name: template.name, fields },
    filled,
  })
})
