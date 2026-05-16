import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { prisma } from '@/lib/db/client'
import { apiResponse } from '@/lib/api/response'

type ClerkUserEvent = {
  type: string
  data: {
    id: string
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
    first_name: string | null
    last_name: string | null
  }
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) return apiResponse.error('CONFIG_ERROR', 'Webhook secret not configured', 500)

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return apiResponse.error('INVALID_REQUEST', 'Missing svix headers', 400)
  }

  const body = await req.text()
  const wh = new Webhook(secret)

  let event: ClerkUserEvent
  try {
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkUserEvent
  } catch {
    return apiResponse.error('INVALID_SIGNATURE', 'Invalid webhook signature', 400)
  }

  if (event.type === 'user.created') {
    const { id, email_addresses, primary_email_address_id, first_name, last_name } = event.data
    const primary = email_addresses.find((e) => e.id === primary_email_address_id)
    if (!primary) return apiResponse.success({ received: true })

    await prisma.user.upsert({
      where: { clerkId: id },
      update: {},
      create: {
        clerkId: id,
        email: primary.email_address,
        name: [first_name, last_name].filter(Boolean).join(' ') || null,
        // deptId is null — user sees pending page until a super_admin assigns them
      },
    })
  }

  return apiResponse.success({ received: true })
}
