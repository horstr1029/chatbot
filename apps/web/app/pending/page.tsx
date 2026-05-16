import { LogoutButton } from '@/components/auth/LogoutButton'

export default function PendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="bg-white border border-border rounded-lg p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">No Department Assigned</h1>
        <p className="text-[13px] text-text-secondary mb-6">
          Your account exists but has not been assigned to a department yet. Contact your administrator.
        </p>
        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
