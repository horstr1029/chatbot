import { getSession } from './session'
import { Errors } from '@/lib/errors'
import type { UserRole } from './types'

export type AuthContext = {
  user_id: string
  dept_id: string
  role: UserRole
}

export async function deptMiddleware(): Promise<AuthContext> {
  const session = await getSession()
  if (!session.isLoggedIn || !session.userId) throw Errors.UNAUTHORIZED()
  if (!session.deptId && session.role !== 'SUPER_ADMIN') throw Errors.UNAUTHORIZED()

  return {
    user_id: session.userId,
    dept_id: session.deptId ?? '',
    role: session.role,
  }
}

export function requireRole(userRole: UserRole, required: UserRole): void {
  const hierarchy: Record<UserRole, number> = {
    MEMBER: 0,
    MANAGER: 1,
    SUPER_ADMIN: 2,
  }
  if (hierarchy[userRole] < hierarchy[required]) {
    throw Errors.INVALID_ROLE(required)
  }
}
