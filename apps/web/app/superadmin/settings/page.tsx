import { getSmtpSettings } from '@/lib/settings/systemSettings'
import { EmailSettingsPanel } from '@/components/admin/EmailSettingsPanel'

export default async function SuperAdminSettingsPage() {
  const smtp = await getSmtpSettings()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">System Settings</h1>
        <p className="text-[13px] text-text-secondary mt-1">Global configuration for the chatbot platform.</p>
      </div>
      <EmailSettingsPanel
        initial={{
          host:   smtp.host,
          port:   smtp.port,
          secure: smtp.secure,
          user:   smtp.user,
          pass:   smtp.pass ? '••••••••' : '',
          from:   smtp.from,
        }}
      />
    </div>
  )
}
