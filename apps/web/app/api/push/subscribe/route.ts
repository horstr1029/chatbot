import { deptMiddleware } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/client'
import { apiResponse } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string(),
  auth: z.string(),
})

export async function POST(req: Request) {
  let ctx
  try { ctx = await deptMiddleware() } catch { return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401) }

  const body = schema.safeParse(await req.json())
  if (!body.success) return apiResponse.error('INVALID_REQUEST', 'Invalid body', 400)

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.data.endpoint },
    create: { userId: ctx.user_id, ...body.data },
    update: { userId: ctx.user_id, p256dh: body.data.p256dh, auth: body.data.auth },
  })

  return apiResponse.success({ subscribed: true })
}

export async function DELETE(req: Request) {
  let ctx
  try { ctx = await deptMiddleware() } catch { return apiResponse.error('UNAUTHORIZED', 'Unauthorized', 401) }

  const { endpoint } = await req.json()
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: ctx.user_id } })
  return apiResponse.success({ unsubscribed: true })
}
