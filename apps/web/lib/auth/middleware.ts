import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db/client'
import { Errors } from '@/lib/errors'
import type { UserRole } from '@prisma/client'

export type AuthContext = {
  user_id: string
  dept_id: string
  role: UserRole
  clerk_id: string
}

export async function deptMiddleware(): Promise<AuthContext> {
  const { userId } = await auth()
  if (!userId) throw Errors.UNAUTHORIZED()

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { id: true, deptId: true, role: true, clerkId: true },
  })

  if (!user || !user.deptId) throw Errors.UNAUTHORIZED()

  return {
    user_id: user.id,
    dept_id: user.deptId,
    role: user.role,
    clerk_id: user.clerkId,
  }
}

export function requireRole(userRole: UserRole, required: UserRole): void {
  const hierarchy: Record<UserRole, number> = {
    MEMBER: 0,
    DEPT_ADMIN: 1,
    SUPER_ADMIN: 2,
  }
  if (hierarchy[userRole] < hierarchy[required]) {
    throw Errors.INVALID_ROLE(required)
  }
}
