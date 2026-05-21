import { prisma } from '@/lib/db/client'
import { Prisma } from '@prisma/client'

export type AuditAction =
  | 'USER_ROLE_CHANGED'
  | 'USER_REMOVED'
  | 'USER_ADDED'
  | 'DOCUMENT_ADDED'
  | 'DOCUMENT_DELETED'
  | 'WORKFLOW_APPROVED'
  | 'WORKFLOW_REJECTED'
  | 'DEPT_SETTINGS_SAVED'
  | 'SUPERADMIN_GRANTED'
  | 'SUPERADMIN_REVOKED'
  | 'DEPT_CREATED'
  | 'DEPT_DELETED'
  | 'CHAT_ESCALATED'

export async function auditLog(params: {
  userId: string
  userEmail: string
  action: AuditAction
  targetId?: string
  targetType?: string
  meta?: Prisma.InputJsonValue
  deptId?: string
}) {
  try {
    await prisma.auditLog.create({ data: params })
  } catch {
    // Non-blocking — never fail the main request due to audit logging
  }
}
