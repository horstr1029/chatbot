import type { UserRole } from './types'

const mockGetSession = jest.fn()
jest.mock('./session', () => ({ getSession: mockGetSession }))

import { deptMiddleware, requireRole } from './middleware'

function mockSession(overrides: object = {}) {
  mockGetSession.mockResolvedValue({
    isLoggedIn: true,
    userId: 'user-1',
    deptId: 'dept-1',
    role: 'MEMBER' as UserRole,
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  })
}

describe('deptMiddleware', () => {
  afterEach(() => jest.clearAllMocks())

  it('should return auth context when session is valid', async () => {
    mockSession({ role: 'DEPT_ADMIN' })
    const ctx = await deptMiddleware()
    expect(ctx.user_id).toBe('user-1')
    expect(ctx.dept_id).toBe('dept-1')
    expect(ctx.role).toBe('DEPT_ADMIN')
  })

  it('should throw UNAUTHORIZED when not logged in', async () => {
    mockSession({ isLoggedIn: false })
    await expect(deptMiddleware()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('should throw UNAUTHORIZED when deptId is null', async () => {
    mockSession({ deptId: null })
    await expect(deptMiddleware()).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })
})

describe('requireRole', () => {
  it('should allow equal role', () => {
    expect(() => requireRole('DEPT_ADMIN', 'DEPT_ADMIN')).not.toThrow()
  })

  it('should allow higher role', () => {
    expect(() => requireRole('SUPER_ADMIN', 'DEPT_ADMIN')).not.toThrow()
    expect(() => requireRole('SUPER_ADMIN', 'MEMBER')).not.toThrow()
  })

  it('should throw for insufficient role', () => {
    expect(() => requireRole('MEMBER', 'DEPT_ADMIN')).toThrow()
    expect(() => requireRole('DEPT_ADMIN', 'SUPER_ADMIN')).toThrow()
  })
})
