import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/client'
import { FormTemplatesPanel } from '@/components/admin/FormTemplatesPanel'
import type { FormField } from '@/lib/llm/formFiller'

export default async function FormTemplatesPage() {
  const session = await getSession()
  if (!session.isLoggedIn) redirect('/login')
  const deptId = session.deptId
  if (!deptId) redirect('/chat')

  const rawTemplates = await prisma.formTemplate.findMany({
    where: { deptId, active: true },
    orderBy: { createdAt: 'desc' },
  })

  const templates = rawTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    fields: t.fields as FormField[],
    active: t.active,
    createdAt: t.createdAt,
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Form Templates</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Create form templates that users can fill out via the AI chat.
        </p>
      </div>
      <FormTemplatesPanel templates={templates} />
    </div>
  )
}
