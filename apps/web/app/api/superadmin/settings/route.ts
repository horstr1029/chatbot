export const dynamic = 'force-dynamic'

import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { getSmtpSettings, saveSmtpSettings } from '@/lib/settings/systemSettings'
import { z } from 'zod'

export const GET = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const smtp = await getSmtpSettings()
  // Never expose the password — send a masked indicator instead
  return apiResponse.success({
    smtp: { ...smtp, pass: smtp.pass ? '••••••••' : '' },
  })
})

const SmtpSchema = z.object({
  host:   z.string(),
  port:   z.string(),
  secure: z.enum(['true', 'false']),
  user:   z.string(),
  pass:   z.string().optional(),
  from:   z.string(),
})

export const PUT = withErrorHandler(async (req: Request) => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const body = SmtpSchema.parse(await req.json())

  // If pass is the masked placeholder, keep the existing password
  const update = body.pass === '••••••••' ? { ...body, pass: undefined } : body
  await saveSmtpSettings(update)

  return apiResponse.success({ saved: true })
})
