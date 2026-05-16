import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { SettingsPanel } from '@/components/admin/SettingsPanel'

export default async function SettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId, deletedAt: null },
    select: { deptId: true, role: true },
  })
  if (!user?.deptId) redirect('/chat')

  const dept = await prisma.department.findUnique({
    where: { id: user.deptId },
    select: { id: true, name: true, systemPrompt: true, llmModel: true, embedModel: true },
  })
  if (!dept) redirect('/chat')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Department Settings</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Configure the LLM model, embeddings, and system prompt for {dept.name}.
        </p>
      </div>
      <SettingsPanel dept={dept} />
    </div>
  )
}
