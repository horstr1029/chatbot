export const dynamic = 'force-dynamic'

import nodemailer from 'nodemailer'
import { deptMiddleware, requireRole } from '@/lib/auth/middleware'
import { apiResponse, withErrorHandler } from '@/lib/api/response'
import { getSmtpSettings } from '@/lib/settings/systemSettings'
import { getSession } from '@/lib/auth/session'

export const POST = withErrorHandler(async () => {
  const ctx = await deptMiddleware()
  requireRole(ctx.role, 'SUPER_ADMIN')

  const s = await getSmtpSettings()
  if (!s.host || !s.user) {
    return apiResponse.error('NOT_CONFIGURED', 'SMTP is not configured', 400)
  }

  const session = await getSession()
  const to = session.email

  const transport = nodemailer.createTransport({
    host: s.host,
    port: Number(s.port),
    secure: s.secure === 'true',
    auth: { user: s.user, pass: s.pass },
  })

  await transport.sendMail({
    from: s.from || s.user,
    to,
    subject: 'Company Chatbot — SMTP test',
    text: 'SMTP is configured correctly. This is a test email.',
  })

  return apiResponse.success({ sent: true, to })
})
