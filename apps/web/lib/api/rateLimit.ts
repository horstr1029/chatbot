import { redis } from '@/lib/redis/client'
import { Errors } from '@/lib/errors'

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const redisKey = `rate:${key}`
  const now = Date.now()
  const windowStart = now - windowSeconds * 1000

  // Sliding window using sorted set: member = timestamp, score = timestamp
  await redis.zremrangebyscore(redisKey, '-inf', windowStart)
  const count = await redis.zcard(redisKey)

  if (count >= limit) {
    throw Errors.FORBIDDEN()
  }

  await redis.zadd(redisKey, now, `${now}-${Math.random()}`)
  await redis.expire(redisKey, windowSeconds)
}
