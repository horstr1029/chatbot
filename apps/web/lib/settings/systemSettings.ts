import { prisma } from '@/lib/db/client'
import { encryptField, decryptField } from '@/lib/crypto/encrypt'

const SENSITIVE_KEYS = new Set(['smtp_pass'])

export type SmtpSettings = {
  host: string
  port: string
  secure: string
  user: string
  pass: string
  from: string
}

const SMTP_KEYS = ['smtp_host', 'smtp_port', 'smtp_secure', 'smtp_user', 'smtp_pass', 'smtp_from'] as const

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: [...SMTP_KEYS] } },
  })
  const map = Object.fromEntries(rows.map((r) => [r.key, SENSITIVE_KEYS.has(r.key) ? decryptField(r.value) : r.value]))

  return {
    host:   map['smtp_host']   ?? process.env.SMTP_HOST   ?? '',
    port:   map['smtp_port']   ?? process.env.SMTP_PORT   ?? '587',
    secure: map['smtp_secure'] ?? process.env.SMTP_SECURE ?? 'false',
    user:   map['smtp_user']   ?? process.env.SMTP_USER   ?? '',
    pass:   map['smtp_pass']   ?? process.env.SMTP_PASS   ?? '',
    from:   map['smtp_from']   ?? process.env.SMTP_FROM   ?? '',
  }
}

export async function saveSmtpSettings(s: Partial<SmtpSettings>) {
  const raw: Array<{ key: string; value: string }> = [
    s.host   !== undefined && { key: 'smtp_host',   value: s.host },
    s.port   !== undefined && { key: 'smtp_port',   value: s.port },
    s.secure !== undefined && { key: 'smtp_secure', value: s.secure },
    s.user   !== undefined && { key: 'smtp_user',   value: s.user },
    s.pass   !== undefined && { key: 'smtp_pass',   value: s.pass },
    s.from   !== undefined && { key: 'smtp_from',   value: s.from },
  ].filter(Boolean) as Array<{ key: string; value: string }>

  const entries = raw.map((e) => ({
    key: e.key,
    value: SENSITIVE_KEYS.has(e.key) && e.value ? encryptField(e.value) : e.value,
  }))

  await prisma.$transaction(
    entries.map((e) =>
      prisma.systemSetting.upsert({
        where: { key: e.key },
        update: { value: e.value },
        create: { key: e.key, value: e.value },
      })
    )
  )
}
