import { randomBytes } from 'crypto'

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const MAX_VALID = 256 - (256 % CHARS.length)

export function generateTempPassword(length = 12): string {
  const result: string[] = []
  while (result.length < length) {
    const buf = randomBytes(1)
    const byte = buf[0]
    if (byte < MAX_VALID) result.push(CHARS[byte % CHARS.length])
  }
  return result.join('')
}
