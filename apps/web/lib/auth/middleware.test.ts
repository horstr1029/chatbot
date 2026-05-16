const mockAuth = jest.fn()
jest.mock('@clerk/nextjs/server', () => ({ auth: mockAuth }))

const mockFindUnique = jest.fn()
jest.mock('@/lib/db/client', () => ({
  prisma: { user: { findUnique: mockFindUnique } },
}))

import { deptMiddleware, requireRole } from './middleware'

describe('deptMiddleware', () => {
  afterEach(() => jest.clearAllMocks())

  it('should throw UNAUTHORIZED when Clerk returns no userId', async () => {
    mockAuth.mockResolvedValue({ userId: null })
    await expect(deptMiddleware()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('should throw UNAUTHORIZED when user is not found in DB', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-1' })
    mockFindUnique.mockResolvedValue(null)
    await expect(deptMiddleware()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('should throw UNAUTHORIZED when user has no deptId', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-1' })
    mockFindUnique.mockResolvedValue({ id: 'u1', deptId: null, role: 'MEMBER', clerkId: 'clerk-1' })
    await expect(deptMiddleware()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('should return AuthContext for a valid user', async () => {
    mockAuth.mockResolvedValue({ userId: 'clerk-1' })
    mockFindUnique.mockResolvedValue({ id: 'u1', deptId: 'dept-1', role: 'MEMBER', clerkId: 'clerk-1' })
    const ctx = await deptMiddleware()
    expect(ctx).toEqual({ user_id: 'u1', dept_id: 'dept-1', role: 'MEMBER', clerk_id: 'clerk-1' })
  })
})

describe('requireRole', () => {
  it('should not throw when user has required role', () => {
    expect(() => requireRole('DEPT_ADMIN', 'DEPT_ADMIN')).not.toThrow()
    expect(() => requireRole('SUPER_ADMIN', 'DEPT_ADMIN')).not.toThrow()
    expect(() => requireRole('SUPER_ADMIN', 'MEMBER')).not.toThrow()
  })

  it('should throw INVALID_ROLE when user lacks required role', () => {
    expect(() => requireRole('MEMBER', 'DEPT_ADMIN')).toThrow()
    expect(() => requireRole('DEPT_ADMIN', 'SUPER_ADMIN')).toThrow()
    expect(() => requireRole('MEMBER', 'SUPER_ADMIN')).toThrow()
  })
})
