import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { AnnouncementsPanel } from '@/components/admin/AnnouncementsPanel'

export default async function AnnouncementsPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const announcements = await prisma.announcement.findMany({
    where: { deptId, active: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Announcements</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Post messages that appear pinned above the chat for all department members.
        </p>
      </div>
      <AnnouncementsPanel initial={announcements} />
    </div>
  )
}
