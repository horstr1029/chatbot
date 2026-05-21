import { prisma } from '@/lib/db/client'
import { getSession } from '@/lib/auth/session'
import { EmbedChat } from './EmbedChat'

interface Props {
  params: { token: string }
}

export default async function EmbedPage({ params }: Props) {
  const dept = await prisma.department.findUnique({
    where: { widgetToken: params.token },
    select: { id: true, name: true, llmModel: true, widgetTokenExpiresAt: true },
  })

  if (!dept || (dept.widgetTokenExpiresAt && dept.widgetTokenExpiresAt < new Date())) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#9ca3af', fontSize: 13 }}>
        Widget not found or disabled.
      </div>
    )
  }

  const session = await getSession()

  if (!session.isLoggedIn) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12, padding: 24 }}>
        <p style={{ margin: 0, fontSize: 14, color: '#4b5563', textAlign: 'center' }}>
          Sign in to use the {dept.name} assistant.
        </p>
        <a
          href={`${appUrl}/login`}
          target="_blank"
          rel="noreferrer"
          style={{ padding: '8px 20px', background: '#111827', color: '#fff', borderRadius: 6, fontSize: 13, textDecoration: 'none' }}
        >
          Sign in
        </a>
      </div>
    )
  }

  return <EmbedChat deptId={dept.id} deptName={dept.name} />
}
