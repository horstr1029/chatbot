import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const PREFIX = 'enc:v1:'

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY ?? process.env.SESSION_SECRET ?? ''
  if (!raw) throw new Error('No encryption key available — set FIELD_ENCRYPTION_KEY or SESSION_SECRET')
  // Derive a stable 32-byte key regardless of input length
  return createHash('sha256').update(raw).digest()
}

export function encryptField(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptField(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored // plaintext legacy value
  const parts = stored.slice(PREFIX.length).split(':')
  if (parts.length !== 3) return stored
  const [ivHex, tagHex, ctHex] = parts
  const key = getKey()
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8')
}
