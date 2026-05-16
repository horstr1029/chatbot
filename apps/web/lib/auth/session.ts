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
}

export const sessionOptions = {
  cookieName: 'chatbot_session',
  password: process.env.SESSION_SECRET ?? 'fallback-dev-secret-change-in-production-!!',
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
