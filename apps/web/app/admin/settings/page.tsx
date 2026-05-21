import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { SettingsPanel } from '@/components/admin/SettingsPanel'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const dept = await prisma.department.findUnique({
    where: { id: deptId },
    select: { id: true, name: true, systemPrompt: true, llmModel: true, embedModel: true, widgetToken: true, slackWebhookUrl: true, webSearchEnabled: true },
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
