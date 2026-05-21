import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import { sendPasswordResetEmail } from '@/lib/email/mailer'
import { rateLimit } from '@/lib/api/rateLimit'
import { headers } from 'next/headers'
import { z } from 'zod'
import crypto from 'crypto'

const Schema = z.object({ email: z.string().email() })

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export async function POST(req: Request) {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  try {
    await rateLimit(`forgot:${ip}`, 5, 300)
  } catch {
    return NextResponse.json({ data: { sent: true }, error: null })
  }

  const body = Schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ data: null, error: 'Invalid email address' }, { status: 400 })
  }

  const { email } = body.data

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null },
    select: { id: true, name: true, email: true },
  })

  // Always return success to avoid user enumeration — delay matches bcrypt time to prevent timing attacks
  if (!user) {
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 200))
    return NextResponse.json({ data: { sent: true }, error: null })
  }

  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + TOKEN_TTL_MS)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: expires },
  })

  await sendPasswordResetEmail(user.email, user.name, token)

  return NextResponse.json({ data: { sent: true }, error: null })
}
