import { prisma } from '@/lib/db/client'
import { redis } from '@/lib/redis/client'
import { Errors } from '@/lib/errors'
import type { Department } from '@prisma/client'

const TTL = 60 * 5 // 5 minutes

function cacheKey(deptId: string) {
  return `dept:config:${deptId}`
}

export async function getDept(deptId: string): Promise<Department> {
  const cached = await redis.get(cacheKey(deptId))
  if (cached) return JSON.parse(cached) as Department

  const dept = await prisma.department.findUnique({ where: { id: deptId } })
  if (!dept) throw Errors.NOT_FOUND('Department')

  await redis.setex(cacheKey(deptId), TTL, JSON.stringify(dept))
  return dept
}

export async function invalidateDept(deptId: string): Promise<void> {
  await redis.del(cacheKey(deptId))
}
