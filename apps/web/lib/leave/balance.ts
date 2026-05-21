import { prisma } from '@/lib/db/client'

export function countWorkdays(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const endDay = new Date(end)
  endDay.setHours(0, 0, 0, 0)
  while (current <= endDay) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

const DEFAULT_LEAVE_TYPES = [
  { type: 'Sick Leave', yearlyAllocation: 30, balance: 30 },
  { type: 'Family Responsibility Leave', yearlyAllocation: 3, balance: 3 },
]

export async function getOrCreateBalance(userId: string, deptId: string) {
  return prisma.leaveBalance.upsert({
    where: { userId_deptId: { userId, deptId } },
    create: { userId, deptId, leaveTypes: DEFAULT_LEAVE_TYPES },
    update: {},
  })
}

export async function accrueIfDue(userId: string, deptId: string): Promise<{ balance: number; accrued: boolean }> {
  const record = await getOrCreateBalance(userId, deptId)

  const now = new Date()
  const last = record.lastAccrualDate

  // First-time init: grant yearly allocation as starting balance
  if (!last) {
    const updated = await prisma.leaveBalance.update({
      where: { id: record.id },
      data: { balance: record.yearlyAllocation, lastAccrualDate: now },
    })
    return { balance: updated.balance, accrued: true }
  }

  const shouldAccrue =
    last.getFullYear() < now.getFullYear() ||
    (last.getFullYear() === now.getFullYear() && last.getMonth() < now.getMonth())

  if (!shouldAccrue) {
    return { balance: record.balance, accrued: false }
  }

  const updated = await prisma.leaveBalance.update({
    where: { id: record.id },
    data: { balance: record.balance + record.monthlyAccrual, lastAccrualDate: now },
  })

  return { balance: updated.balance, accrued: true }
}
