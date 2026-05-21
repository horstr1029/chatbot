import { getIronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { UserRole } from './types'

export interface SessionData {
  isLoggedIn: boolean
  userId: string
  deptId: string | null
  role: UserRole
  deptIds: string[]
  name: string
  email: string
  mustChangePassword: boolean
  isSuperAdmin: boolean
}

const SESSION_SECRET = process.env.SESSION_SECRET
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET env var must be set to at least 32 characters')
}

export const sessionOptions = {
  cookieName: 'chatbot_session',
  password: SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 8,
  },
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions)
}
