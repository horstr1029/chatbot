import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { hashPassword } from '@/lib/auth/password'
import { rateLimit } from '@/lib/api/rateLimit'
import { headers } from 'next/headers'
import { z } from 'zod'

const Schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  try {
    await rateLimit(`reset-pw:${ip}`, 10, 3600)
  } catch {
    return NextResponse.json({ data: null, error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const body = Schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ data: null, error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const { token, password } = body.data

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpires: { gt: new Date() },
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!user) {
    return NextResponse.json({ data: null, error: 'This reset link is invalid or has expired.' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
      passwordResetToken: null,
      passwordResetExpires: null,
    },
  })

  return NextResponse.json({ data: { reset: true }, error: null })
}
